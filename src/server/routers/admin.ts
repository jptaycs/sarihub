import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { formatManila, fromManila, now } from "~/lib/datetime";
import { parsePhPhone } from "~/lib/format";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import {
  createStoreInput,
  recordAdjustmentInput,
  recordPaymentInput,
  setOrderStatusInput,
  updateStoreInput,
  upsertProductInput,
  upsertUnitInput,
} from "~/lib/schemas/admin";
import {
  orderItems,
  orders,
  productUnits,
  products,
  routes,
  staff,
  stores,
  sukiLedger,
} from "~/server/db/schema";
import { adminProcedure, router } from "~/server/trpc/init";

/** The Manila-midnight instant for "today" — the delivery day the board shows. */
function todayManilaStart(): Date {
  const dayStr = formatManila(now(), "yyyy-MM-dd");
  return fromManila(new Date(`${dayStr}T00:00:00`));
}

/**
 * Forward-only lifecycle. Each target status names the single status it may
 * come from and the timestamp column it stamps.
 */
const STATUS_TRANSITIONS = {
  packed: { from: "submitted", stamp: "packedAt" },
  in_transit: { from: "packed", stamp: "inTransitAt" },
  delivered: { from: "in_transit", stamp: "deliveredAt" },
} as const;

const ordersAdminRouter = router({
  /**
   * Today's dispatch board: every order riding today's trucks, with per-route
   * load totals against capacity. Load counts non-cancelled lines only, using
   * unit weights where known.
   */
  board: adminProcedure.query(async ({ ctx }) => {
    const dayStart = todayManilaStart();

    const routeRows = await ctx.db
      .select({
        id: routes.id,
        name: routes.name,
        capacityKg: routes.capacityKg,
        departureLocal: routes.departureLocal,
      })
      .from(routes)
      .orderBy(asc(routes.name));

    const orderRows = await ctx.db
      .select({
        id: orders.id,
        routeId: orders.routeId,
        status: orders.status,
        totalCentavos: orders.totalCentavos,
        submittedAt: orders.submittedAt,
        storeName: stores.name,
        ownerName: stores.ownerName,
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(eq(orders.deliverOn, dayStart))
      .orderBy(asc(orders.submittedAt));

    const orderIds = orderRows.map((o) => o.id);
    const itemAgg = orderIds.length
      ? await ctx.db
          .select({
            orderId: orderItems.orderId,
            itemCount: sql<number>`count(*)::int`,
            loadGrams: sql<number>`coalesce(sum(${orderItems.quantity} * coalesce(${productUnits.weightGrams}, 0)), 0)::int`,
            unweighedCount: sql<number>`count(*) filter (where ${productUnits.weightGrams} is null)::int`,
          })
          .from(orderItems)
          .innerJoin(productUnits, eq(productUnits.id, orderItems.productUnitId))
          .where(and(inArray(orderItems.orderId, orderIds), eq(orderItems.cancelledItem, false)))
          .groupBy(orderItems.orderId)
      : [];
    const aggByOrder = new Map(itemAgg.map((a) => [a.orderId, a]));

    const board = orderRows.map((o) => {
      const agg = aggByOrder.get(o.id);
      return {
        ...o,
        itemCount: agg?.itemCount ?? 0,
        loadKg: (agg?.loadGrams ?? 0) / 1000,
        hasUnweighedItems: (agg?.unweighedCount ?? 0) > 0,
      };
    });

    const routesOut = routeRows.map((r) => ({
      ...r,
      loadKg: board
        .filter((o) => o.routeId === r.id && o.status !== "cancelled")
        .reduce((sum, o) => sum + o.loadKg, 0),
    }));

    return { day: dayStart, routes: routesOut, orders: board };
  }),

  /** Push an order one step forward. Backwards moves don't exist. */
  setStatus: adminProcedure.input(setOrderStatusInput).mutation(async ({ ctx, input }) => {
    const at = now();
    const transition = STATUS_TRANSITIONS[input.status];

    return ctx.db.transaction(async (tx) => {
      const rows = await tx.execute<{ status: string }>(
        sql`SELECT status FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
      );
      const order = rows[0];
      const dict = getDictionary(ctx.locale).admin.errors;
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: dict.orderNotFound });
      }
      if (order.status !== transition.from) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: interpolate(dict.badTransition, { from: order.status, to: input.status }),
        });
      }

      await tx
        .update(orders)
        .set({ status: input.status, [transition.stamp]: at })
        .where(eq(orders.id, input.orderId));

      return { orderId: input.orderId, status: input.status };
    });
  }),
});

const catalogAdminRouter = router({
  /** Whole catalog, inactive rows included — this is the management view. */
  list: adminProcedure.query(async ({ ctx }) => {
    const productRows = await ctx.db
      .select()
      .from(products)
      .orderBy(asc(products.category), asc(products.nameTl));
    const unitRows = await ctx.db
      .select()
      .from(productUnits)
      .orderBy(asc(productUnits.sortOrder));

    const unitsByProduct = new Map<string, typeof unitRows>();
    for (const u of unitRows) {
      const list = unitsByProduct.get(u.productId) ?? [];
      list.push(u);
      unitsByProduct.set(u.productId, list);
    }

    return productRows.map((p) => ({ ...p, units: unitsByProduct.get(p.id) ?? [] }));
  }),

  upsertProduct: adminProcedure.input(upsertProductInput).mutation(async ({ ctx, input }) => {
    const { id, ...fields } = input;
    if (id) {
      const [updated] = await ctx.db
        .update(products)
        .set(fields)
        .where(eq(products.id, id))
        .returning({ id: products.id });
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: getDictionary(ctx.locale).admin.errors.productNotFound,
        });
      }
      return { id: updated.id };
    }
    const [created] = await ctx.db.insert(products).values(fields).returning({ id: products.id });
    return { id: created!.id };
  }),

  upsertUnit: adminProcedure.input(upsertUnitInput).mutation(async ({ ctx, input }) => {
    const { id, ...fields } = input;

    const [product] = await ctx.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, fields.productId))
      .limit(1);
    if (!product) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getDictionary(ctx.locale).admin.errors.productNotFound,
      });
    }

    if (id) {
      const [updated] = await ctx.db
        .update(productUnits)
        .set(fields)
        .where(eq(productUnits.id, id))
        .returning({ id: productUnits.id });
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: getDictionary(ctx.locale).admin.errors.unitNotFound,
        });
      }
      return { id: updated.id };
    }
    const [created] = await ctx.db
      .insert(productUnits)
      .values(fields)
      .returning({ id: productUnits.id });
    return { id: created!.id };
  }),
});

const sukiAdminRouter = router({
  /** Every store's tab standing, heaviest utilization first. */
  exposure: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: stores.id,
        name: stores.name,
        ownerName: stores.ownerName,
        phoneE164: stores.phoneE164,
        sukiBalanceCentavos: stores.sukiBalanceCentavos,
        sukiLimitCentavos: stores.sukiLimitCentavos,
        routeName: routes.name,
      })
      .from(stores)
      .leftJoin(routes, eq(routes.id, stores.routeId))
      .orderBy(desc(stores.sukiBalanceCentavos));

    const totalOutstanding = rows.reduce((sum, r) => sum + r.sukiBalanceCentavos, 0n);
    return { totalOutstanding, stores: rows };
  }),

  /** The store's ledger, newest first — the paper trail behind the balance. */
  ledger: adminProcedure
    .input(recordPaymentInput.pick({ storeId: true }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: sukiLedger.id,
          kind: sukiLedger.kind,
          amountCentavos: sukiLedger.amountCentavos,
          reason: sukiLedger.reason,
          orderId: sukiLedger.orderId,
          createdAt: sukiLedger.createdAt,
        })
        .from(sukiLedger)
        .where(eq(sukiLedger.storeId, input.storeId))
        .orderBy(desc(sukiLedger.createdAt))
        .limit(50);
    }),

  /** Cash collected against the tab. Ledger row is negative; trigger updates the balance. */
  recordPayment: adminProcedure.input(recordPaymentInput).mutation(async ({ ctx, input }) => {
    const [store] = await ctx.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, input.storeId))
      .limit(1);
    if (!store) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getDictionary(ctx.locale).admin.errors.storeNotFound,
      });
    }

    await ctx.db.insert(sukiLedger).values({
      storeId: input.storeId,
      kind: "payment",
      amountCentavos: -BigInt(input.amountCentavos),
      reason: input.note?.length ? input.note : getDictionary(ctx.locale).admin.errors.defaultPaymentReason,
    });
    return { ok: true };
  }),

  /** Manual correction with a required reason. Signed; never edits old rows. */
  recordAdjustment: adminProcedure
    .input(recordAdjustmentInput)
    .mutation(async ({ ctx, input }) => {
      const [store] = await ctx.db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.id, input.storeId))
        .limit(1);
      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: getDictionary(ctx.locale).admin.errors.storeNotFound,
        });
      }

      await ctx.db.insert(sukiLedger).values({
        storeId: input.storeId,
        kind: "adjustment",
        amountCentavos: BigInt(input.amountCentavos),
        reason: input.reason,
      });
      return { ok: true };
    }),
});

const storesAdminRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: stores.id,
        name: stores.name,
        ownerName: stores.ownerName,
        phoneE164: stores.phoneE164,
        addressLine: stores.addressLine,
        routeId: stores.routeId,
        routeName: routes.name,
        stopOrder: stores.stopOrder,
        sukiLimitCentavos: stores.sukiLimitCentavos,
        sukiBalanceCentavos: stores.sukiBalanceCentavos,
      })
      .from(stores)
      .leftJoin(routes, eq(routes.id, stores.routeId))
      .orderBy(asc(stores.name));
  }),

  routes: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({ id: routes.id, name: routes.name })
      .from(routes)
      .orderBy(asc(routes.name));
  }),

  /**
   * Register a store. Phone-OTP is the only auth, so the owner must have
   * signed in at least once — their auth user is looked up by phone and bound
   * as the store owner.
   */
  create: adminProcedure.input(createStoreInput).mutation(async ({ ctx, input }) => {
    const dict = getDictionary(ctx.locale).admin.errors;
    const phoneE164 = parsePhPhone(input.phone);
    if (!phoneE164) {
      throw new TRPCError({ code: "BAD_REQUEST", message: dict.invalidPhone });
    }

    // Supabase stores auth.users.phone without the leading "+".
    const authUsers = await ctx.db.execute<{ id: string }>(
      sql`SELECT id FROM auth.users WHERE phone = ${phoneE164.slice(1)} LIMIT 1`,
    );
    const authUser = authUsers[0];
    if (!authUser) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: dict.noAccountForPhone });
    }

    const [existingStaff] = await ctx.db
      .select({ id: staff.id })
      .from(staff)
      .where(eq(staff.userId, authUser.id))
      .limit(1);
    if (existingStaff) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: dict.phoneIsStaff });
    }

    try {
      const [created] = await ctx.db
        .insert(stores)
        .values({
          ownerUserId: authUser.id,
          name: input.name,
          ownerName: input.ownerName,
          phoneE164,
          addressLine: input.addressLine ?? null,
          routeId: input.routeId,
          stopOrder: input.stopOrder,
          sukiLimitCentavos: BigInt(input.sukiLimitCentavos),
        })
        .returning({ id: stores.id });
      return { id: created!.id };
    } catch (error) {
      // 23505: the phone or auth user already owns a store.
      if (error instanceof Error && "code" in error && error.code === "23505") {
        throw new TRPCError({ code: "CONFLICT", message: dict.storeAlreadyExists });
      }
      throw error;
    }
  }),

  update: adminProcedure.input(updateStoreInput).mutation(async ({ ctx, input }) => {
    const { id, sukiLimitCentavos, ...fields } = input;
    const [updated] = await ctx.db
      .update(stores)
      .set({
        ...fields,
        addressLine: fields.addressLine ?? null,
        sukiLimitCentavos: BigInt(sukiLimitCentavos),
      })
      .where(eq(stores.id, id))
      .returning({ id: stores.id });
    if (!updated) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getDictionary(ctx.locale).admin.errors.storeNotFound,
      });
    }
    return { id: updated.id };
  }),
});

export const adminRouter = router({
  orders: ordersAdminRouter,
  catalog: catalogAdminRouter,
  suki: sukiAdminRouter,
  stores: storesAdminRouter,
});

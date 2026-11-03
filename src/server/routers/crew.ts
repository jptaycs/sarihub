import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import { formatManila, fromManila, now } from "~/lib/datetime";
import { getDictionary } from "~/lib/i18n/dictionaries";
import {
  createPosSaleInput,
  packOrderInput,
  posSaleIdInput,
  recordStockMovementInput,
  routeIdInput,
  storeSearchInput,
} from "~/lib/schemas/crew";
import {
  orderItems,
  orders,
  posSaleItems,
  posSales,
  productUnits,
  products,
  routes,
  stores,
} from "~/server/db/schema";
import { advanceOrderStatus } from "~/server/services/orders";
import { createPosSale } from "~/server/services/posSales";
import { loadFromOrders, recordMovement, stockForRouteDay } from "~/server/services/truckStock";
import { crewProcedure, router } from "~/server/trpc/init";

/** Today's Manila day key and its midnight instant — the day the truck is working. */
function today() {
  const dayStr = formatManila(now(), "yyyy-MM-dd");
  return { dayStr, dayStart: fromManila(new Date(`${dayStr}T00:00:00`)) };
}

const SALE_REASON_TO_CODE = {
  route_not_found: "NOT_FOUND",
  unknown_item: "BAD_REQUEST",
  no_price_today: "PRECONDITION_FAILED",
  store_not_found: "NOT_FOUND",
  suki_needs_store: "BAD_REQUEST",
  over_suki_limit: "PRECONDITION_FAILED",
  stale_key: "CONFLICT",
} as const;

export const crewRouter = router({
  /** Today's routes with pack/deliver progress — drives the route picker. */
  routesToday: crewProcedure.query(async ({ ctx }) => {
    const { dayStart } = today();
    const rows = await ctx.db
      .select({
        id: routes.id,
        name: routes.name,
        vehiclePlate: routes.vehiclePlate,
        capacityKg: routes.capacityKg,
        departureLocal: routes.departureLocal,
        orderCount: sql<number>`count(${orders.id}) filter (where ${orders.status} not in ('cancelled','draft'))::int`,
        packedCount: sql<number>`count(${orders.id}) filter (where ${orders.status} in ('packed','in_transit','delivered','settled'))::int`,
        deliveredCount: sql<number>`count(${orders.id}) filter (where ${orders.status} in ('delivered','settled'))::int`,
      })
      .from(routes)
      .leftJoin(orders, and(eq(orders.routeId, routes.id), eq(orders.deliverOn, dayStart)))
      .groupBy(routes.id)
      .orderBy(asc(routes.name));
    return { day: dayStart, routes: rows };
  }),

  /**
   * The depot queue: today's orders on one route that still need packing,
   * plus the ones already packed (shown as done), in stop order. Weight per
   * order feeds the truck-load bar; unweighed units count as 0 kg.
   */
  packQueue: crewProcedure.input(routeIdInput).query(async ({ ctx, input }) => {
    const { dayStart } = today();

    const [route] = await ctx.db
      .select({ capacityKg: routes.capacityKg })
      .from(routes)
      .where(eq(routes.id, input.routeId))
      .limit(1);
    if (!route) {
      throw new TRPCError({ code: "NOT_FOUND", message: getDictionary(ctx.locale).crew.errors.routeNotFound });
    }

    const orderRows = await ctx.db
      .select({
        id: orders.id,
        status: orders.status,
        totalCentavos: orders.totalCentavos,
        storeName: stores.name,
        ownerName: stores.ownerName,
        stopOrder: stores.stopOrder,
      })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .where(
        and(
          eq(orders.routeId, input.routeId),
          eq(orders.deliverOn, dayStart),
          ne(orders.status, "cancelled"),
          ne(orders.status, "draft"),
        ),
      )
      .orderBy(sql`${stores.stopOrder} ASC NULLS LAST`, asc(stores.name));

    const orderIds = orderRows.map((o) => o.id);
    const itemRows = orderIds.length
      ? await ctx.db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            nameTl: products.nameTl,
            unitLabelTl: productUnits.labelTl,
            quantity: orderItems.quantity,
            cancelledItem: orderItems.cancelledItem,
            weightGrams: productUnits.weightGrams,
          })
          .from(orderItems)
          .innerJoin(products, eq(products.id, orderItems.productId))
          .innerJoin(productUnits, eq(productUnits.id, orderItems.productUnitId))
          .where(inArray(orderItems.orderId, orderIds))
          .orderBy(asc(products.nameTl), asc(productUnits.sortOrder), asc(orderItems.id))
      : [];

    const itemsByOrder = new Map<string, typeof itemRows>();
    for (const item of itemRows) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const out = orderRows.map((o) => {
      const items = itemsByOrder.get(o.id) ?? [];
      const loadGrams = items
        .filter((i) => !i.cancelledItem)
        .reduce((sum, i) => sum + i.quantity * (i.weightGrams ?? 0), 0);
      return { ...o, items, loadKg: loadGrams / 1000 };
    });
    const packedKg = out
      .filter((o) => o.status !== "submitted")
      .reduce((sum, o) => sum + o.loadKg, 0);

    return { orders: out, capacityKg: route.capacityKg, packedKg };
  }),

  /** The order is in the truck: submitted → packed (idempotent on a double tap). */
  packOrder: crewProcedure.input(packOrderInput).mutation(async ({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const result = await advanceOrderStatus(tx, input.orderId, "packed", ctx.locale);
      if (!result.ok) {
        const errors = getDictionary(ctx.locale).crew.errors;
        throw new TRPCError({
          code: result.reason === "not_found" ? "NOT_FOUND" : "PRECONDITION_FAILED",
          message: result.reason === "not_found" ? errors.orderNotFound : errors.notPackable,
        });
      }
      return { orderId: input.orderId, status: "packed" as const };
    });
  }),

  /** The truck leaves: every packed order on the route goes out for delivery (SMS fires). */
  depart: crewProcedure.input(routeIdInput).mutation(async ({ ctx, input }) => {
    const { dayStart } = today();
    return ctx.db.transaction(async (tx) => {
      const packed = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.routeId, input.routeId),
            eq(orders.deliverOn, dayStart),
            eq(orders.status, "packed"),
          ),
        )
        .orderBy(asc(orders.id));
      let moved = 0;
      for (const o of packed) {
        const result = await advanceOrderStatus(tx, o.id, "in_transit", ctx.locale);
        if (result.ok && !result.alreadyThere) moved += 1;
      }
      return { moved };
    });
  }),

  /** Truck stock for today on one route, plus the day's cash summary. */
  stock: crewProcedure.input(routeIdInput).query(async ({ ctx, input }) => {
    const { dayStr } = today();
    const [rows, [summary]] = await Promise.all([
      stockForRouteDay(ctx.db, input.routeId, dayStr),
      ctx.db
        .select({
          cashTodayCentavos: sql<bigint>`coalesce(sum(${posSales.totalCentavos}) filter (where ${posSales.payment} = 'cash'), 0)::bigint`,
          salesToday: sql<number>`count(*)::int`,
        })
        .from(posSales)
        .where(and(eq(posSales.routeId, input.routeId), eq(posSales.soldOn, dayStr))),
    ]);
    return {
      day: dayStr,
      rows,
      cashTodayCentavos: BigInt(summary?.cashTodayCentavos ?? 0),
      salesToday: summary?.salesToday ?? 0,
    };
  }),

  loadFromOrders: crewProcedure.input(routeIdInput).mutation(async ({ ctx, input }) => {
    const { dayStr } = today();
    return loadFromOrders(ctx.db, ctx.staff.userId, input.routeId, dayStr);
  }),

  recordMovement: crewProcedure.input(recordStockMovementInput).mutation(async ({ ctx, input }) => {
    const { dayStr } = today();
    const result = await recordMovement(ctx.db, ctx.staff.userId, dayStr, input, ctx.locale);
    if (!result.ok) {
      throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
    }
    return result;
  }),

  /** Ring up a walk-up sale. */
  sell: crewProcedure.input(createPosSaleInput).mutation(async ({ ctx, input }) => {
    const result = await createPosSale(ctx.db, ctx.staff.userId, input, ctx.locale);
    if (!result.ok) {
      throw new TRPCError({ code: SALE_REASON_TO_CODE[result.reason], message: result.message });
    }
    return result;
  }),

  /** Today's sales on this route, newest first. */
  salesToday: crewProcedure.input(routeIdInput).query(async ({ ctx, input }) => {
    const { dayStr } = today();
    return ctx.db
      .select({
        id: posSales.id,
        totalCentavos: posSales.totalCentavos,
        payment: posSales.payment,
        storeName: stores.name,
        customerName: posSales.customerName,
        createdAt: posSales.createdAt,
        itemCount: sql<number>`(select count(*) from ${posSaleItems} where ${posSaleItems.saleId} = ${posSales.id})::int`,
      })
      .from(posSales)
      .leftJoin(stores, eq(stores.id, posSales.storeId))
      .where(and(eq(posSales.routeId, input.routeId), eq(posSales.soldOn, dayStr)))
      .orderBy(desc(posSales.createdAt))
      .limit(100);
  }),

  /** One sale with its locked lines — the receipt sheet. */
  sale: crewProcedure.input(posSaleIdInput).query(async ({ ctx, input }) => {
    const [sale] = await ctx.db
      .select({
        id: posSales.id,
        totalCentavos: posSales.totalCentavos,
        payment: posSales.payment,
        storeName: stores.name,
        ownerName: stores.ownerName,
        customerName: posSales.customerName,
        createdAt: posSales.createdAt,
      })
      .from(posSales)
      .leftJoin(stores, eq(stores.id, posSales.storeId))
      .where(eq(posSales.id, input.saleId))
      .limit(1);
    if (!sale) {
      throw new TRPCError({ code: "NOT_FOUND", message: getDictionary(ctx.locale).crew.errors.unknownItem });
    }
    const items = await ctx.db
      .select({
        id: posSaleItems.id,
        nameTl: products.nameTl,
        unitLabelTl: productUnits.labelTl,
        quantity: posSaleItems.quantity,
        lockedUnitPriceCentavos: posSaleItems.lockedUnitPriceCentavos,
        lockedTotalCentavos: posSaleItems.lockedTotalCentavos,
      })
      .from(posSaleItems)
      .innerJoin(products, eq(products.id, posSaleItems.productId))
      .innerJoin(productUnits, eq(productUnits.id, posSaleItems.productUnitId))
      .where(eq(posSaleItems.saleId, input.saleId))
      .orderBy(asc(products.nameTl));
    return { ...sale, items };
  }),

  /** Customer picker: any registered store, this truck's own route first. */
  storeSearch: crewProcedure.input(storeSearchInput).query(async ({ ctx, input }) => {
    const needle = `%${input.q}%`;
    return ctx.db
      .select({
        id: stores.id,
        name: stores.name,
        ownerName: stores.ownerName,
        phoneE164: stores.phoneE164,
        routeId: stores.routeId,
        sukiLimitCentavos: stores.sukiLimitCentavos,
        sukiBalanceCentavos: stores.sukiBalanceCentavos,
      })
      .from(stores)
      .where(
        input.q.length
          ? or(
              ilike(stores.name, needle),
              ilike(stores.ownerName, needle),
              ilike(stores.phoneE164, needle),
            )
          : undefined,
      )
      .orderBy(sql`(${stores.routeId} = ${input.routeId}) DESC NULLS LAST`, asc(stores.name))
      .limit(8);
  }),
});

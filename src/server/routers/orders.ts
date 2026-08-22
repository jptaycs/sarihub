import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { now } from "~/lib/datetime";
import { cutoffInstant } from "~/lib/deliverySchedule";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { placeOrderInput } from "~/lib/schemas/order";
import { orderItems, orders, productUnits, products, routes, stores } from "~/server/db/schema";
import { cancelOrder, placeOrder } from "~/server/services/orders";
import { protectedProcedure, router } from "~/server/trpc/init";

const REASON_TO_CODE = {
  no_store: "PRECONDITION_FAILED",
  no_route: "PRECONDITION_FAILED",
  unknown_item: "BAD_REQUEST",
  no_price_today: "PRECONDITION_FAILED",
  out_of_stock: "PRECONDITION_FAILED",
  over_suki_limit: "PRECONDITION_FAILED",
} as const;

const CANCEL_REASON_TO_CODE = {
  not_found: "NOT_FOUND",
  not_cancellable: "PRECONDITION_FAILED",
  past_cutoff: "PRECONDITION_FAILED",
} as const;

export const ordersRouter = router({
  place: protectedProcedure.input(placeOrderInput).mutation(async ({ ctx, input }) => {
    const result = await placeOrder(ctx.db, ctx.user.id, input, ctx.locale);
    if (!result.ok) {
      throw new TRPCError({ code: REASON_TO_CODE[result.reason], message: result.message });
    }
    return result;
  }),

  /**
   * The store's orders, newest first, items inlined, paginated so an active
   * store (one order a night) doesn't lose access to its own history after
   * ~3 weeks — `cursor` is an offset into that same newest-first ordering.
   */
  list: protectedProcedure
    .input(z.object({ cursor: z.number().int().min(0).optional() }))
    .query(async ({ ctx, input }) => {
      const PAGE_SIZE = 20;
      const offset = input.cursor ?? 0;

      const [store] = await ctx.db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.ownerUserId, ctx.user.id))
        .limit(1);
      if (!store) return { orders: [], nextCursor: undefined };

      // One extra row, unreturned, just to know whether another page exists.
      const page = await ctx.db
        .select({
          id: orders.id,
          status: orders.status,
          totalCentavos: orders.totalCentavos,
          deliverOn: orders.deliverOn,
          submittedAt: orders.submittedAt,
          cancelledReason: orders.cancelledReason,
        })
        .from(orders)
        .where(eq(orders.storeId, store.id))
        .orderBy(desc(orders.createdAt))
        .limit(PAGE_SIZE + 1)
        .offset(offset);
      const hasMore = page.length > PAGE_SIZE;
      const orderRows = hasMore ? page.slice(0, PAGE_SIZE) : page;
      if (orderRows.length === 0) return { orders: [], nextCursor: undefined };

      const itemRows = await ctx.db
        .select({
          orderId: orderItems.orderId,
          nameTl: products.nameTl,
          unitLabelTl: productUnits.labelTl,
          quantity: orderItems.quantity,
          lockedTotalCentavos: orderItems.lockedTotalCentavos,
          cancelledItem: orderItems.cancelledItem,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .innerJoin(productUnits, eq(productUnits.id, orderItems.productUnitId))
        .where(
          inArray(
            orderItems.orderId,
            orderRows.map((o) => o.id),
          ),
        );

      const itemsByOrder = new Map<string, typeof itemRows>();
      for (const item of itemRows) {
        const list = itemsByOrder.get(item.orderId) ?? [];
        list.push(item);
        itemsByOrder.set(item.orderId, list);
      }

      return {
        orders: orderRows.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] })),
        nextCursor: hasMore ? offset + PAGE_SIZE : undefined,
      };
    }),

  /**
   * One order in full: locked line items, lifecycle timestamps for the status
   * timeline, and whether the owner can still cancel (submitted + before the
   * route cutoff on the delivery day).
   */
  get: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [store] = await ctx.db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.ownerUserId, ctx.user.id))
        .limit(1);
      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: getDictionary(ctx.locale).orders.errors.notFound,
        });
      }

      const [order] = await ctx.db
        .select({
          id: orders.id,
          status: orders.status,
          subtotalCentavos: orders.subtotalCentavos,
          totalCentavos: orders.totalCentavos,
          deliverOn: orders.deliverOn,
          submittedAt: orders.submittedAt,
          packedAt: orders.packedAt,
          inTransitAt: orders.inTransitAt,
          deliveredAt: orders.deliveredAt,
          settledAt: orders.settledAt,
          cancelledAt: orders.cancelledAt,
          cancelledReason: orders.cancelledReason,
          routeCutoffLocal: routes.cutoffLocal,
        })
        .from(orders)
        .innerJoin(routes, eq(routes.id, orders.routeId))
        .where(and(eq(orders.id, input.orderId), eq(orders.storeId, store.id)))
        .limit(1);
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: getDictionary(ctx.locale).orders.errors.notFound,
        });
      }

      const items = await ctx.db
        .select({
          id: orderItems.id,
          nameTl: products.nameTl,
          nameEn: products.nameEn,
          unitLabelTl: productUnits.labelTl,
          quantity: orderItems.quantity,
          lockedUnitPriceCentavos: orderItems.lockedUnitPriceCentavos,
          lockedTotalCentavos: orderItems.lockedTotalCentavos,
          cancelledItem: orderItems.cancelledItem,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .innerJoin(productUnits, eq(productUnits.id, orderItems.productUnitId))
        .where(eq(orderItems.orderId, input.orderId));

      const cancelUntil = cutoffInstant(order.routeCutoffLocal, order.deliverOn);
      const cancellable = order.status === "submitted" && now() < cancelUntil;

      return { ...order, items, cancellable, cancelUntil };
    }),

  /** Owner cancels a still-submitted order before the route cutoff. */
  cancel: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cancelOrder(ctx.db, ctx.user.id, input.orderId, ctx.locale);
      if (!result.ok) {
        throw new TRPCError({ code: CANCEL_REASON_TO_CODE[result.reason], message: result.message });
      }
      return result;
    }),
});

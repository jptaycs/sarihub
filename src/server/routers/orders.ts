import "server-only";

import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";

import { placeOrderInput } from "~/lib/schemas/order";
import { orderItems, orders, productUnits, products, stores } from "~/server/db/schema";
import { placeOrder } from "~/server/services/orders";
import { protectedProcedure, router } from "~/server/trpc/init";

const REASON_TO_CODE = {
  no_store: "PRECONDITION_FAILED",
  no_route: "PRECONDITION_FAILED",
  unknown_item: "BAD_REQUEST",
  no_price_today: "PRECONDITION_FAILED",
  over_suki_limit: "PRECONDITION_FAILED",
} as const;

export const ordersRouter = router({
  place: protectedProcedure.input(placeOrderInput).mutation(async ({ ctx, input }) => {
    const result = await placeOrder(ctx.db, ctx.user.id, input);
    if (!result.ok) {
      throw new TRPCError({ code: REASON_TO_CODE[result.reason], message: result.message });
    }
    return result;
  }),

  /** The store's recent orders, newest first, items inlined. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const [store] = await ctx.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.ownerUserId, ctx.user.id))
      .limit(1);
    if (!store) return [];

    const orderRows = await ctx.db
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
      .limit(20);
    if (orderRows.length === 0) return [];

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

    return orderRows.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
  }),
});

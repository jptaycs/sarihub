import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { formatManila, fromManila, now } from "~/lib/datetime";
import { markDeliveredInput } from "~/lib/schemas/driver";
import { orderItems, orders, productUnits, products, routes, stores } from "~/server/db/schema";
import { driverProcedure, router } from "~/server/trpc/init";

/** The Manila-midnight instant for "today" — the delivery day being driven. */
function todayManilaStart(): Date {
  const dayStr = formatManila(now(), "yyyy-MM-dd");
  return fromManila(new Date(`${dayStr}T00:00:00`));
}

export const driverRouter = router({
  /** Today's routes with how much of the run is done — the route picker. */
  routesToday: driverProcedure.query(async ({ ctx }) => {
    const dayStart = todayManilaStart();

    const rows = await ctx.db
      .select({
        id: routes.id,
        name: routes.name,
        departureLocal: routes.departureLocal,
        vehiclePlate: routes.vehiclePlate,
        stopCount: sql<number>`count(${orders.id}) filter (where ${orders.status} <> 'cancelled')::int`,
        deliveredCount: sql<number>`count(${orders.id}) filter (where ${orders.status} in ('delivered','settled'))::int`,
      })
      .from(routes)
      .leftJoin(orders, and(eq(orders.routeId, routes.id), eq(orders.deliverOn, dayStart)))
      .groupBy(routes.id)
      .orderBy(asc(routes.name));

    return { day: dayStart, routes: rows };
  }),

  /** The ordered stop list for one route, today. One store = one stop. */
  stops: driverProcedure
    .input(z.object({ routeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const dayStart = todayManilaStart();

      const orderRows = await ctx.db
        .select({
          id: orders.id,
          status: orders.status,
          totalCentavos: orders.totalCentavos,
          podPhotoPath: orders.podPhotoPath,
          podSignaturePath: orders.podSignaturePath,
          storeName: stores.name,
          ownerName: stores.ownerName,
          phoneE164: stores.phoneE164,
          addressLine: stores.addressLine,
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
              orderId: orderItems.orderId,
              nameTl: products.nameTl,
              unitLabelTl: productUnits.labelTl,
              quantity: orderItems.quantity,
              cancelledItem: orderItems.cancelledItem,
            })
            .from(orderItems)
            .innerJoin(products, eq(products.id, orderItems.productId))
            .innerJoin(productUnits, eq(productUnits.id, orderItems.productUnitId))
            .where(inArray(orderItems.orderId, orderIds))
        : [];

      const itemsByOrder = new Map<string, typeof itemRows>();
      for (const item of itemRows) {
        const list = itemsByOrder.get(item.orderId) ?? [];
        list.push(item);
        itemsByOrder.set(item.orderId, list);
      }

      return orderRows.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] }));
    }),

  /**
   * The big green button. Any live pre-delivery status may complete — if the
   * office forgot to click "packed", the goods still got handed over. POD
   * paths are attached when the uploads made it through the 4G.
   */
  markDelivered: driverProcedure.input(markDeliveredInput).mutation(async ({ ctx, input }) => {
    const at = now();

    return ctx.db.transaction(async (tx) => {
      const rows = await tx.execute<{ status: string }>(
        sql`SELECT status FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
      );
      const order = rows[0];
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hindi mahanap ang order." });
      }
      if (order.status === "delivered" || order.status === "settled") {
        // Double-tap on a bumpy road — the delivery already counted.
        return { orderId: input.orderId, alreadyDelivered: true };
      }
      if (order.status === "cancelled" || order.status === "draft") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Hindi na deliverable ang order na ito.",
        });
      }

      await tx
        .update(orders)
        .set({
          status: "delivered",
          deliveredAt: at,
          podPhotoPath: input.podPhotoPath ?? null,
          podSignaturePath: input.podSignaturePath ?? null,
        })
        .where(eq(orders.id, input.orderId));

      return { orderId: input.orderId, alreadyDelivered: false };
    });
  }),
});

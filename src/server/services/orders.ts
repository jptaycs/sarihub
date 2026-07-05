import "server-only";

import { and, desc, eq, inArray, lte, gt, sql } from "drizzle-orm";

import { db as defaultDb } from "~/server/db";
import {
  dailyPrices,
  orderItems,
  orders,
  productUnits,
  products,
  routes,
  stores,
  sukiLedger,
} from "~/server/db/schema";
import { now } from "~/lib/datetime";
import { nextDeliveryDate } from "~/lib/deliverySchedule";
import type { PlaceOrderInput } from "~/lib/schemas/order";

type Db = typeof defaultDb;

export type PlacedOrderSummary = {
  orderId: string;
  deliverOn: Date;
  totalCentavos: bigint;
  items: Array<{
    productUnitId: string;
    nameTl: string;
    unitLabelTl: string;
    quantity: number;
    lockedUnitPriceCentavos: bigint;
    lockedTotalCentavos: bigint;
  }>;
};

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrderSummary; alreadyPlaced: boolean }
  | {
      ok: false;
      reason: "no_store" | "no_route" | "unknown_item" | "no_price_today" | "over_suki_limit";
      message: string;
      /** For over_suki_limit: how much tab room is left, so the UI can say it. */
      availableCentavos?: bigint;
    };

/**
 * Place an order for the store owned by `userId`.
 *
 * The wedge lives here: unit prices are locked from the daily_prices row valid
 * at submission time, and the suki charge is written to the append-only ledger
 * in the same transaction. The stores.suki_balance_centavos denormalization is
 * maintained by a DB trigger — never written from the app.
 */
export async function placeOrder(
  db: Db,
  userId: string,
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const submittedAt = now();

  const [store] = await db.select().from(stores).where(eq(stores.ownerUserId, userId)).limit(1);
  if (!store) {
    return {
      ok: false,
      reason: "no_store",
      message: "Wala pang tindahan na naka-rehistro sa account na ito. Tawagan po kami.",
    };
  }
  if (!store.routeId) {
    return {
      ok: false,
      reason: "no_route",
      message: "Wala pang ruta ang tindahan ninyo. Tawagan po kami para ma-ayos.",
    };
  }

  const [route] = await db.select().from(routes).where(eq(routes.id, store.routeId)).limit(1);
  if (!route) {
    return { ok: false, reason: "no_route", message: "Hindi mahanap ang ruta. Tawagan po kami." };
  }

  // Same unit tapped twice collapses into one line.
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.productUnitId, (quantities.get(item.productUnitId) ?? 0) + item.quantity);
  }
  const unitIds = [...quantities.keys()];

  const unitRows = await db
    .select({
      unitId: productUnits.id,
      productId: products.id,
      nameTl: products.nameTl,
      unitLabelTl: productUnits.labelTl,
    })
    .from(productUnits)
    .innerJoin(products, eq(products.id, productUnits.productId))
    .where(
      and(
        inArray(productUnits.id, unitIds),
        eq(productUnits.isActive, true),
        eq(products.isActive, true),
      ),
    );
  if (unitRows.length !== unitIds.length) {
    return {
      ok: false,
      reason: "unknown_item",
      message: "May item sa order na wala na sa listahan. I-refresh po ang app.",
    };
  }

  // Live price per unit at submission time. This row is what gets locked.
  const priceRows = await db
    .selectDistinctOn([dailyPrices.productUnitId], {
      productUnitId: dailyPrices.productUnitId,
      priceCentavos: dailyPrices.priceCentavos,
    })
    .from(dailyPrices)
    .where(
      and(
        inArray(dailyPrices.productUnitId, unitIds),
        lte(dailyPrices.capturedAt, submittedAt),
        gt(dailyPrices.validUntil, submittedAt),
      ),
    )
    .orderBy(dailyPrices.productUnitId, desc(dailyPrices.capturedAt));
  const priceByUnit = new Map(priceRows.map((r) => [r.productUnitId, r.priceCentavos]));

  const unpriced = unitRows.filter((u) => !priceByUnit.has(u.unitId));
  if (unpriced.length > 0) {
    const names = unpriced.map((u) => `${u.nameTl} (${u.unitLabelTl})`).join(", ");
    return {
      ok: false,
      reason: "no_price_today",
      message: `Walang presyo ngayon para sa: ${names}. Alisin muna po sa order.`,
    };
  }

  const lines = unitRows.map((u) => {
    const quantity = quantities.get(u.unitId)!;
    const unitPrice = priceByUnit.get(u.unitId)!;
    return {
      ...u,
      quantity,
      lockedUnitPriceCentavos: unitPrice,
      lockedTotalCentavos: unitPrice * BigInt(quantity),
    };
  });
  const totalCentavos = lines.reduce((sum, l) => sum + l.lockedTotalCentavos, 0n);
  const deliverOn = nextDeliveryDate(route, submittedAt);

  return db.transaction(async (tx) => {
    // Retried submit with the same key returns the original order untouched.
    const [existing] = await tx
      .select({ id: orders.id, deliverOn: orders.deliverOn, totalCentavos: orders.totalCentavos })
      .from(orders)
      .where(eq(orders.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      return {
        ok: true as const,
        alreadyPlaced: true,
        order: {
          orderId: existing.id,
          deliverOn: existing.deliverOn,
          totalCentavos: existing.totalCentavos,
          items: [],
        },
      };
    }

    // Lock the store row so concurrent submits can't both pass the suki check.
    const [locked] = await tx
      .execute<{ suki_balance_centavos: string; suki_limit_centavos: string }>(
        sql`SELECT suki_balance_centavos, suki_limit_centavos FROM stores WHERE id = ${store.id} FOR UPDATE`,
      );
    const balance = BigInt(locked!.suki_balance_centavos);
    const limit = BigInt(locked!.suki_limit_centavos);
    const available = limit - balance;
    if (totalCentavos > available) {
      return {
        ok: false as const,
        reason: "over_suki_limit" as const,
        message: "Lampas na po sa suki limit ninyo ang order na ito.",
        availableCentavos: available > 0n ? available : 0n,
      };
    }

    const [order] = await tx
      .insert(orders)
      .values({
        storeId: store.id,
        routeId: route.id,
        status: "submitted",
        idempotencyKey: input.idempotencyKey,
        subtotalCentavos: totalCentavos,
        totalCentavos,
        deliverOn,
        submittedAt,
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order!.id,
        productId: l.productId,
        productUnitId: l.unitId,
        quantity: l.quantity,
        lockedUnitPriceCentavos: l.lockedUnitPriceCentavos,
        lockedTotalCentavos: l.lockedTotalCentavos,
      })),
    );

    // The tab charge. The trigger on suki_ledger refreshes the store balance.
    await tx.insert(sukiLedger).values({
      storeId: store.id,
      kind: "charge",
      amountCentavos: totalCentavos,
      orderId: order!.id,
      reason: "Order",
    });

    return {
      ok: true as const,
      alreadyPlaced: false,
      order: {
        orderId: order!.id,
        deliverOn,
        totalCentavos,
        items: lines.map((l) => ({
          productUnitId: l.unitId,
          nameTl: l.nameTl,
          unitLabelTl: l.unitLabelTl,
          quantity: l.quantity,
          lockedUnitPriceCentavos: l.lockedUnitPriceCentavos,
          lockedTotalCentavos: l.lockedTotalCentavos,
        })),
      },
    };
  });
}

import "server-only";

import { and, desc, eq, inArray, lte, gt, sql } from "drizzle-orm";

import { db as defaultDb } from "~/server/db";
import {
  dailyPrices,
  notificationQueue,
  orderItems,
  orders,
  productUnits,
  products,
  routes,
  stores,
  sukiLedger,
  unitStockouts,
} from "~/server/db/schema";
import { formatManila, now } from "~/lib/datetime";
import { cutoffInstant, nextDeliveryDate } from "~/lib/deliverySchedule";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { interpolate } from "~/lib/i18n/interpolate";
import { DEFAULT_LOCALE, type Locale } from "~/lib/i18n/locale";
import type { PlaceOrderInput } from "~/lib/schemas/order";
import { notificationMessage } from "./notificationMessage";
import { enqueueNotification } from "./notifications";

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
      reason:
        | "no_store"
        | "no_route"
        | "unknown_item"
        | "no_price_today"
        | "out_of_stock"
        | "over_suki_limit";
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
  locale: Locale = DEFAULT_LOCALE,
): Promise<PlaceOrderResult> {
  const dict = getDictionary(locale).orders.errors;
  const submittedAt = now();

  const [store] = await db.select().from(stores).where(eq(stores.ownerUserId, userId)).limit(1);
  if (!store) {
    return { ok: false, reason: "no_store", message: dict.noStore };
  }
  if (!store.routeId) {
    return { ok: false, reason: "no_route", message: dict.noRoute };
  }

  const [route] = await db.select().from(routes).where(eq(routes.id, store.routeId)).limit(1);
  if (!route) {
    return { ok: false, reason: "no_route", message: dict.noRouteFound };
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
    return { ok: false, reason: "unknown_item", message: dict.unknownItem };
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
      message: interpolate(dict.noPriceToday, { names }),
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

  // A unit the buyer couldn't source can't ride the truck this order targets.
  const stockoutRows = await db
    .select({ productUnitId: unitStockouts.productUnitId })
    .from(unitStockouts)
    .where(
      and(
        inArray(unitStockouts.productUnitId, unitIds),
        eq(unitStockouts.stockoutOn, formatManila(deliverOn, "yyyy-MM-dd")),
      ),
    );
  if (stockoutRows.length > 0) {
    const stockedOut = new Set(stockoutRows.map((r) => r.productUnitId));
    const names = unitRows
      .filter((u) => stockedOut.has(u.unitId))
      .map((u) => `${u.nameTl} (${u.unitLabelTl})`)
      .join(", ");
    return {
      ok: false,
      reason: "out_of_stock",
      message: interpolate(dict.outOfStock, { names }),
    };
  }

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
        message: dict.overSukiLimit,
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

    await enqueueNotification(
      tx,
      order!.id,
      "confirmed",
      store.phoneE164,
      notificationMessage(getDictionary(locale), "confirmed", store.name),
    );

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

export type CancelOrderResult =
  | { ok: true; orderId: string; reversedCentavos: bigint }
  | {
      ok: false;
      reason: "not_found" | "not_cancellable" | "past_cutoff";
      message: string;
    };

/**
 * Cancel an order the owner just placed. Only allowed while the order is still
 * `submitted` and strictly before the route cutoff on its delivery day — after
 * that the goods are being bought at the palengke. The suki charge is reversed
 * with an adjustment ledger row (never by deleting the charge) in the same
 * transaction; the DB trigger refreshes the store balance.
 */
export async function cancelOrder(
  db: Db,
  userId: string,
  orderId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<CancelOrderResult> {
  const dict = getDictionary(locale).orders.errors;
  const at = now();

  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.ownerUserId, userId))
    .limit(1);
  if (!store) {
    return { ok: false, reason: "not_found", message: dict.notFound };
  }

  return db.transaction(async (tx) => {
    // Lock the order row so a concurrent pack/cancel can't race this check.
    // deliver_on comes back as raw text, not a Date: drizzle disables postgres-js's
    // timestamptz parser on the shared client for its own column-mapping logic, which
    // doesn't apply to this raw query. Parse it explicitly.
    const rows = await tx.execute<{
      status: string;
      total_centavos: string;
      deliver_on: string;
      cutoff_local: string;
    }>(
      sql`SELECT o.status, o.total_centavos, o.deliver_on, r.cutoff_local
          FROM orders o
          JOIN routes r ON r.id = o.route_id
          WHERE o.id = ${orderId} AND o.store_id = ${store.id}
          FOR UPDATE OF o`,
    );
    const order = rows[0] && { ...rows[0], deliver_on: new Date(rows[0].deliver_on) };
    if (!order) {
      return { ok: false as const, reason: "not_found" as const, message: dict.notFound };
    }
    if (order.status === "cancelled") {
      return {
        ok: false as const,
        reason: "not_cancellable" as const,
        message: dict.alreadyCancelled,
      };
    }
    if (order.status !== "submitted") {
      return {
        ok: false as const,
        reason: "not_cancellable" as const,
        message: dict.notCancellable,
      };
    }
    if (at >= cutoffInstant(order.cutoff_local, order.deliver_on)) {
      return { ok: false as const, reason: "past_cutoff" as const, message: dict.pastCutoff };
    }

    const totalCentavos = BigInt(order.total_centavos);

    await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: at,
        cancelledReason: dict.cancelledReasonText,
      })
      .where(eq(orders.id, orderId));

    // A cancelled order should never send its already-queued "confirmed" SMS —
    // delete it if the cron hasn't picked it up yet. Deleting (not marking
    // failed/cancelled) keeps the (order_id, kind) unique constraint from
    // blocking a legitimate re-notification if this order is ever reinstated.
    await tx
      .delete(notificationQueue)
      .where(and(eq(notificationQueue.orderId, orderId), eq(notificationQueue.status, "pending")));

    // Reverse the tab charge. The ledger stays append-only.
    await tx.insert(sukiLedger).values({
      storeId: store.id,
      kind: "adjustment",
      amountCentavos: -totalCentavos,
      orderId,
      reason: dict.cancelAdjustmentReason,
    });

    return { ok: true as const, orderId, reversedCentavos: totalCentavos };
  });
}

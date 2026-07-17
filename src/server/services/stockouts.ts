import "server-only";

import { eq, inArray, sql } from "drizzle-orm";

import { formatManila, fromManila, now } from "~/lib/datetime";
import { db as defaultDb } from "~/server/db";
import {
  orderItems,
  orders,
  productUnits,
  products,
  sukiLedger,
  unitStockouts,
} from "~/server/db/schema";

type Db = typeof defaultDb;

export type MarkOutOfStockResult =
  | { ok: true; alreadyMarked: boolean; affectedOrders: number }
  | { ok: false; reason: "unknown_unit"; message: string };

/**
 * Buyer marks a unit as unsourceable for today's Manila delivery day.
 *
 * Cascade, all in one transaction: today's submitted orders that carry the
 * unit get the line flagged `cancelled_item`, their totals recomputed from the
 * surviving locked lines, and the difference handed back on the suki tab as an
 * adjustment ledger row. Nothing is deleted and locked prices never change —
 * the bill just stops counting the line.
 */
export async function markUnitOutOfStock(
  db: Db,
  buyerUserId: string,
  productUnitId: string,
): Promise<MarkOutOfStockResult> {
  const at = now();
  const dayStr = formatManila(at, "yyyy-MM-dd");
  // The orders affected are the ones riding today's truck.
  const dayStart = fromManila(new Date(`${dayStr}T00:00:00`));

  const [unit] = await db
    .select({ nameTl: products.nameTl, labelTl: productUnits.labelTl })
    .from(productUnits)
    .innerJoin(products, eq(products.id, productUnits.productId))
    .where(eq(productUnits.id, productUnitId))
    .limit(1);
  if (!unit) {
    return { ok: false, reason: "unknown_unit", message: "Hindi po mahanap ang item na iyan." };
  }

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(unitStockouts)
      .values({ productUnitId, stockoutOn: dayStr, markedBy: buyerUserId })
      .onConflictDoNothing()
      .returning({ id: unitStockouts.id });
    if (inserted.length === 0) {
      // Already marked today; the cascade already ran. Don't run it twice.
      return { ok: true as const, alreadyMarked: true, affectedOrders: 0 };
    }

    // Lock the affected item + order rows so packing can't race the recompute.
    const affected = await tx.execute<{
      item_id: string;
      order_id: string;
      store_id: string;
      locked_total_centavos: string;
    }>(
      sql`SELECT oi.id AS item_id, o.id AS order_id, o.store_id, oi.locked_total_centavos
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_unit_id = ${productUnitId}
            AND oi.cancelled_item = false
            AND o.status = 'submitted'
            AND o.deliver_on = ${dayStart.toISOString()}
          FOR UPDATE OF oi, o`,
    );
    if (affected.length === 0) {
      return { ok: true as const, alreadyMarked: false, affectedOrders: 0 };
    }

    const byOrder = new Map<string, { storeId: string; deltaCentavos: bigint }>();
    for (const row of affected) {
      const entry = byOrder.get(row.order_id) ?? { storeId: row.store_id, deltaCentavos: 0n };
      entry.deltaCentavos += BigInt(row.locked_total_centavos);
      byOrder.set(row.order_id, entry);
    }

    await tx
      .update(orderItems)
      .set({ cancelledItem: true })
      .where(
        inArray(
          orderItems.id,
          affected.map((r) => r.item_id),
        ),
      );

    for (const [orderId, { storeId, deltaCentavos }] of byOrder) {
      await tx
        .update(orders)
        .set({
          subtotalCentavos: sql`${orders.subtotalCentavos} - ${deltaCentavos}`,
          totalCentavos: sql`${orders.totalCentavos} - ${deltaCentavos}`,
        })
        .where(eq(orders.id, orderId));
      // Hand the difference back on the tab. Trigger refreshes the balance.
      await tx.insert(sukiLedger).values({
        storeId,
        kind: "adjustment",
        amountCentavos: -deltaCentavos,
        orderId,
        reason: `Naubos: ${unit.nameTl} (${unit.labelTl})`,
      });
    }

    return { ok: true as const, alreadyMarked: false, affectedOrders: byOrder.size };
  });
}

/** Stocked-out unit ids for one Manila day ("yyyy-MM-dd"). */
export async function stockoutsForDay(db: Db, dayStr: string): Promise<Set<string>> {
  const rows = await db
    .select({ productUnitId: unitStockouts.productUnitId })
    .from(unitStockouts)
    .where(eq(unitStockouts.stockoutOn, dayStr));
  return new Set(rows.map((r) => r.productUnitId));
}

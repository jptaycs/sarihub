// Deliberately no "import server-only" here — pure arithmetic with no DB
// access, kept directly unit-testable (same reason as pricing.ts).

import type { TruckStockKind } from "~/server/db/schema/pos";

/** Everything that moved one unit on or off one truck for one day. */
export type UnitTally = {
  loaded: number;
  added: number;
  reduced: number;
  sold: number;
  /** Delivered order lines — derived from `orders`, never from movements. */
  delivered: number;
};

export type MovementTally = Omit<UnitTally, "delivered">;

/** What's left on the truck right now. Negative means something left that was never loaded. */
export function onHand(t: UnitTally): number {
  return t.loaded + t.added - t.reduced - t.sold - t.delivered;
}

/** How much more must go on board to cover today's orders. Never negative. */
export function loadShortfall(needed: number, loadedSoFar: number): number {
  return Math.max(0, needed - loadedSoFar);
}

/** Sum movement rows per unit into the four on/off buckets. */
export function tallyMovements(
  rows: Array<{ productUnitId: string; kind: TruckStockKind; quantity: number }>,
): Map<string, MovementTally> {
  const out = new Map<string, MovementTally>();
  for (const row of rows) {
    const t = out.get(row.productUnitId) ?? { loaded: 0, added: 0, reduced: 0, sold: 0 };
    switch (row.kind) {
      case "load":
        t.loaded += row.quantity;
        break;
      case "add":
        t.added += row.quantity;
        break;
      case "reduce":
        t.reduced += row.quantity;
        break;
      case "sale":
        t.sold += row.quantity;
        break;
    }
    out.set(row.productUnitId, t);
  }
  return out;
}

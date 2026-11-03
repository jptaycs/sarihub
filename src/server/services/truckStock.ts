import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { fromManila } from "~/lib/datetime";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "~/lib/i18n/locale";
import type { RecordStockMovementInput } from "~/lib/schemas/crew";
import { db as defaultDb } from "~/server/db";
import {
  orderItems,
  orders,
  productUnits,
  products,
  truckStockMovements,
  type ProductCategory,
} from "~/server/db/schema";

import { loadShortfall, onHand, tallyMovements } from "./truckStockMath";

type Db = typeof defaultDb;

export type StockRow = {
  productUnitId: string;
  productId: string;
  nameTl: string;
  nameEn: string;
  unitLabelTl: string;
  unitLabelEn: string;
  category: ProductCategory;
  /** Sum of today's live (non-cancelled) order lines on this route. */
  needed: number;
  loaded: number;
  added: number;
  reduced: number;
  sold: number;
  /** Order lines already handed over today (status delivered/settled). */
  delivered: number;
  onHand: number;
};

/** The Manila-midnight instant for a "yyyy-MM-dd" day key. */
function dayStartOf(dayStr: string): Date {
  return fromManila(new Date(`${dayStr}T00:00:00`));
}

/**
 * Per-unit tallies of today's order lines on one route: how much the truck
 * must carry (`needed`, every live order) and how much has already been
 * handed over (`delivered`). Cancelled orders and cancelled lines don't count.
 */
async function orderTalliesForRouteDay(db: Db, routeId: string, dayStr: string) {
  const rows = await db
    .select({
      productUnitId: orderItems.productUnitId,
      needed: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${orders.status} not in ('cancelled','draft')), 0)::int`,
      delivered: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${orders.status} in ('delivered','settled')), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.routeId, routeId),
        eq(orders.deliverOn, dayStartOf(dayStr)),
        eq(orderItems.cancelledItem, false),
      ),
    )
    .groupBy(orderItems.productUnitId);
  return new Map(rows.map((r) => [r.productUnitId, { needed: r.needed, delivered: r.delivered }]));
}

/** What's on the truck for one route and Manila day, one row per active unit. */
export async function stockForRouteDay(db: Db, routeId: string, dayStr: string): Promise<StockRow[]> {
  const [units, orderTallies, movementRows] = await Promise.all([
    db
      .select({
        productUnitId: productUnits.id,
        productId: products.id,
        nameTl: products.nameTl,
        nameEn: products.nameEn,
        unitLabelTl: productUnits.labelTl,
        unitLabelEn: productUnits.labelEn,
        category: products.category,
      })
      .from(productUnits)
      .innerJoin(products, eq(products.id, productUnits.productId))
      .where(and(eq(products.isActive, true), eq(productUnits.isActive, true)))
      .orderBy(asc(products.category), asc(products.nameTl), asc(productUnits.sortOrder)),
    orderTalliesForRouteDay(db, routeId, dayStr),
    db
      .select({
        productUnitId: truckStockMovements.productUnitId,
        kind: truckStockMovements.kind,
        quantity: truckStockMovements.quantity,
      })
      .from(truckStockMovements)
      .where(and(eq(truckStockMovements.routeId, routeId), eq(truckStockMovements.stockOn, dayStr))),
  ]);
  const movements = tallyMovements(movementRows);

  return units.map((u) => {
    const m = movements.get(u.productUnitId) ?? { loaded: 0, added: 0, reduced: 0, sold: 0 };
    const o = orderTallies.get(u.productUnitId) ?? { needed: 0, delivered: 0 };
    const tally = { ...m, delivered: o.delivered };
    return { ...u, ...tally, needed: o.needed, onHand: onHand(tally) };
  });
}

export type RecordMovementResult =
  | { ok: true }
  | { ok: false; reason: "unknown_unit"; message: string };

/** A hand-entered add/reduce. Append-only; the reason is required for reduce by the schema. */
export async function recordMovement(
  db: Db,
  staffUserId: string,
  dayStr: string,
  input: RecordStockMovementInput,
  locale: Locale = DEFAULT_LOCALE,
): Promise<RecordMovementResult> {
  const [unit] = await db
    .select({ id: productUnits.id })
    .from(productUnits)
    .where(eq(productUnits.id, input.productUnitId))
    .limit(1);
  if (!unit) {
    return { ok: false, reason: "unknown_unit", message: getDictionary(locale).crew.errors.unknownUnit };
  }
  await db.insert(truckStockMovements).values({
    routeId: input.routeId,
    stockOn: dayStr,
    productUnitId: input.productUnitId,
    kind: input.kind,
    quantity: input.quantity,
    reason: input.reason ?? null,
    createdBy: staffUserId,
  });
  return { ok: true };
}

/**
 * One tap at the depot: load whatever today's orders still need. Writes a
 * `load` row only for the shortfall per unit, so running it twice (or after
 * a manual add) never double-loads.
 */
export async function loadFromOrders(
  db: Db,
  staffUserId: string,
  routeId: string,
  dayStr: string,
): Promise<{ ok: true; loadedUnits: number }> {
  const orderTallies = await orderTalliesForRouteDay(db, routeId, dayStr);
  const neededUnitIds = [...orderTallies.keys()];
  if (neededUnitIds.length === 0) return { ok: true, loadedUnits: 0 };

  const movementRows = await db
    .select({
      productUnitId: truckStockMovements.productUnitId,
      kind: truckStockMovements.kind,
      quantity: truckStockMovements.quantity,
    })
    .from(truckStockMovements)
    .where(
      and(
        eq(truckStockMovements.routeId, routeId),
        eq(truckStockMovements.stockOn, dayStr),
        inArray(truckStockMovements.productUnitId, neededUnitIds),
      ),
    );
  const movements = tallyMovements(movementRows);

  const toLoad = neededUnitIds.flatMap((unitId) => {
    const m = movements.get(unitId) ?? { loaded: 0, added: 0, reduced: 0, sold: 0 };
    const onBoard = m.loaded + m.added - m.reduced;
    const shortfall = loadShortfall(orderTallies.get(unitId)!.needed, onBoard);
    return shortfall > 0 ? [{ unitId, shortfall }] : [];
  });
  if (toLoad.length === 0) return { ok: true, loadedUnits: 0 };

  await db.insert(truckStockMovements).values(
    toLoad.map((l) => ({
      routeId,
      stockOn: dayStr,
      productUnitId: l.unitId,
      kind: "load" as const,
      quantity: l.shortfall,
      createdBy: staffUserId,
    })),
  );
  return { ok: true, loadedUnits: toLoad.length };
}

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { formatManila, fromManila, now } from "~/lib/datetime";
import { orderItems, orders, routes, stores, truckStockMovements } from "~/server/db/schema";
import { SEED, TEST_DATABASE_URL, integrationDb } from "~/test/integrationDb";

import { loadFromOrders, recordMovement, stockForRouteDay } from "./truckStock";

const STAFF_USER = "99999999-9999-4999-8999-999999999999";

describe.skipIf(!TEST_DATABASE_URL)("truck stock (local Postgres)", () => {
  const { db, close } = TEST_DATABASE_URL ? integrationDb() : { db: null!, close: async () => {} };
  /** A fresh route per run so earlier runs' movements never leak in. */
  let routeId = "";
  let storeId = "";
  const dayStr = formatManila(now(), "yyyy-MM-dd");
  const dayStart = fromManila(new Date(`${dayStr}T00:00:00`));

  async function insertOrder(status: "submitted" | "delivered" | "cancelled", qty: number) {
    const [o] = await db
      .insert(orders)
      .values({
        storeId,
        routeId,
        status,
        subtotalCentavos: 0n,
        totalCentavos: 0n,
        deliverOn: dayStart,
        submittedAt: now(),
      })
      .returning({ id: orders.id });
    await db.insert(orderItems).values({
      orderId: o!.id,
      productId: SEED.sibuyasId,
      productUnitId: SEED.sibuyasKiloUnitId,
      quantity: qty,
      lockedUnitPriceCentavos: 1n,
      lockedTotalCentavos: BigInt(qty),
    });
    return o!.id;
  }

  beforeAll(async () => {
    const [route] = await db
      .insert(routes)
      .values({ name: `Test ruta ${Date.now()}`, cutoffLocal: "04:30", departureLocal: "06:00" })
      .returning({ id: routes.id });
    routeId = route!.id;
    const [store] = await db.select({ id: stores.id }).from(stores).limit(1);
    storeId = store!.id;
    // 5 kilos live on two orders, 2 kilos already delivered, 7 on a cancelled order.
    await insertOrder("submitted", 3);
    await insertOrder("delivered", 2);
    await insertOrder("cancelled", 7);
  });

  afterAll(async () => {
    await close();
  });

  function sibuyasKilo(rows: Awaited<ReturnType<typeof stockForRouteDay>>) {
    return rows.find((r) => r.productUnitId === SEED.sibuyasKiloUnitId)!;
  }

  it("counts needed from live orders and delivered from delivered ones, ignoring cancelled", async () => {
    const row = sibuyasKilo(await stockForRouteDay(db, routeId, dayStr));
    expect(row.needed).toBe(5);
    expect(row.delivered).toBe(2);
    expect(row.loaded).toBe(0);
    expect(row.onHand).toBe(-2);
  });

  it("loads only the shortfall from orders, and nothing more on a second run", async () => {
    const first = await loadFromOrders(db, STAFF_USER, routeId, dayStr);
    expect(first.loadedUnits).toBe(1);
    const second = await loadFromOrders(db, STAFF_USER, routeId, dayStr);
    expect(second.loadedUnits).toBe(0);

    const loads = await db
      .select()
      .from(truckStockMovements)
      .where(and(eq(truckStockMovements.routeId, routeId), eq(truckStockMovements.kind, "load")));
    expect(loads).toHaveLength(1);
    expect(loads[0]!.quantity).toBe(5);

    const row = sibuyasKilo(await stockForRouteDay(db, routeId, dayStr));
    expect(row.loaded).toBe(5);
    expect(row.onHand).toBe(3);
  });

  it("add and reduce movements land in their buckets", async () => {
    await recordMovement(db, STAFF_USER, dayStr, {
      routeId,
      productUnitId: SEED.sibuyasKiloUnitId,
      kind: "add",
      quantity: 4,
    });
    await recordMovement(db, STAFF_USER, dayStr, {
      routeId,
      productUnitId: SEED.sibuyasKiloUnitId,
      kind: "reduce",
      quantity: 1,
      reason: "nabulok",
    });
    const row = sibuyasKilo(await stockForRouteDay(db, routeId, dayStr));
    expect(row).toMatchObject({ loaded: 5, added: 4, reduced: 1, delivered: 2, onHand: 6 });
  });

  it("does not load again once manual adds already cover the orders", async () => {
    // needed 5, on board 5 + 4 − 1 = 8 → no shortfall.
    const r = await loadFromOrders(db, STAFF_USER, routeId, dayStr);
    expect(r.loadedUnits).toBe(0);
  });

  it("rejects a movement for an unknown unit", async () => {
    const r = await recordMovement(db, STAFF_USER, dayStr, {
      routeId,
      productUnitId: "00000000-0000-4000-8000-000000000000",
      kind: "add",
      quantity: 1,
    });
    expect(r.ok).toBe(false);
  });
});

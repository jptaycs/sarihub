import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { formatManila, now } from "~/lib/datetime";
import { posSales, productUnits, routes, stores, sukiLedger, truckStockMovements } from "~/server/db/schema";
import { SEED, TEST_DATABASE_URL, freshStore, integrationDb } from "~/test/integrationDb";

import { createPosSale } from "./posSales";

const STAFF_USER = "99999999-9999-4999-8999-999999999999";

describe.skipIf(!TEST_DATABASE_URL)("createPosSale (local Postgres)", () => {
  const { db, close } = TEST_DATABASE_URL ? integrationDb() : { db: null!, close: async () => {} };
  let storeId = "";
  let sibuyasKiloPrice = 0n;

  beforeAll(async () => {
    storeId = (await freshStore(db)).id;
    const [price] = await db.query.dailyPrices.findMany({
      where: (t, { eq }) => eq(t.productUnitId, SEED.sibuyasKiloUnitId),
      orderBy: (t) => desc(t.capturedAt),
      limit: 1,
    });
    sibuyasKiloPrice = price!.priceCentavos;
  });

  afterAll(async () => {
    await close();
  });

  it("locks today's price, writes a sale movement, and leaves the tab alone for cash", async () => {
    const [before] = await db.select().from(stores).where(eq(stores.id, storeId));
    const key = crypto.randomUUID();
    const result = await createPosSale(db, STAFF_USER, {
      routeId: SEED.routeId,
      idempotencyKey: key,
      storeId: null,
      customerName: "Aling Nena",
      payment: "cash",
      items: [{ productUnitId: SEED.sibuyasKiloUnitId, quantity: 2 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alreadySold).toBe(false);
    expect(result.sale.totalCentavos).toBe(sibuyasKiloPrice * 2n);
    expect(result.sale.items[0]?.lockedUnitPriceCentavos).toBe(sibuyasKiloPrice);

    const movements = await db
      .select()
      .from(truckStockMovements)
      .where(eq(truckStockMovements.posSaleId, result.sale.saleId));
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      kind: "sale",
      quantity: 2,
      routeId: SEED.routeId,
      stockOn: formatManila(now(), "yyyy-MM-dd"),
    });

    const [after] = await db.select().from(stores).where(eq(stores.id, storeId));
    expect(after!.sukiBalanceCentavos).toBe(before!.sukiBalanceCentavos);
  });

  it("charges the suki tab and the store balance moves by the sale total", async () => {
    const [before] = await db.select().from(stores).where(eq(stores.id, storeId));
    const result = await createPosSale(db, STAFF_USER, {
      routeId: SEED.routeId,
      idempotencyKey: crypto.randomUUID(),
      storeId,
      payment: "suki",
      items: [{ productUnitId: SEED.sibuyasKiloUnitId, quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [after] = await db.select().from(stores).where(eq(stores.id, storeId));
    expect(after!.sukiBalanceCentavos - before!.sukiBalanceCentavos).toBe(sibuyasKiloPrice);

    const [ledgerRow] = await db
      .select()
      .from(sukiLedger)
      .where(eq(sukiLedger.posSaleId, result.sale.saleId));
    expect(ledgerRow).toMatchObject({ kind: "charge", amountCentavos: sibuyasKiloPrice, storeId });
  });

  it("returns the original sale on a retried key without a second charge", async () => {
    const key = crypto.randomUUID();
    const input = {
      routeId: SEED.routeId,
      idempotencyKey: key,
      storeId,
      payment: "suki" as const,
      items: [{ productUnitId: SEED.sibuyasKiloUnitId, quantity: 1 }],
    };
    const first = await createPosSale(db, STAFF_USER, input);
    const [mid] = await db.select().from(stores).where(eq(stores.id, storeId));
    const second = await createPosSale(db, STAFF_USER, input);
    const [after] = await db.select().from(stores).where(eq(stores.id, storeId));

    expect(first.ok && !first.alreadySold).toBe(true);
    expect(second.ok && second.alreadySold).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.sale.saleId).toBe(first.sale.saleId);
    expect(after!.sukiBalanceCentavos).toBe(mid!.sukiBalanceCentavos);
    const rows = await db.select().from(posSales).where(eq(posSales.idempotencyKey, key));
    expect(rows).toHaveLength(1);
  });

  it("refuses a suki sale that would exceed the tab, naming the room left", async () => {
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId));
    const room = store!.sukiLimitCentavos - store!.sukiBalanceCentavos;
    // Enough kilos to blow past whatever room is left.
    const quantity = Number(room / sibuyasKiloPrice) + 1;
    const result = await createPosSale(db, STAFF_USER, {
      routeId: SEED.routeId,
      idempotencyKey: crypto.randomUUID(),
      storeId,
      payment: "suki",
      items: [{ productUnitId: SEED.sibuyasKiloUnitId, quantity: Math.min(quantity, 999) }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("over_suki_limit");
    expect(result.availableCentavos).toBe(room);
    const [after] = await db.select().from(stores).where(eq(stores.id, storeId));
    expect(after!.sukiBalanceCentavos).toBe(store!.sukiBalanceCentavos);
  });

  it("refuses a key reused on another route or another day instead of echoing the old sale", async () => {
    const key = crypto.randomUUID();
    const first = await createPosSale(db, STAFF_USER, {
      routeId: SEED.routeId,
      idempotencyKey: key,
      storeId: null,
      payment: "cash",
      items: [{ productUnitId: SEED.sibuyasKiloUnitId, quantity: 1 }],
    });
    expect(first.ok).toBe(true);
    // Same key, different truck: this is a *new* sale whose cart kept a stale key.
    const [otherRoute] = await db
      .insert(routes)
      .values({ name: `Ruta ${key.slice(0, 8)}`, cutoffLocal: "04:30", departureLocal: "06:00" })
      .returning({ id: routes.id });
    const second = await createPosSale(db, STAFF_USER, {
      routeId: otherRoute!.id,
      idempotencyKey: key,
      storeId: null,
      payment: "cash",
      items: [{ productUnitId: SEED.sibuyasKiloUnitId, quantity: 3 }],
    });
    expect(second).toMatchObject({ ok: false, reason: "stale_key" });
  });

  it("refuses a unit with no live price today", async () => {
    // A brand-new unit on the seeded onion product has no daily_prices row.
    const [unit] = await db
      .insert(productUnits)
      .values({ productId: SEED.sibuyasId, labelTl: "pansubok", labelEn: "test", sortOrder: "99" })
      .returning({ id: productUnits.id });
    const result = await createPosSale(db, STAFF_USER, {
      routeId: SEED.routeId,
      idempotencyKey: crypto.randomUUID(),
      storeId: null,
      payment: "cash",
      items: [{ productUnitId: unit!.id, quantity: 1 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_price_today");
  });
});

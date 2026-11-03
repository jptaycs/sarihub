import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { formatManila, fromManila, now } from "~/lib/datetime";
import { notificationQueue, orders, stores } from "~/server/db/schema";
import { SEED, TEST_DATABASE_URL, integrationDb } from "~/test/integrationDb";

import { advanceOrderStatus } from "./orders";

describe.skipIf(!TEST_DATABASE_URL)("advanceOrderStatus (local Postgres)", () => {
  const { db, close } = TEST_DATABASE_URL ? integrationDb() : { db: null!, close: async () => {} };
  let orderId = "";

  beforeAll(async () => {
    const [store] = await db.select({ id: stores.id }).from(stores).limit(1);
    const dayStr = formatManila(now(), "yyyy-MM-dd");
    const [o] = await db
      .insert(orders)
      .values({
        storeId: store!.id,
        routeId: SEED.routeId,
        status: "submitted",
        subtotalCentavos: 0n,
        totalCentavos: 0n,
        deliverOn: fromManila(new Date(`${dayStr}T00:00:00`)),
        submittedAt: now(),
      })
      .returning({ id: orders.id });
    orderId = o!.id;
  });

  afterAll(async () => {
    await close();
  });

  it("refuses to skip a step", async () => {
    const r = await db.transaction((tx) => advanceOrderStatus(tx, orderId, "in_transit"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_transition");
  });

  it("packs a submitted order and stamps packed_at", async () => {
    const r = await db.transaction((tx) => advanceOrderStatus(tx, orderId, "packed"));
    expect(r).toMatchObject({ ok: true, alreadyThere: false, status: "packed" });
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(row!.status).toBe("packed");
    expect(row!.packedAt).not.toBeNull();
  });

  it("treats a second pack tap as already there, not an error", async () => {
    const r = await db.transaction((tx) => advanceOrderStatus(tx, orderId, "packed"));
    expect(r).toMatchObject({ ok: true, alreadyThere: true });
  });

  it("departing queues the out-for-delivery text for the store", async () => {
    const r = await db.transaction((tx) => advanceOrderStatus(tx, orderId, "in_transit"));
    expect(r).toMatchObject({ ok: true, alreadyThere: false, status: "in_transit" });
    const queued = await db
      .select()
      .from(notificationQueue)
      .where(eq(notificationQueue.orderId, orderId));
    expect(queued.map((q) => q.kind)).toEqual(["out_for_delivery"]);
  });

  it("reports a missing order", async () => {
    const r = await db.transaction((tx) =>
      advanceOrderStatus(tx, "00000000-0000-4000-8000-000000000000", "packed"),
    );
    expect(r).toMatchObject({ ok: false, reason: "not_found" });
  });
});

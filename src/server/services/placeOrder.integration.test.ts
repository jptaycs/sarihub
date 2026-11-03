import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { notificationQueue, orders } from "~/server/db/schema";
import { SEED, TEST_DATABASE_URL, freshStore, integrationDb } from "~/test/integrationDb";

import { cancelOrder, placeOrder } from "./orders";

describe.skipIf(!TEST_DATABASE_URL)("placeOrder / cancelOrder (local Postgres)", () => {
  const { db, close } = TEST_DATABASE_URL ? integrationDb() : { db: null!, close: async () => {} };
  let ownerUserId = "";
  let otherOwnerUserId = "";

  beforeAll(async () => {
    ownerUserId = (await freshStore(db)).ownerUserId;
    // A second store on the same route, owned by someone else.
    otherOwnerUserId = (await freshStore(db)).ownerUserId;
  });

  afterAll(async () => {
    await close();
  });

  const oneKilo = () => ({ items: [{ productUnitId: SEED.sibuyasKiloUnitId, quantity: 1 }] });

  it("a retried key returns the same order for the same store", async () => {
    const idempotencyKey = crypto.randomUUID();
    const first = await placeOrder(db, ownerUserId, { idempotencyKey, ...oneKilo() });
    const second = await placeOrder(db, ownerUserId, { idempotencyKey, ...oneKilo() });
    expect(first.ok && !first.alreadyPlaced).toBe(true);
    expect(second.ok && second.alreadyPlaced).toBe(true);
    if (first.ok && second.ok) expect(second.order.orderId).toBe(first.order.orderId);
  });

  it("a key that belongs to another store never echoes that store's order back", async () => {
    const idempotencyKey = crypto.randomUUID();
    const theirs = await placeOrder(db, otherOwnerUserId, { idempotencyKey, ...oneKilo() });
    const mine = await placeOrder(db, ownerUserId, { idempotencyKey, ...oneKilo() });
    expect(theirs.ok).toBe(true);
    // Not silently "already placed" with someone else's order, and not a raw
    // unique-constraint crash either: a clean refusal the client can act on.
    expect(mine).toMatchObject({ ok: false, reason: "stale_key" });
  });

  it("cancelling drops a queued 'confirmed' text even if it is waiting on a retry", async () => {
    const idempotencyKey = crypto.randomUUID();
    const placed = await placeOrder(db, ownerUserId, { idempotencyKey, ...oneKilo() });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const orderId = placed.order.orderId;

    // Semaphore 5xx'd once: the row is "failed" and scheduled for a retry.
    await db
      .update(notificationQueue)
      .set({ status: "failed", attempts: 1 })
      .where(and(eq(notificationQueue.orderId, orderId), eq(notificationQueue.kind, "confirmed")));

    const cancelled = await cancelOrder(db, ownerUserId, orderId);
    expect(cancelled.ok).toBe(true);

    const left = await db.select().from(notificationQueue).where(eq(notificationQueue.orderId, orderId));
    expect(left).toHaveLength(0);
    const [row] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId));
    expect(row!.status).toBe("cancelled");
  });
});

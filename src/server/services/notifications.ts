// src/server/services/notifications.ts
import "server-only";

import { and, asc, eq, isNotNull, lte, or } from "drizzle-orm";

import { now } from "~/lib/datetime";
import { db as defaultDb } from "~/server/db";
import { notificationQueue, type NotificationKind } from "~/server/db/schema";
import { backoffMinutes } from "./smsBackoff";
import { sendSms } from "./sms";

type Db = typeof defaultDb;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Queues one notification inside the caller's existing transaction — a
 * local Postgres insert only, never a network call, which is what keeps the
 * status-changing mutation that calls this un-blocked. The unique
 * (order_id, kind) constraint makes a duplicate call for the same order and
 * kind a harmless no-op: whichever code path gets there first wins (see the
 * spec's note on admin.setStatus and driver.markDelivered both being able
 * to land an order on "delivered").
 */
export async function enqueueNotification(
  tx: Tx,
  orderId: string,
  kind: NotificationKind,
  phoneE164: string,
  message: string,
): Promise<void> {
  await tx
    .insert(notificationQueue)
    .values({ orderId, kind, phoneE164, message })
    .onConflictDoNothing();
}

/** Hard ceiling on rows attempted per cron invocation (see the wall-clock note below). */
const BATCH_LIMIT = 20;

/**
 * Stop claiming new rows once this much wall-clock time has elapsed, leaving
 * headroom under the cron route's `maxDuration = 60`. Any row already
 * in-flight when we stop is left for the next run 5 minutes later.
 */
const WALL_CLOCK_BUDGET_MS = 45_000;

/**
 * Sends due rows one at a time: fresh ("pending") rows, plus "failed" rows
 * whose scheduled retry time has arrived. Each row is claimed, sent, and
 * marked in its OWN short transaction (not one transaction for the whole
 * batch) — sequential network calls to Semaphore can take up to ~10s apiece
 * (see sms.ts), and a single transaction spanning dozens of them held its
 * FOR UPDATE locks for the whole batch. If Vercel killed the function
 * mid-batch, that transaction rolled back — reverting rows Semaphore had
 * already delivered back to "pending" — and the next run resent every one of
 * them. Splitting into per-row transactions can't fully remove the risk (a
 * kill between Semaphore's response and our commit can still double-send
 * that one row — there's no provider-side idempotency to lean on), but it
 * shrinks the blast radius from "up to the whole batch" to "at most one row."
 * FOR UPDATE SKIP LOCKED also still protects against an overlapping cron
 * invocation (Vercel Cron does not guarantee no-overlap) double-sending the
 * same row.
 */
export async function processNotificationQueue(db: Db): Promise<{ sent: number; failed: number }> {
  const startedAt = Date.now();
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < BATCH_LIMIT; i++) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) break;

    const outcome = await db.transaction(async (tx) => {
      const at = now();
      const [row] = await tx
        .select()
        .from(notificationQueue)
        .where(
          or(
            eq(notificationQueue.status, "pending"),
            and(
              eq(notificationQueue.status, "failed"),
              isNotNull(notificationQueue.nextAttemptAt),
              lte(notificationQueue.nextAttemptAt, at),
            ),
          ),
        )
        // Oldest first, so a run can't send "out for delivery" before
        // "confirmed" for the same order if both are due at once.
        .orderBy(asc(notificationQueue.createdAt))
        .for("update", { skipLocked: true })
        .limit(1);
      if (!row) return "empty" as const;

      const result = await sendSms(row.phoneE164, row.message);

      if (result.ok) {
        await tx
          .update(notificationQueue)
          .set({ status: "sent", sentAt: at })
          .where(eq(notificationQueue.id, row.id));
        return "sent" as const;
      }

      const attempts = row.attempts + 1;
      const nextIn = backoffMinutes(attempts);
      await tx
        .update(notificationQueue)
        .set({
          status: "failed",
          attempts,
          lastError: result.error,
          // null once retries are exhausted — this is the terminal marker
          // that excludes the row from future runs' WHERE clause above.
          // The (order_id, kind) unique constraint means this row can never
          // be re-queued by the app once terminal; the only recovery is a
          // manual DB UPDATE resetting status/next_attempt_at.
          nextAttemptAt: nextIn === null ? null : new Date(at.getTime() + nextIn * 60_000),
        })
        .where(eq(notificationQueue.id, row.id));
      return "failed" as const;
    });

    if (outcome === "empty") break;
    if (outcome === "sent") sent++;
    else failed++;
  }

  return { sent, failed };
}

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

/**
 * Sends every due row: fresh ("pending") rows, plus "failed" rows whose
 * scheduled retry time has arrived. FOR UPDATE SKIP LOCKED so an
 * overlapping cron invocation (Vercel Cron does not guarantee no-overlap)
 * never double-sends the same row.
 */
export async function processNotificationQueue(db: Db): Promise<{ sent: number; failed: number }> {
  const at = now();
  let sent = 0;
  let failed = 0;

  await db.transaction(async (tx) => {
    const due = await tx
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
      // Oldest first, so a single cron run can't send "out for delivery"
      // before "confirmed" for the same order if both are due at once.
      .orderBy(asc(notificationQueue.createdAt))
      .for("update", { skipLocked: true })
      .limit(50);

    for (const row of due) {
      const result = await sendSms(row.phoneE164, row.message);

      if (result.ok) {
        await tx
          .update(notificationQueue)
          .set({ status: "sent", sentAt: at })
          .where(eq(notificationQueue.id, row.id));
        sent++;
        continue;
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
      failed++;
    }
  });

  return { sent, failed };
}

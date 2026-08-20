import { integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { idColumn } from "./_shared";
import { orders } from "./orders";

export const notificationKind = pgEnum("notification_kind", [
  "confirmed",
  "out_for_delivery",
  "delivered",
]);

export type NotificationKind = (typeof notificationKind.enumValues)[number];

export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

/**
 * One row per (order, kind). `message` is rendered and frozen at enqueue
 * time, so a later copy edit never changes an already-queued send, and the
 * cron worker never needs to re-fetch order/store context to know what to
 * say. `next_attempt_at` doubles as the terminal-failure marker: once
 * retries are exhausted it's set to null, which is what excludes a row from
 * the next cron run for good (see notifications.ts).
 */
export const notificationQueue = pgTable(
  "notification_queue",
  {
    id: idColumn(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    message: text("message").notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** Nullable — null is the terminal-failure marker once retries are
     *  exhausted (see notifications.ts). Defaults to now() so a fresh
     *  "pending" row is immediately eligible if it were ever queried by
     *  the failed-retry branch, though in practice pending rows are
     *  selected by status alone. */
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [unique("notification_queue_order_kind_unique").on(table.orderId, table.kind)],
);

export type NotificationQueueRow = typeof notificationQueue.$inferSelect;

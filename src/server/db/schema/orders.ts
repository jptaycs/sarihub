import { sql } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { centavos, idColumn, timestampColumns } from "./_shared";
import { productUnits, products } from "./catalog";
import { routes } from "./routes";
import { stores } from "./stores";

/**
 * Order lifecycle is strictly forward:
 * draft → submitted → packed → in_transit → delivered → settled.
 * Cancellation is a parallel state, not a backwards step.
 */
export const orderStatus = pgEnum("order_status", [
  "draft",
  "submitted",
  "packed",
  "in_transit",
  "delivered",
  "settled",
  "cancelled",
]);

export const orders = pgTable("orders", {
  id: idColumn(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "restrict" }),
  routeId: uuid("route_id")
    .notNull()
    .references(() => routes.id, { onDelete: "restrict" }),
  status: orderStatus("status").notNull().default("draft"),

  /** Idempotency key, supplied by the client on submit. Prevents duplicate orders on retry. */
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),

  /** Locked totals captured at submission. Read-only after status > draft. */
  subtotalCentavos: centavos("subtotal_centavos").notNull().default(sql`0`),
  totalCentavos: centavos("total_centavos").notNull().default(sql`0`),

  /** Delivery date intended for this order (Manila day boundary). */
  deliverOn: timestamp("deliver_on", { withTimezone: true }).notNull(),

  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  packedAt: timestamp("packed_at", { withTimezone: true }),
  inTransitAt: timestamp("in_transit_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledReason: text("cancelled_reason"),

  /** Proof of delivery: Supabase Storage paths in the `pod` bucket. */
  podPhotoPath: text("pod_photo_path"),
  podSignaturePath: text("pod_signature_path"),

  ...timestampColumns,
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const orderItems = pgTable("order_items", {
  id: idColumn(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  productUnitId: uuid("product_unit_id")
    .notNull()
    .references(() => productUnits.id, { onDelete: "restrict" }),

  quantity: integer("quantity").notNull(),

  /** Price per unit at submission. Reading the live price for an existing order is a bug. */
  lockedUnitPriceCentavos: centavos("locked_unit_price_centavos").notNull(),
  /** quantity * lockedUnitPrice, stored to dodge recomputation drift. */
  lockedTotalCentavos: centavos("locked_total_centavos").notNull(),

  /** True when item ran out between submission and pack. Total recomputes; SMS goes out. */
  cancelledItem: boolean("cancelled_item").notNull().default(false),

  ...timestampColumns,
});

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

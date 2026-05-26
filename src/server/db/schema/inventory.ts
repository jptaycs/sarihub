import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "./_shared";
import { productUnits } from "./catalog";
import { routes } from "./routes";

/** One snapshot per route cycle, not per transaction. */
export const inventorySnapshots = pgTable("inventory_snapshots", {
  id: idColumn(),
  routeId: uuid("route_id")
    .notNull()
    .references(() => routes.id, { onDelete: "cascade" }),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestampColumns,
});

export const inventorySnapshotItems = pgTable("inventory_snapshot_items", {
  id: idColumn(),
  snapshotId: uuid("snapshot_id")
    .notNull()
    .references(() => inventorySnapshots.id, { onDelete: "cascade" }),
  productUnitId: uuid("product_unit_id")
    .notNull()
    .references(() => productUnits.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  ...timestampColumns,
});

export type InventorySnapshot = typeof inventorySnapshots.$inferSelect;
export type InventorySnapshotItem = typeof inventorySnapshotItems.$inferSelect;

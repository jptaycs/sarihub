import { integer, pgTable, smallint, text, time, varchar } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "./_shared";

export const routes = pgTable("routes", {
  id: idColumn(),
  name: varchar("name", { length: 64 }).notNull(),
  /** Bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64. */
  activeWeekdays: smallint("active_weekdays").notNull().default(127),
  /** Cutoff for same-day ordering, Manila local time. */
  cutoffLocal: time("cutoff_local").notNull(),
  departureLocal: time("departure_local").notNull(),
  vehiclePlate: varchar("vehicle_plate", { length: 16 }),
  driverName: text("driver_name"),
  capacityKg: integer("capacity_kg"),
  ...timestampColumns,
});

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;

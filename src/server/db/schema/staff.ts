import { boolean, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { idColumn, timestampColumns } from "./_shared";

/**
 * Distributor-side people. Owners are NOT staff — a store owner's identity
 * lives on `stores.owner_user_id`. One auth user is either an owner or staff,
 * never both; role screens guard on this table.
 */
export const staffRole = pgEnum("staff_role", ["buyer", "admin", "driver"]);

export const staff = pgTable("staff", {
  id: idColumn(),
  /** Supabase auth user (phone OTP, same as owners). */
  userId: uuid("user_id").notNull().unique(),
  name: text("name").notNull(),
  phoneE164: varchar("phone_e164", { length: 16 }).notNull().unique(),
  role: staffRole("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestampColumns,
});

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;

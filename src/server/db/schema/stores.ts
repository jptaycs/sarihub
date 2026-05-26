import { sql } from "drizzle-orm";
import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { centavos, idColumn, timestampColumns } from "./_shared";
import { routes } from "./routes";

export const stores = pgTable("stores", {
  id: idColumn(),
  /** Supabase auth user that owns this store. */
  ownerUserId: uuid("owner_user_id").notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  ownerName: text("owner_name").notNull(),
  phoneE164: varchar("phone_e164", { length: 16 }).notNull().unique(),
  addressLine: text("address_line"),
  routeId: uuid("route_id").references(() => routes.id, { onDelete: "set null" }),

  /** Suki credit limit, integer centavos. */
  sukiLimitCentavos: centavos("suki_limit_centavos").notNull().default(sql`0`),
  /** Denormalized current balance. Recomputed by trigger from suki_ledger. Read-only from app. */
  sukiBalanceCentavos: centavos("suki_balance_centavos").notNull().default(sql`0`),

  ...timestampColumns,
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;

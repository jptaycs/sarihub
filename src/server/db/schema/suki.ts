import { pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { centavos, idColumn, timestampColumns } from "./_shared";
import { orders } from "./orders";
import { stores } from "./stores";

/**
 * Append-only ledger. Never UPDATE this table — only INSERT.
 * Current balance = SUM(amount_centavos) WHERE store_id = ?.
 * - charge: positive (store owes more)
 * - payment: negative (store pays down)
 * - adjustment: signed, with a reason
 */
export const sukiLedgerKind = pgEnum("suki_ledger_kind", ["charge", "payment", "adjustment"]);

export const sukiLedger = pgTable("suki_ledger", {
  id: idColumn(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "restrict" }),
  kind: sukiLedgerKind("kind").notNull(),
  /** Signed centavos. Positive = store now owes more, negative = paid down. */
  amountCentavos: centavos("amount_centavos").notNull(),
  /** Optional link to the order this entry came from (for charge entries). */
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  reason: text("reason"),
  ...timestampColumns,
});

export type SukiLedgerRow = typeof sukiLedger.$inferSelect;
export type NewSukiLedgerRow = typeof sukiLedger.$inferInsert;

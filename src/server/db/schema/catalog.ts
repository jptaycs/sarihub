import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { centavos, idColumn, timestampColumns } from "./_shared";

export const productSource = pgEnum("product_source", ["palengke", "warehouse"]);

export const products = pgTable(
  "products",
  {
    id: idColumn(),
    nameTl: varchar("name_tl", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    category: varchar("category", { length: 48 }).notNull(),
    isPerishable: boolean("is_perishable").notNull().default(false),
    source: productSource("source").notNull().default("palengke"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (t) => [index("products_category_idx").on(t.category)],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export const productUnits = pgTable(
  "product_units",
  {
    id: idColumn(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Human label, Tagalog. e.g. "1 kg", "tray na 30", "balde". */
    labelTl: varchar("label_tl", { length: 48 }).notNull(),
    labelEn: varchar("label_en", { length: 48 }).notNull(),
    /** Sort key within a product. */
    sortOrder: varchar("sort_order", { length: 8 }).notNull().default("00"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (t) => [index("product_units_product_idx").on(t.productId)],
);

export type ProductUnit = typeof productUnits.$inferSelect;

/**
 * Append-only daily price snapshots. Reads pick the row where now() is within
 * [captured_at, valid_until). Never UPDATE — always INSERT a new row.
 */
export const dailyPrices = pgTable(
  "daily_prices",
  {
    id: idColumn(),
    productUnitId: uuid("product_unit_id")
      .notNull()
      .references(() => productUnits.id, { onDelete: "cascade" }),
    priceCentavos: centavos("price_centavos").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    sourceMarket: varchar("source_market", { length: 64 }),
    capturedBy: uuid("captured_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("daily_prices_unit_window_idx").on(t.productUnitId, t.capturedAt, t.validUntil),
    uniqueIndex("daily_prices_unit_capture_uq").on(t.productUnitId, t.capturedAt),
  ],
);

export type DailyPrice = typeof dailyPrices.$inferSelect;
export type NewDailyPrice = typeof dailyPrices.$inferInsert;

/** Helper: select the live price for a product_unit at `at`. */
export const livePriceSql = (productUnitId: string, at: Date) => sql`
  SELECT price_centavos FROM daily_prices
  WHERE product_unit_id = ${productUnitId}
    AND captured_at <= ${at}
    AND valid_until > ${at}
  ORDER BY captured_at DESC
  LIMIT 1
`;

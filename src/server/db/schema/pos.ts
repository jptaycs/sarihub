import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { centavos, idColumn, timestampColumns } from "./_shared";
import { productUnits, products } from "./catalog";
import { routes } from "./routes";
import { stores } from "./stores";

/**
 * Walk-up sales made straight off the truck by the helper (POS).
 *
 * Mirrors `orders`/`order_items`: unit prices are locked from the daily_prices
 * row live at sale time, and the sale is immutable once written — a mistake
 * is corrected with a stock `reduce`/`add` movement and an admin suki
 * adjustment, never by editing the sale. Cash sales touch no ledger; suki
 * sales post a `charge` row on `suki_ledger` linked by `pos_sale_id`.
 */
export const posPayment = pgEnum("pos_payment", ["cash", "suki"]);
export type PosPayment = (typeof posPayment.enumValues)[number];

export const posSales = pgTable(
  "pos_sales",
  {
    id: idColumn(),
    /** The truck (route) the goods came off — not necessarily the store's route. */
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "restrict" }),
    /** Null = walk-in customer with no SariHub account. */
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "restrict" }),
    /** Free-text name for a walk-in; ignored when storeId is set. */
    customerName: varchar("customer_name", { length: 80 }),
    payment: posPayment("payment").notNull(),
    totalCentavos: centavos("total_centavos").notNull(),
    /** Manila calendar day of the sale ("yyyy-MM-dd"); the truck-stock day key. */
    soldOn: date("sold_on").notNull(),
    /** Client-generated, one per cart. A retried submit returns the original sale. */
    idempotencyKey: varchar("idempotency_key", { length: 64 }).notNull().unique(),
    /** Auth user of the helper/admin who rang it up. */
    soldBy: uuid("sold_by").notNull(),
    ...timestampColumns,
  },
  (t) => [index("pos_sales_route_day_idx").on(t.routeId, t.soldOn)],
);

export type PosSale = typeof posSales.$inferSelect;
export type NewPosSale = typeof posSales.$inferInsert;

export const posSaleItems = pgTable("pos_sale_items", {
  id: idColumn(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => posSales.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  productUnitId: uuid("product_unit_id")
    .notNull()
    .references(() => productUnits.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  /** Price per unit at sale time. Reading the live price for an existing sale is a bug. */
  lockedUnitPriceCentavos: centavos("locked_unit_price_centavos").notNull(),
  lockedTotalCentavos: centavos("locked_total_centavos").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PosSaleItem = typeof posSaleItems.$inferSelect;

/**
 * Append-only ledger of what's on one truck for one Manila day.
 *
 * `quantity` is always positive; `kind` carries the sign — `load`/`add` put
 * goods on the truck, `reduce`/`sale` take them off. Delivered order lines
 * are *not* written here: on-hand is derived as movements minus today's
 * delivered order items for the route (see services/truckStock.ts), so the
 * driver app, the admin kanban and the crew app all agree without coupling.
 */
export const truckStockKind = pgEnum("truck_stock_kind", ["load", "add", "reduce", "sale"]);
export type TruckStockKind = (typeof truckStockKind.enumValues)[number];

export const truckStockMovements = pgTable(
  "truck_stock_movements",
  {
    id: idColumn(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    /** Manila calendar day ("yyyy-MM-dd"). */
    stockOn: date("stock_on").notNull(),
    productUnitId: uuid("product_unit_id")
      .notNull()
      .references(() => productUnits.id, { onDelete: "restrict" }),
    kind: truckStockKind("kind").notNull(),
    quantity: integer("quantity").notNull(),
    /** Required by the app for `reduce` (nabulok, nasira, …); null otherwise. */
    reason: text("reason"),
    /** Set on `sale` rows so a sale's stock effect can be traced. */
    posSaleId: uuid("pos_sale_id").references(() => posSales.id, { onDelete: "set null" }),
    /** Auth user who recorded it. */
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("truck_stock_movements_route_day_idx").on(t.routeId, t.stockOn)],
);

export type TruckStockMovement = typeof truckStockMovements.$inferSelect;
export type NewTruckStockMovement = typeof truckStockMovements.$inferInsert;

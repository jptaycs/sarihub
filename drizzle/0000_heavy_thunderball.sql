CREATE TYPE "public"."product_source" AS ENUM('palengke', 'warehouse');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'submitted', 'packed', 'in_transit', 'delivered', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."suki_ledger_kind" AS ENUM('charge', 'payment', 'adjustment');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"active_weekdays" smallint DEFAULT 127 NOT NULL,
	"cutoff_local" time NOT NULL,
	"departure_local" time NOT NULL,
	"vehicle_plate" varchar(16),
	"driver_name" text,
	"capacity_kg" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"owner_name" text NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"address_line" text,
	"route_id" uuid,
	"suki_limit_centavos" bigint DEFAULT 0 NOT NULL,
	"suki_balance_centavos" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_owner_user_id_unique" UNIQUE("owner_user_id"),
	CONSTRAINT "stores_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_unit_id" uuid NOT NULL,
	"price_centavos" bigint NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"source_market" varchar(64),
	"captured_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"label_tl" varchar(48) NOT NULL,
	"label_en" varchar(48) NOT NULL,
	"sort_order" varchar(8) DEFAULT '00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_tl" varchar(120) NOT NULL,
	"name_en" varchar(120) NOT NULL,
	"category" varchar(48) NOT NULL,
	"is_perishable" boolean DEFAULT false NOT NULL,
	"source" "product_source" DEFAULT 'palengke' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_unit_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"locked_unit_price_centavos" bigint NOT NULL,
	"locked_total_centavos" bigint NOT NULL,
	"cancelled_item" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"idempotency_key" varchar(64),
	"subtotal_centavos" bigint DEFAULT 0 NOT NULL,
	"total_centavos" bigint DEFAULT 0 NOT NULL,
	"deliver_on" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"packed_at" timestamp with time zone,
	"in_transit_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suki_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" "suki_ledger_kind" NOT NULL,
	"amount_centavos" bigint NOT NULL,
	"order_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_snapshot_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"product_unit_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stores" ADD CONSTRAINT "stores_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_product_unit_id_product_units_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_unit_id_product_units_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_units"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suki_ledger" ADD CONSTRAINT "suki_ledger_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suki_ledger" ADD CONSTRAINT "suki_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_snapshot_items" ADD CONSTRAINT "inventory_snapshot_items_snapshot_id_inventory_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."inventory_snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_snapshot_items" ADD CONSTRAINT "inventory_snapshot_items_product_unit_id_product_units_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_units"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "inventory_snapshots_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_prices_unit_window_idx" ON "daily_prices" USING btree ("product_unit_id","captured_at","valid_until");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_prices_unit_capture_uq" ON "daily_prices" USING btree ("product_unit_id","captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_units_product_idx" ON "product_units" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" USING btree ("category");
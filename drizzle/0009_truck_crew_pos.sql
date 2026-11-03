CREATE TYPE "public"."pos_payment" AS ENUM('cash', 'suki');--> statement-breakpoint
CREATE TYPE "public"."truck_stock_kind" AS ENUM('load', 'add', 'reduce', 'sale');--> statement-breakpoint
ALTER TYPE "public"."staff_role" ADD VALUE 'helper';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_unit_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"locked_unit_price_centavos" bigint NOT NULL,
	"locked_total_centavos" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pos_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"store_id" uuid,
	"customer_name" varchar(80),
	"payment" "pos_payment" NOT NULL,
	"total_centavos" bigint NOT NULL,
	"sold_on" date NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"sold_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pos_sales_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "truck_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"stock_on" date NOT NULL,
	"product_unit_id" uuid NOT NULL,
	"kind" "truck_stock_kind" NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text,
	"pos_sale_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suki_ledger" ADD COLUMN "pos_sale_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_sale_id_pos_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_product_unit_id_product_units_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_units"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "truck_stock_movements" ADD CONSTRAINT "truck_stock_movements_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "truck_stock_movements" ADD CONSTRAINT "truck_stock_movements_product_unit_id_product_units_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_units"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "truck_stock_movements" ADD CONSTRAINT "truck_stock_movements_pos_sale_id_pos_sales_id_fk" FOREIGN KEY ("pos_sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pos_sales_route_day_idx" ON "pos_sales" USING btree ("route_id","sold_on");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "truck_stock_movements_route_day_idx" ON "truck_stock_movements" USING btree ("route_id","stock_on");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suki_ledger" ADD CONSTRAINT "suki_ledger_pos_sale_id_pos_sales_id_fk" FOREIGN KEY ("pos_sale_id") REFERENCES "public"."pos_sales"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

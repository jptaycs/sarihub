CREATE TYPE "public"."staff_role" AS ENUM('buyer', 'admin', 'driver');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unit_stockouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_unit_id" uuid NOT NULL,
	"stockout_on" date NOT NULL,
	"marked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"role" "staff_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "staff_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unit_stockouts" ADD CONSTRAINT "unit_stockouts_product_unit_id_product_units_id_fk" FOREIGN KEY ("product_unit_id") REFERENCES "public"."product_units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unit_stockouts_unit_day_uq" ON "unit_stockouts" USING btree ("product_unit_id","stockout_on");
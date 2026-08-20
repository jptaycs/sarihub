CREATE TYPE "public"."notification_kind" AS ENUM('confirmed', 'out_for_delivery', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"phone_e164" varchar(16) NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "notification_queue_order_kind_unique" UNIQUE("order_id","kind")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

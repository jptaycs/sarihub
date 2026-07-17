ALTER TABLE "stores" ADD COLUMN "stop_order" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pod_photo_path" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pod_signature_path" text;
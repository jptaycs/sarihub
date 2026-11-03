CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_unit_idx" ON "order_items" USING btree ("product_unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_store_created_idx" ON "orders" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_deliver_route_status_idx" ON "orders" USING btree ("deliver_on","route_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suki_ledger_store_idx" ON "suki_ledger" USING btree ("store_id");
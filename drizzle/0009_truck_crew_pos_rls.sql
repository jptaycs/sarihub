-- Row-level security + triggers for migration 0009 (truck crew app: POS sales,
-- truck stock ledger). Apply after drizzle/0009_truck_crew_pos.sql, same as
-- the other paired _rls.sql files.

-- updated_at trigger (function defined in 0000). The two ledgers have only
-- created_at — append-only, nothing to stamp.
CREATE TRIGGER pos_sales_updated_at BEFORE UPDATE ON pos_sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE "pos_sales"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pos_sale_items"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "truck_stock_movements" ENABLE ROW LEVEL SECURITY;

-- Migration 0005 created notification_queue without enabling RLS, which left
-- store phone numbers + message text readable through PostgREST with the anon
-- key. The app only ever reaches this table over the direct Postgres
-- connection, so enabling RLS with no policy (deny all) is the whole fix.
ALTER TABLE "notification_queue"    ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Staff (helper, driver, admin, buyer) may read sales and stock — the crew
-- app and the admin views. Owners see their own suki charges through
-- suki_ledger (its owner policy already covers pos-linked rows), not here.
-- All writes are server-side via the direct connection.
-- ============================================================================

CREATE POLICY "pos_sales_staff_select" ON "pos_sales"
  FOR SELECT TO authenticated
  USING (is_active_staff());

CREATE POLICY "pos_sale_items_staff_select" ON "pos_sale_items"
  FOR SELECT TO authenticated
  USING (is_active_staff());

CREATE POLICY "truck_stock_movements_staff_select" ON "truck_stock_movements"
  FOR SELECT TO authenticated
  USING (is_active_staff());

-- Append-only, enforced at the SQL layer like suki_ledger: a sale or a stock
-- movement is never edited or deleted, only corrected by a new row.
REVOKE UPDATE, DELETE ON "pos_sales"             FROM PUBLIC, authenticated;
REVOKE UPDATE, DELETE ON "pos_sale_items"        FROM PUBLIC, authenticated;
REVOKE UPDATE, DELETE ON "truck_stock_movements" FROM PUBLIC, authenticated;

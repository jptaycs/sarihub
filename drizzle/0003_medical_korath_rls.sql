-- Storage setup for migration 0003 (proof-of-delivery photos + signatures).
-- Apply after drizzle/0003_medical_korath.sql.

-- Private bucket for POD media. Never public: delivery photos show storefronts
-- and signatures. Reads go through signed URLs or the policies below.
INSERT INTO storage.buckets (id, name, public)
VALUES ('pod', 'pod', false)
ON CONFLICT (id) DO NOTHING;

-- Active staff (the driver, and admins reviewing deliveries) may write and
-- read POD objects. Store owners don't touch the bucket directly — if owners
-- ever need to see their POD, serve a signed URL from the server.
CREATE POLICY "pod_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pod'
    AND EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active)
  );

-- Same-path retries overwrite (upsert) rather than pile up duplicates.
CREATE POLICY "pod_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pod'
    AND EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active)
  )
  WITH CHECK (
    bucket_id = 'pod'
    AND EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active)
  );

CREATE POLICY "pod_staff_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pod'
    AND EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active)
  );

-- ============================================================================
-- RLS audit for the staff roles (buyer/admin/driver), per AGENTS.md.
--
-- The 0000 policies assumed owner-only access. All app traffic goes through
-- tRPC on the server (direct Postgres connection, not subject to RLS), so
-- these policies are defense in depth for the PostgREST/storage surface: if a
-- staff phone session ever queries Supabase directly, it sees exactly what the
-- role screens show, and owners still see only their own rows. Writes remain
-- server-side only — no INSERT/UPDATE policies beyond the ones defined here.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_active_staff() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Staff see all stores (dispatch board, suki exposure, stop list).
CREATE POLICY "stores_staff_select" ON "stores"
  FOR SELECT TO authenticated
  USING (is_active_staff());

-- Staff see all orders and their items (kanban, delivery run).
CREATE POLICY "orders_staff_select" ON "orders"
  FOR SELECT TO authenticated
  USING (is_active_staff());

CREATE POLICY "order_items_staff_select" ON "order_items"
  FOR SELECT TO authenticated
  USING (is_active_staff());

-- Staff see the full suki ledger (admin exposure view).
CREATE POLICY "suki_ledger_staff_select" ON "suki_ledger"
  FOR SELECT TO authenticated
  USING (is_active_staff());

-- Buyers need price history (yesterday's price on the board), not just the
-- currently-valid window the 0000 owner policy exposes.
CREATE POLICY "daily_prices_staff_select" ON "daily_prices"
  FOR SELECT TO authenticated
  USING (is_active_staff());

-- Staff see the whole catalog including deactivated rows (admin management).
CREATE POLICY "products_staff_select" ON "products"
  FOR SELECT TO authenticated
  USING (is_active_staff());

CREATE POLICY "product_units_staff_select" ON "product_units"
  FOR SELECT TO authenticated
  USING (is_active_staff());

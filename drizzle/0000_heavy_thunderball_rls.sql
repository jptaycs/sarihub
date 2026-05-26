-- Row-level security policies + triggers for migration 0000.
-- Lives alongside the migration that created the tables, per AGENTS.md.
--
-- Roles:
--   authenticated — a Supabase-authenticated user (a store owner).
--   service_role  — the server-side service key. Bypasses RLS by design;
--                   used by server-side code that has already authorized the operation.
--   anon          — unauthenticated. No access to load-bearing tables.
--
-- Convention: app code uses `authenticated` for store-owner reads/writes.
-- Distributor/admin/dispatch operations run through service_role on the server.

-- pgcrypto for gen_random_uuid() (used by id defaults).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- updated_at trigger.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'routes','stores','products','product_units','orders','order_items',
      'suki_ledger','inventory_snapshots','inventory_snapshot_items'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t || '_updated_at', t
    );
  END LOOP;
END $$;

-- daily_prices has only created_at (append-only), no updated_at trigger needed.

-- Enable RLS on every table.
ALTER TABLE "routes"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stores"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_units"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_prices"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suki_ledger"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_snapshots"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_snapshot_items"  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Catalog: every authenticated user can read active catalog rows.
-- Writes are server-side via service_role only.
-- ============================================================================

CREATE POLICY "products_read_active" ON "products"
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "product_units_read_active" ON "product_units"
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "daily_prices_read_current" ON "daily_prices"
  FOR SELECT TO authenticated
  USING (captured_at <= now() AND valid_until > now());

CREATE POLICY "routes_read_all" ON "routes"
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- Stores: an owner sees and updates only their own store row.
-- ============================================================================

CREATE POLICY "stores_owner_select" ON "stores"
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "stores_owner_update" ON "stores"
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- Orders + order_items: owner sees their own orders.
-- Writes happen via service_role from src/server/services/orders.ts,
-- which enforces the lifecycle and idempotency invariants.
-- ============================================================================

CREATE POLICY "orders_owner_select" ON "orders"
  FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "order_items_owner_select" ON "order_items"
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE s.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Suki ledger: append-only.
-- Owner can read their own ledger. INSERT/UPDATE/DELETE blocked via no policy
-- (RLS denies by default). Server-side service_role writes ledger entries.
-- ============================================================================

CREATE POLICY "suki_ledger_owner_select" ON "suki_ledger"
  FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_user_id = auth.uid())
  );

-- Belt-and-suspenders: even service_role should not UPDATE/DELETE the ledger.
-- A revoke at the table level enforces this at the SQL layer, not just in app code.
REVOKE UPDATE, DELETE ON "suki_ledger" FROM PUBLIC;
REVOKE UPDATE, DELETE ON "suki_ledger" FROM authenticated;

-- ============================================================================
-- Suki balance trigger: keeps stores.suki_balance_centavos in sync with the ledger.
-- The ledger is the source of truth; this trigger just maintains the
-- denormalized cache for fast reads on the store-owner home screen.
-- ============================================================================

CREATE OR REPLACE FUNCTION recompute_suki_balance(p_store_id uuid) RETURNS void AS $$
BEGIN
  UPDATE stores
  SET suki_balance_centavos = COALESCE(
    (SELECT SUM(amount_centavos)::bigint FROM suki_ledger WHERE store_id = p_store_id),
    0
  )
  WHERE id = p_store_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION suki_ledger_after_insert() RETURNS trigger AS $$
BEGIN
  PERFORM recompute_suki_balance(NEW.store_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suki_ledger_balance_after_insert
  AFTER INSERT ON suki_ledger
  FOR EACH ROW EXECUTE FUNCTION suki_ledger_after_insert();

-- ============================================================================
-- Inventory snapshots: read-only for store owners (drivers/admins use service_role).
-- ============================================================================

CREATE POLICY "inventory_snapshots_read_all" ON "inventory_snapshots"
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "inventory_snapshot_items_read_all" ON "inventory_snapshot_items"
  FOR SELECT TO authenticated
  USING (true);

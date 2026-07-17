-- Row-level security policies + triggers for migration 0001 (staff, unit_stockouts).
-- Apply after drizzle/0001_goofy_thor.sql, same as 0000's RLS file.

-- updated_at triggers (function defined in 0000).
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER unit_stockouts_updated_at BEFORE UPDATE ON unit_stockouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE "staff"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_stockouts" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Staff: a staff member can read their own row (role guard needs it).
-- Creating/deactivating staff is an admin operation via service_role.
-- ============================================================================

CREATE POLICY "staff_self_select" ON "staff"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Stockouts: every authenticated user may read (catalog shows "ubos ngayon").
-- Writes happen server-side via service_role after the buyer-role check in tRPC.
-- ============================================================================

CREATE POLICY "unit_stockouts_read_all" ON "unit_stockouts"
  FOR SELECT TO authenticated
  USING (true);

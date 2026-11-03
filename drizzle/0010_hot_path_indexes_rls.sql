-- Trigger fix shipped with migration 0010. Apply after drizzle/0010_hot_path_indexes.sql.
--
-- recompute_suki_balance() ran `UPDATE stores SET balance = (SELECT SUM(...))`
-- with no lock on the store row. Under READ COMMITTED, when an order
-- (which holds the store row FOR UPDATE in placeOrder) overlaps an admin
-- payment for the same store, the payment's UPDATE blocks on the row lock,
-- and after the order commits Postgres re-evaluates only the WHERE — the
-- uncorrelated SUM keeps the snapshot taken *before* the order's charge was
-- visible. The cached balance then silently drops that charge until the
-- next ledger insert, and the next order's limit check passes wrongly.
--
-- Taking the row lock in its own statement first means the UPDATE that
-- follows starts a new statement snapshot after every concurrent writer
-- has committed, so the SUM is complete. The ledger stays the source of
-- truth; this only fixes the cache.
CREATE OR REPLACE FUNCTION recompute_suki_balance(p_store_id uuid) RETURNS void AS $$
BEGIN
  PERFORM 1 FROM stores WHERE id = p_store_id FOR UPDATE;
  UPDATE stores
  SET suki_balance_centavos = COALESCE(
    (SELECT SUM(amount_centavos)::bigint FROM suki_ledger WHERE store_id = p_store_id),
    0
  )
  WHERE id = p_store_id;
END;
$$ LANGUAGE plpgsql;

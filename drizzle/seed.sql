-- Dev seed: one Lucena route, a palengke catalog with today's prices, and a
-- store for every auth user that doesn't have one yet.
--
-- Run:  psql "$DATABASE_URL" -f drizzle/seed.sql
--
-- Safe to re-run: fixed UUIDs + ON CONFLICT DO NOTHING. Prices are append-only
-- by design, so each run inserts a fresh snapshot valid for 24 hours.

BEGIN;

-- ── Route ────────────────────────────────────────────────────────────────────
INSERT INTO routes (id, name, active_weekdays, cutoff_local, departure_local, vehicle_plate, driver_name, capacity_kg)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Ruta 1 — Lucena Centro', 127, '04:30', '06:00', 'NDF 1234', 'Mang Ben', 1000)
ON CONFLICT (id) DO NOTHING;

-- ── Products ─────────────────────────────────────────────────────────────────
INSERT INTO products (id, name_tl, name_en, category, is_perishable, source) VALUES
  ('bbbbbbbb-0001-0000-0000-000000000000', 'Sibuyas',    'Red onion',   'gulay',  true,  'palengke'),
  ('bbbbbbbb-0002-0000-0000-000000000000', 'Bawang',     'Garlic',      'gulay',  true,  'palengke'),
  ('bbbbbbbb-0003-0000-0000-000000000000', 'Kamatis',    'Tomato',      'gulay',  true,  'palengke'),
  ('bbbbbbbb-0004-0000-0000-000000000000', 'Repolyo',    'Cabbage',     'gulay',  true,  'palengke'),
  ('bbbbbbbb-0005-0000-0000-000000000000', 'Itlog',      'Chicken egg', 'itlog',  false, 'palengke'),
  ('bbbbbbbb-0006-0000-0000-000000000000', 'Galunggong', 'Round scad',  'isda',   true,  'palengke'),
  ('bbbbbbbb-0007-0000-0000-000000000000', 'Mantika',    'Cooking oil', 'kusina', false, 'warehouse'),
  ('bbbbbbbb-0008-0000-0000-000000000000', 'Toyo',       'Soy sauce',   'kusina', false, 'warehouse'),
  ('bbbbbbbb-0009-0000-0000-000000000000', 'Suka',       'Vinegar',     'kusina', false, 'warehouse'),
  ('bbbbbbbb-0010-0000-0000-000000000000', 'Asukal',     'White sugar', 'kusina', false, 'warehouse')
ON CONFLICT (id) DO NOTHING;

-- ── Units (the unit is part of the SKU; weight feeds the truck load check) ──
INSERT INTO product_units (id, product_id, label_tl, label_en, sort_order, weight_grams) VALUES
  ('cccccccc-0001-0000-0000-000000000001', 'bbbbbbbb-0001-0000-0000-000000000000', 'piraso',      'per piece',   '01',  100),
  ('cccccccc-0001-0000-0000-000000000002', 'bbbbbbbb-0001-0000-0000-000000000000', '1/4 kilo',    'quarter kg',  '02',  250),
  ('cccccccc-0001-0000-0000-000000000003', 'bbbbbbbb-0001-0000-0000-000000000000', '1 kilo',      'per kg',      '03', 1000),
  ('cccccccc-0001-0000-0000-000000000004', 'bbbbbbbb-0001-0000-0000-000000000000', 'sako 5 kilo', '5 kg sack',   '04', 5000),
  ('cccccccc-0002-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000000', '100 gramo',   '100 g',       '01',  100),
  ('cccccccc-0002-0000-0000-000000000002', 'bbbbbbbb-0002-0000-0000-000000000000', '1/4 kilo',    'quarter kg',  '02',  250),
  ('cccccccc-0002-0000-0000-000000000003', 'bbbbbbbb-0002-0000-0000-000000000000', '1 kilo',      'per kg',      '03', 1000),
  ('cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0003-0000-0000-000000000000', '1/4 kilo',    'quarter kg',  '01',  250),
  ('cccccccc-0003-0000-0000-000000000002', 'bbbbbbbb-0003-0000-0000-000000000000', '1 kilo',      'per kg',      '02', 1000),
  ('cccccccc-0004-0000-0000-000000000001', 'bbbbbbbb-0004-0000-0000-000000000000', 'piraso',      'per head',    '01', 1000),
  ('cccccccc-0004-0000-0000-000000000002', 'bbbbbbbb-0004-0000-0000-000000000000', '1 kilo',      'per kg',      '02', 1000),
  ('cccccccc-0005-0000-0000-000000000001', 'bbbbbbbb-0005-0000-0000-000000000000', 'piraso',      'per piece',   '01',   60),
  ('cccccccc-0005-0000-0000-000000000002', 'bbbbbbbb-0005-0000-0000-000000000000', 'dosena',      'dozen',       '02',  720),
  ('cccccccc-0005-0000-0000-000000000003', 'bbbbbbbb-0005-0000-0000-000000000000', 'tray (30)',   'tray of 30',  '03', 1800),
  ('cccccccc-0006-0000-0000-000000000001', 'bbbbbbbb-0006-0000-0000-000000000000', '1/2 kilo',    'half kg',     '01',  500),
  ('cccccccc-0006-0000-0000-000000000002', 'bbbbbbbb-0006-0000-0000-000000000000', '1 kilo',      'per kg',      '02', 1000),
  ('cccccccc-0007-0000-0000-000000000001', 'bbbbbbbb-0007-0000-0000-000000000000', '500 ml',      '500 ml',      '01',  500),
  ('cccccccc-0007-0000-0000-000000000002', 'bbbbbbbb-0007-0000-0000-000000000000', '1 litro',     '1 liter',     '02', 1000),
  ('cccccccc-0008-0000-0000-000000000001', 'bbbbbbbb-0008-0000-0000-000000000000', 'bote 385 ml', '385 ml',      '01',  500),
  ('cccccccc-0008-0000-0000-000000000002', 'bbbbbbbb-0008-0000-0000-000000000000', '1 litro',     '1 liter',     '02', 1100),
  ('cccccccc-0009-0000-0000-000000000001', 'bbbbbbbb-0009-0000-0000-000000000000', 'bote 385 ml', '385 ml',      '01',  500),
  ('cccccccc-0009-0000-0000-000000000002', 'bbbbbbbb-0009-0000-0000-000000000000', '1 litro',     '1 liter',     '02', 1100),
  ('cccccccc-0010-0000-0000-000000000001', 'bbbbbbbb-0010-0000-0000-000000000000', '1/2 kilo',    'half kg',     '01',  500),
  ('cccccccc-0010-0000-0000-000000000002', 'bbbbbbbb-0010-0000-0000-000000000000', '1 kilo',      'per kg',      '02', 1000)
ON CONFLICT (id) DO NOTHING;

-- ── Today's prices (centavos), valid 24h from now ────────────────────────────
INSERT INTO daily_prices (product_unit_id, price_centavos, captured_at, valid_until, source_market)
SELECT v.unit_id::uuid, v.price, now(), now() + interval '24 hours', 'Lucena palengke'
FROM (VALUES
  ('cccccccc-0001-0000-0000-000000000001',   800),
  ('cccccccc-0001-0000-0000-000000000002',  4500),
  ('cccccccc-0001-0000-0000-000000000003', 16000),
  ('cccccccc-0001-0000-0000-000000000004', 75000),
  ('cccccccc-0002-0000-0000-000000000001',  1800),
  ('cccccccc-0002-0000-0000-000000000002',  4000),
  ('cccccccc-0002-0000-0000-000000000003', 15000),
  ('cccccccc-0003-0000-0000-000000000001',  2000),
  ('cccccccc-0003-0000-0000-000000000002',  7000),
  ('cccccccc-0004-0000-0000-000000000001',  5500),
  ('cccccccc-0004-0000-0000-000000000002',  8000),
  ('cccccccc-0005-0000-0000-000000000001',   900),
  ('cccccccc-0005-0000-0000-000000000002', 10000),
  ('cccccccc-0005-0000-0000-000000000003', 24000),
  ('cccccccc-0006-0000-0000-000000000001',  9000),
  ('cccccccc-0006-0000-0000-000000000002', 17000),
  ('cccccccc-0007-0000-0000-000000000001',  6500),
  ('cccccccc-0007-0000-0000-000000000002', 12000),
  ('cccccccc-0008-0000-0000-000000000001',  2500),
  ('cccccccc-0008-0000-0000-000000000002',  6000),
  ('cccccccc-0009-0000-0000-000000000001',  2000),
  ('cccccccc-0009-0000-0000-000000000002',  5000),
  ('cccccccc-0010-0000-0000-000000000001',  4500),
  ('cccccccc-0010-0000-0000-000000000002',  8500)
) AS v(unit_id, price);

-- ── A store for every auth user without one (₱2,000 suki limit) ─────────────
-- Staff users are skipped: an auth user is either an owner or staff, never both.
INSERT INTO stores (owner_user_id, name, owner_name, phone_e164, address_line, route_id, suki_limit_centavos)
SELECT
  u.id,
  'Tindahan ni Suki',
  'Aling Suki',
  '+' || u.phone,
  'Brgy. Ibabang Dupay, Lucena City',
  'aaaaaaaa-0000-0000-0000-000000000001',
  200000
FROM auth.users u
WHERE u.phone IS NOT NULL
  AND u.id NOT IN (SELECT user_id FROM staff)
ON CONFLICT (owner_user_id) DO NOTHING;

-- ── Dev: promote an auth user to buyer staff ─────────────────────────────────
-- Sign in once with the phone you want to use, replace the number below, and
-- uncomment. Delete any store row the seed may have created for that user first.
-- INSERT INTO staff (user_id, name, phone_e164, role)
-- SELECT u.id, 'Ka Edna (buyer)', '+' || u.phone, 'buyer'
-- FROM auth.users u
-- WHERE u.phone = '639171234567'
-- ON CONFLICT (user_id) DO NOTHING;

COMMIT;

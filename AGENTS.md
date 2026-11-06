# AGENTS.md

> Read this file before touching anything else in the repo. It exists so you (the coding agent) make decisions that match the product's reality instead of generic SaaS defaults.

## What SariHub is

SariHub is a B2B ordering PWA for sari-sari store owners in the Philippines. A local distributor in Lucena, Quezon sources **fresh wet-market goods** (onion, garlic, eggs, tomatoes, vegetables, fish) and **fast-moving cooking essentials** (cooking oil, soy sauce, vinegar, condiments) before dawn, and delivers them on a fixed AM route in a 1-ton Toyota Tamaraw / Hilux. Store owners order the night before via the PWA; trucks roll out at 6 AM; stores receive stock before they open at 7-8 AM.

**This is not GrowSari and we are not trying to be.** GrowSari has $110M in funding, 511 staff, and owns the FMCG B2B layer (Lucky Me, Surf, Nescafé). They do not do fresh palengke goods. That gap is our wedge. If you find yourself building generic e-commerce features that look like every B2B marketplace, you've drifted — stop and re-read the "Wedge" section below.

## The wedge (read this twice)

Three product realities that should drive every implementation decision:

1. **Prices change daily.** Wet-market prices move with the morning catch and the harvest. The buyer team enters today's prices at ~5 AM from the palengke. A product has *today's price*, not *a price*. When a store places an order, the unit price is **locked from the row valid at submission time** so a price swing tomorrow morning doesn't change the bill.

2. **One product, multiple units.** Onion sells by piece, by 1/4 kg, by kilo, by 5kg sack. Eggs by piece, by dozen, by tray (30). Garlic by 100g, by 1/4 kg, by kilo. The unit is part of the SKU, not a derived field. Never assume "quantity × price".

3. **Suki credit is the default payment.** Sari-sari culture runs on running tabs. The store has a credit limit, an outstanding balance, and an append-only ledger of charges and payments. This is **not a lending product**, it's a tab. Don't build it like a fintech. Don't model interest. Don't add a credit score.

## Who uses the app

| User | Device | Context | What they need |
|---|---|---|---|
| Store owner (Aling Marisa) | Budget Android, 6", patchy 4G | Ordering at 9 PM while watching TV, often one-handed | Browse → tap unit → tap "Place order". 90 seconds end-to-end. Tagalog-first. |
| Buyer staff | Phone, wet hands, 5 AM at the palengke | Entering today's prices, marking stock | Big tap targets, "carry over from yesterday" bulk action, works offline |
| Driver | Phone in a moving Tamaraw, one-handed | Following today's route, marking deliveries, collecting signatures for suki | Ordered stop list, big delivered button, camera + signature pad |
| Truck helper (kasama) | Phone, wet/gloved hands at the 5 AM depot, then the passenger seat | Packing orders, loading the truck, selling off the truck to walk-ups and stores, handing goods over | `/crew`: Pack checklist + load bar, Stock ledger (load/add/reduce/on-hand), Sell POS (cash or suki tab at today's locked price), Deliver (the driver stop list) |
| Admin | Laptop first (well-lit office), but `/admin` must also work on a phone | Dispatching trucks, watching suki exposure, managing the catalog | Kanban board, route load check, daily price entry table |

If you're writing code that doesn't serve one of these five users, you're writing the wrong code.

## Tech stack (canonical)

- **Framework**: Next.js 15, App Router. One repo, one deploy.
- **Language**: TypeScript everywhere. No `any` without a `// TODO(reason)` comment.
- **Styling**: Tailwind CSS + shadcn/ui. No CSS-in-JS, no styled-components.
- **API layer**: tRPC. Procedures live under `src/server/routers/`. Server Actions are fine for form submissions; tRPC for everything queried from the client.
- **Database**: Postgres on Supabase. Migrations are Drizzle-generated into `drizzle/` (`pnpm db:generate`, `pnpm db:migrate`) with hand-written paired `_rls.sql` files applied via `psql`. Never edit the schema from the dashboard for anything that ships.
- **Auth**: Supabase Auth, **phone OTP only**. Email/password is not supported. Owners don't have emails.
- **Storage**: Supabase Storage for product photos and proof-of-delivery photos.
- **Maps/routing**: Mapbox GL JS for the driver app and admin dispatch view.
- **SMS**: Semaphore for transactional alerts (order confirmed, out for delivery, delivered).
- **Payments (later)**: PayMongo aggregator. Not GCash direct.
- **Hosting**: Vercel (web) + Supabase (data). One bill, one vendor pair.

Do not introduce new libraries without justification in the PR description. If you need a date library, use `date-fns`. If you need a form library, use `react-hook-form` with `zod` schemas (the same schemas back tRPC inputs — single source of truth).

## Project structure

```
src/
  app/                  Routes. (auth)/login + (auth)/verify, home (owner catalog + cart),
                        orders (owner order history), profile, buyer/, driver/, admin/
                        (orders, catalog, suki, stores, staff), crew/ (pack, stock, sell,
                        deliver — the truck helper app), api/trpc/[trpc], api/cron
  components/ui/        Shared primitives (Button, Input, Logo)
  lib/                  Client-safe helpers: format (peso/phone), datetime (Manila tz),
                        deliverySchedule (cutoff + weekday bitmask), useCart, schemas/ (zod,
                        shared by forms and tRPC inputs), supabase/, trpc/, i18n/ (dictionaries,
                        LanguageProvider, getServerLocale — see below)
  server/
    db/schema/          Drizzle schema, one file per domain
    routers/            tRPC routers (catalog, store, orders, buyer, admin, driver, crew)
    services/           Business logic the routers stay thin over (auth, orders incl. the
                        shared advanceOrderStatus, stockouts, posSales, truckStock)
  test/                 Vitest helpers: server-only stub, local-Postgres integration handle
    trpc/               init (context, procedures) + root router
drizzle/                Generated migrations + RLS/trigger SQL + seed.sql
```

**Local integration tests.** DB-touching services have `*.integration.test.ts` files that run
against a throwaway local Postgres when `TEST_DATABASE_URL` is set (they skip otherwise, so plain
`pnpm test` stays green). Set one up with `createdb sarihub_test`, create the Supabase stand-ins
(`auth` schema with `auth.users(id, phone)` and `auth.uid()`, `storage.buckets`/`storage.objects`,
roles `authenticated`/`anon`/`service_role`), then `DATABASE_URL=<local> pnpm db:migrate`, apply
every `drizzle/*_rls.sql` plus `drizzle/0008_stores_owner_update_rls_fix.sql` (hand-written, not
journaled) and `drizzle/seed.sql` with `psql`, and run `TEST_DATABASE_URL=<local> pnpm test`
(or just the DB-backed files with `pnpm test:integration`). Vitest aliases `server-only` to `src/test/serverOnlyStub.ts`
so services import cleanly. Seed prices expire after 24 hours like real ones, so a day later the POS and order tests fail with "no price" — re-run `drizzle/seed.sql` (safe to repeat; it appends fresh price rows) and they pass again.

**Playwright suite (live project).** `pnpm test:e2e` boots `next dev` and runs against the **live**
Supabase project in `.env` — there is no e2e database. Hard-won rules: every dev-login is a real
`signInWithOtp` to one of the two test numbers and Supabase throttles repeat sends to the same
number (the app shows it as "Maraming subok po…"), so `tests/e2e/auth.setup.ts` signs in once per
role and saves sessions under `tests/e2e/.auth/` (git-ignored); specs open contexts with
`storageState` from `tests/e2e/auth.paths.ts`, and only `guest-checkout.spec.ts` still signs in
itself because the redirect is what it tests (re-running back-to-back and seeing the rate-limit
copy on `/login` means wait a minute). `workers: 1` on purpose — the specs share one owner account
and would race each other's suki balance. 90s per test, because the dev server compiles each route
on first hit. Prices expire after `PRICE_VALIDITY_HOURS` (24), so on a cold day everything is
"walang presyo" until `money-path.spec.ts` sets one — run the whole suite, not a lone spec. Once per
machine: `pnpm exec playwright install chromium`. `crew-pos.spec.ts` reverses its own suki charge and stock movement at the end, so repeated runs don't walk the test owner toward the ₱2,000 tab limit.

Money is integer centavos (`bigint`) end to end. `now()` comes from `~/lib/datetime`, never `new Date()`. Tagalog-first copy in every user-facing string — but the app is bilingual (Tagalog/English) via a switcher on `/login`, so **every new user-facing string, including server-emitted tRPC/Server Action error messages, must go through `src/lib/i18n/dictionaries/{tl,en}.ts`**, never a hardcoded literal. Add the key to `tl.ts` first (canonical), then `en.ts` (TypeScript enforces the same shape). Client components read strings via `useDictionary()`/`useLocale()` from `~/lib/i18n/LanguageProvider`; Server Components and services via `getDictionary(await getServerLocale())`, threading `Locale` down as a parameter the same way `Db`/`userId` are threaded. Use `interpolate(template, vars)` for any string with a dynamic value. Zod schemas under `src/lib/schemas/` are shared by client forms and tRPC routers, so they never carry copy: a message is a key from `validationMessage("required")` (`~/lib/i18n/validation`), translated by `fieldError(dict, formState.errors.x?.message)` on the client and by the tRPC error formatter (`server/trpc/zodMessage.ts`) for `error.message`; anything that isn't a known key, including zod's own defaults, collapses to `validation.invalid`. DB-sourced content (product names — already dual `nameTl`/`nameEn`, categories, store/owner/route names) is explicitly out of scope for the toggle; see the dictionaries' file comments for why.

## Roadmap / to-do

Work top-to-bottom; each unchecked block is roughly one PR-sized slice. Check items off as they land.

**Deployed (2026-11-05):** Vercel project `sarihub` on the appnado team, Hobby plan, region `sin1`, production at https://sarihub-six.vercel.app. First deployed from the CLI (`vercel deploy --prod`); the project is connected to the GitHub repo `jptaycs/sarihub` (confirmed 2026-11-06 with `vercel git connect`), so a push to `main` deploys to production and other branches get preview deploys. Production env holds the four Supabase keys only (`vercel env ls production`); `.vercel/` and `.env.local` (Vercel's OIDC token) are gitignored. Smoke-tested: guest storefront and catalog API from the live DB, protected pages redirect to `/login?next=`, dev-login buttons absent, cron returns 401 without `CRON_SECRET`.

**Owner's decision (2026-11-04): no third-party API that needs a card or a subscription.** Twilio (real-number sign-in), Mapbox (driver map / pin picker), Semaphore (order SMS) and PayMongo stay dormant behind their env keys; the code paths are built and fail closed. Don't spend time on them unless the owner reverses this. Sign-in stays on the two Supabase test-OTP numbers, so onboarding a real store owner or helper means adding their number under Auth → Phone → test OTP in the Supabase dashboard.

### Done
- [x] Scaffold: Next.js 15 + tRPC + Drizzle + Supabase, phone-OTP auth flow (login → verify → home)
- [x] Schema for the whole domain: catalog + append-only `daily_prices`, orders with locked prices, stores, suki ledger (balance kept by DB trigger), routes, inventory. Migration 0000 + RLS/triggers generated
- [x] Owner ordering (the wedge): `catalog.today`, `orders.place` (price locking, suki limit check under `FOR UPDATE`, idempotency key, ledger charge in one transaction), `orders.list`
- [x] Owner UI: catalog browse/search, unit steppers, localStorage cart, confirm sheet with delivery day, `/orders` history
- [x] Dev seed (`drizzle/seed.sql`): Lucena route, 10 products with multi-unit SKUs, today's prices, auto-store per auth user

### Now: make it real
- [x] Wire up a live Supabase project ("Sarihub", ap-southeast-1): all migrations + RLS/storage SQL applied, seeded, phone OTP enabled (test-OTP numbers only — no SMS provider configured yet, see below). Verified live end-to-end for all four roles: owner order+cancel with price lock and suki ledger reversal, buyer price board with real price expiry/carry-over/out-of-stock, admin kanban with forward-only guard and route load, driver stop list with POD + idempotent delivery, plus role-guard and unauthenticated-request enforcement
- [ ] Configure a real SMS provider on the Supabase project so real phone numbers can sign in — currently only two hardcoded test numbers work. Decided on **Twilio**; no app code changes needed (`startPhoneOtp`/`verifyPhoneOtp` in `src/server/services/auth.ts` already call Supabase's generic phone-OTP endpoints). **Parked 2026-11-05** (no paid APIs — see the decision at the top of the roadmap). If that reverses: get the Account SID, Auth Token, and Messaging Service SID (or From number), enable the Philippines under Messaging → Geo permissions, then the remaining work is `supabase link` to the Sarihub project (ref `vxwqearlhoklioatfygc`) and configuring the Twilio provider under Auth → Phone. Watch for PH carrier A2P sender-registration requirements during Twilio setup, or OTPs may get filtered.
- [x] Order detail page for owners (`/orders/[id]`): line items with locked prices, status timeline, cancelled-item display
- [x] Owner order cancellation (only while `submitted`, before route cutoff; charge reversed with a ledger adjustment)

### Next: buyer flow (5 AM palengke)
- [x] Buyer role + route guard (`staff` table, migration 0001; `staffProcedure`/`buyerProcedure` in tRPC, `/buyer` layout redirects owners)
- [x] Daily price entry screen (`/buyer/prices`): today's list, big tap targets, "carry over from yesterday" bulk action, per-unit price edit writes a new `daily_prices` row (never UPDATE)
- [x] Mark unit out-of-stock for today (`unit_stockouts` per Manila day; drives `cancelled_item` on affected submitted orders + recompute totals + ledger adjustment; catalog + `orders.place` refuse the unit for that delivery day)

### Then: admin
- [x] Admin role + `/admin` layout (tablet/laptop; `adminProcedure`, nav: Padala/Katalogo/Suki/Tindahan/Presyo)
- [x] Catalog management (`/admin/catalog`): products + units CRUD incl. activate/deactivate; `weight_grams` per unit (migration 0002) feeds the load check
- [x] Orders kanban (`/admin/orders`): submitted → packed → in_transit → delivered (forward-only, stamps lifecycle timestamps), route filter, per-route load kg vs `capacity_kg` with over-capacity warning
- [x] Suki exposure view (`/admin/suki`): balances vs limits sorted by exposure, record payments (negative `payment` ledger rows), signed adjustments with required reason, per-store ledger trail
- [x] Store management (`/admin/stores`): create store (binds an existing phone-OTP auth user by number), assign route, set suki limit

### Then: driver
- [x] Driver role + today's ordered stop list per route (`/driver`; `stores.stop_order` from migration 0003, settable in `/admin/stores`; route picker skipped when there's one truck)
- [x] Big "Naihatid" button per stop; POD photo + signature pad, best-effort upload to the private `pod` Storage bucket (bucket + policies in 0003 RLS SQL) — a dead zone never blocks the handoff
- [x] Mapbox route view: `stores.lat`/`lng` (migration 0006 + 0007, nullable — set via a click/drag pin picker in `/admin/stores`, `MapPicker` in `src/components/map/`); driver stop list gets a numbered-pin `RouteMap` overview plus a per-stop "Ituro ang daan" (Navigate) link to `https://www.google.com/maps/dir/?api=1&destination=...` (opens the phone's installed Maps/Waze app, no in-app turn-by-turn). Gated on `NEXT_PUBLIC_MAPBOX_TOKEN` (optional, like `SEMAPHORE_API_KEY`) — ships dormant: no token configured yet, so both the admin picker and driver map fall back gracefully (manual lat/lng inputs, no map at all) until Mapbox is set up. Verified live: admin can pin a store via the manual-fallback inputs and it round-trips through the DB correctly; driver's empty-route state renders cleanly with the new query fields. Not yet verified with an actual Mapbox token or a live pinned stop on the driver map (no token configured, and seeding a real order for that path was out of scope for this pass).

### Cross-cutting, schedule when the flows above exist
- [x] SMS via Semaphore: order confirmed, out for delivery, delivered — `notification_queue` table (migration 0005) decouples enqueueing (a local insert inside the same transaction as each status change) from sending (Vercel Cron, `src/app/api/cron/notifications` — daily at 22:00 UTC / 6 AM Manila on the free Hobby plan, which only allows daily crons; back to `*/5 * * * *` on Pro if SMS is ever turned on); `sendSms` (`src/server/services/sms.ts`) fails closed with zero network calls until a real `SEMAPHORE_API_KEY` is configured, so this ships dormant. Exponential backoff (2/4/8/16 min) over 5 total attempts before a row is permanently failed, `(order_id, kind)` unique constraint prevents double-sends across the two independent code paths (`admin.setStatus`, `driver.markDelivered`) that can both land an order on `delivered`. English SMS copy and an admin UI for failed sends are explicitly deferred — see the spec.
- [x] PWA: manifest + SVG icon, `public/sw.js` (network-first navigations with cached-shell fallback, cache-first static assets, `/api` and `/auth` never cached), `/offline` fallback page
- [x] RLS audit for staff roles: staff-wide SELECT policies on stores/orders/items/ledger/prices/catalog via `is_active_staff()` (0003 RLS SQL); writes stay server-side
- [x] Bilingual UI (Tagalog/English): switcher on `/login`, `src/lib/i18n/` dictionaries covering every screen plus server-emitted tRPC/Server Action messages, verified live that the same request returns the right language purely off the `sarihub_lang` cookie. See the i18n paragraph above for the required pattern on new strings.
- [x] Playwright e2e for the money path: login → order → price lock survives a same-day price change, plus the suki ledger round trip on place/cancel (needs the live project)
- [ ] Payments via PayMongo (explicitly later — suki tab is the MVP payment method)

### Monochrome redesign + guest checkout
- [x] Black-and-white, Apple-style design system: tokens in `src/app/globals.css` (black `action` is the only accent; green/amber/red only for status), pill `Button`, `Card`, `Input`, `Logo`/`Wordmark`, `PageHeader`, frosted `.glass` bars. No orange/beige left.
- [x] Guest storefront: `/` and `/home` are public (middleware), `catalog.today` is a `publicProcedure`. Guests browse today's prices and fill the localStorage cart; the cart sheet swaps "Place order" for "Sign in to place order", linking to `/login?next=/home?checkout=1`. `next` is threaded through `/login` → `/verify` (and the dev login) and validated by `safeNext` (`src/lib/safeNext.ts`, same-origin paths only — never redirect to a raw `next`). Returning with `?checkout=1` reopens the cart. Other protected pages redirect to `/login?next=<path>`.
- [x] Admin console responsive: sidebar at `lg`+, glass top bar + bottom tab bar on phones, tables collapse to cards.
- [x] Buyer and driver screens restyled, phone-sized.
- [x] Verified live 2026-11-04: `guest-checkout.spec.ts` and `money-path.spec.ts` pass against the Supabase project. The first live run caught a real bug — coming back from sign-in with `?checkout=1`, the catalog was already in the query cache so the open-cart effect ran before the cart had hydrated from localStorage and never opened the sheet (`useCart` now exposes `hydrated`; the effect waits for it).

### Then: truck crew app + POS (`/crew`)
Spec: `docs/superpowers/specs/2026-11-03-truck-crew-pos-design.md`. Plan: `docs/superpowers/plans/2026-11-03-truck-crew-pos-plan.md`.
- [x] `helper` staff role; `/crew` phone-first app (own layout + four-tab bar) gated to `helper | admin`, linked from the admin menu as "Crew / POS"; `/driver` procedures and layout also accept `helper` so the Deliver tab renders `DriverClient` unchanged
- [x] Pack: today's `submitted` orders in stop order, per-order item checklist, "I-load sa truck" → `submitted → packed` through the shared `advanceOrderStatus` (extracted from the admin kanban into `services/orders.ts`), truck-load kg bar vs `capacity_kg`; "Umalis na ang truck" moves every packed order to `in_transit` (fires the out-for-delivery SMS)
- [x] Stock: append-only `truck_stock_movements` (`load`/`add`/`reduce`/`sale`, migration 0009) per route + Manila day; on-hand is *derived* = movements − delivered order lines, so driver/admin/crew deliveries agree with no coupling; "I-load ang lahat ng order" writes only the per-unit shortfall (idempotent); reduce requires a reason
- [x] Sell (POS): `pos_sales`/`pos_sale_items` with prices locked from `daily_prices` at sale time, idempotency key under an advisory lock, cash or **suki tab** (store picked from a search, limit enforced under `FOR UPDATE`, `charge` ledger row linked via `suki_ledger.pos_sale_id`); every line writes a `sale` stock movement; today's sales list + receipt sheet; client-only sukli calculator
- [x] Owner sees POS charges: `/profile` gains "Galaw ng suki tab" (`store.ledger`, last 30 rows; POS rows read "Binili sa truck"). No SMS for POS sales yet (queue is keyed by order id)
- [x] Admin `/admin/staff`: list, register by phone (owner must have signed in once, refuses a phone that owns a store), change role, (de)activate (never yourself)
- [x] RLS: new tables staff-SELECT via `is_active_staff()`, UPDATE/DELETE revoked (append-only); **the same file enables RLS on `notification_queue`, which 0005 had left readable through PostgREST with the anon key**
- [x] Verified: migration 0009 + all RLS files + seed apply cleanly to a local Postgres; service integration tests (`posSales`, `truckStock`, `orders.advanceOrderStatus`) pass against it; `next build` compiles every route
- [x] Applied to the live Supabase project 2026-11-04: `pnpm db:migrate` (0009 + 0010), `drizzle/0009_truck_crew_pos_rls.sql` and `drizzle/0010_hot_path_indexes_rls.sql` via psql (verified: RLS on the three new tables + `notification_queue`, `recompute_suki_balance` carries the row lock). `tests/e2e/crew-pos.spec.ts` passes live. The host had not resolved earlier only because the free-tier project was **paused** for inactivity (`supabase projects list` shows `INACTIVE`); restore it from the dashboard, then wait for `ACTIVE_HEALTHY`.
- [ ] Creating a real `helper` account: Twilio is parked (see the decision at the top of the roadmap), so add the helper's number as a Supabase test-OTP number, have them sign in once, then register them on `/admin/staff`
- [x] `crew-pos.spec.ts` cleans up after itself (2026-11-04): POS sales have no reversal path by design, so the spec ends the way an admin would — a negative suki adjustment on `/admin/suki` for the charge (asserts the owner's balance is back at baseline) and an `add` movement on `/crew/stock` for the kilo. The `pos_sales` row and the `sale` movement stay as history, so today's sales count and the Benta column still grow by one per run.
- `inventory_snapshots` / `inventory_snapshot_items` (migration 0000) are unused and superseded by `truck_stock_movements`; left in place because dropping is a destructive migration

### Hardening pass (shipped with the crew app, 2026-11-03)
Two read-only audits (correctness + performance) ran over the whole app before the crew work; the findings worth acting on landed on the same branch:
- [x] **Suki balance cache lost update** (`drizzle/0010_hot_path_indexes_rls.sql`): `recompute_suki_balance()` now takes the store row lock in its own statement before summing, so an admin payment overlapping an owner's order can't write a balance that misses the order's charge
- [x] **Hot-path indexes** (migration 0010): `orders(store_id, created_at)`, `orders(deliver_on, route_id, status)`, `order_items(order_id)`, `order_items(product_unit_id)`, `suki_ledger(store_id)` — the balance trigger and every board/stop/stock query were sequential scans
- [x] **Order idempotency**: the lookup is scoped to the caller's store, guarded by an advisory lock on the key (two in-flight submits no longer 500), a key taken by another store is a clean `stale_key`/CONFLICT the cart answers by rotating its key, and the cart retires its key on a successful place (not only when the success sheet is dismissed) so tomorrow's cart can't be echoed yesterday's order
- [x] Cancelling an order (owner or stockout auto-cancel) now deletes any *unsent* queued SMS, not only `pending` — a "confirmed" text waiting on a retry no longer goes out after cancellation
- [x] `driver.markDelivered` only accepts an order whose `deliver_on` is today and POD paths under the order's own folder
- [x] Store-facing text (SMS copy, ledger reasons, auto-cancel reason) renders in the default locale, never the staff member's UI language
- [x] One `getUser()` + one staff lookup per request (`React.cache` in `services/auth.ts`); `loading.tsx` skeletons for every area; `catalog.today` runs its lookups in parallel; `buyer.priceBoard` bounds its price-history window to 30 days; Vercel functions pinned to `sin1` next to the database; DB pool capped per instance
- [x] Driver POD uploads run in parallel under stable paths and a failed mutation retries without re-uploading; order detail retries transient errors instead of showing "not found"; focus/reconnect refetch re-enabled; pinch-zoom allowed; sub-44px controls raised
- [x] Service worker caches only the landing shells (never order detail, ledger or admin pages), bumps its cache version, and clears all caches on sign-out (shared phones)
- [x] Zod messages in `src/lib/schemas/*` are dictionary keys (`validation.*`), translated on both the form side and the tRPC side (2026-11-04) — see the i18n paragraph under Project Structure for the pattern
- [x] `buyer.markOutOfStock` follows the order cutoff (owner's call, 2026-11-05): `stockoutDay` = the day the next truck rides (`nextTruckDay` in `~/lib/deliverySchedule`, earliest across routes) — before the cutoff that's today, at 9 PM it's tomorrow, the day owners are ordering for. The price board returns `stockoutDay`, and the badge/confirm name the date when it isn't today
- [x] Optimistic kanban/driver buttons (2026-11-05): `admin.orders.setStatus` moves the card to the next column in `onMutate` and rolls back on error (the card remounts in the other column, so the refused move shows as a board-level alert); `driver.markDelivered` ticks the stop off the moment the driver taps done and un-ticks with the error under the button if the server refuses — the mutation and the "already uploaded" POD paths now live in `StopCard`, not the sheet, so they survive the sheet closing. Pure cache updates in `~/lib/optimistic` (unit-tested); both queries still invalidate on settle so the server's answer wins
- [x] Offline price list (2026-11-05): `PersistQueryClientProvider` + a localStorage persister (`~/lib/queryPersist`, superjson so centavo bigints and `pricedAt` survive) keeps **only** `catalog.today` on the phone for 24h; `/home` shows the cached list with a "Walang signal — presyo noong …" status line when the refetch fails, and a real error only with no cache at all. Nothing else (balances, orders, staff boards) is ever persisted. `tests/e2e/offline-catalog.spec.ts` covers it
- [x] CSV import runs as six set-based statements in one transaction regardless of row count (2026-11-05): products lookup/insert/category update, units lookup/insert, one prices insert. Rows are validated first and reported as skipped as before; a database error now rolls the whole upload back instead of leaving half of it in. `catalogImport.integration.test.ts` covers create/update/idempotent units

### Deferred from the bilingual UI work (low priority, not blocking anything)
- [x] A language switcher reachable after login — shipped as part of the
  Apple/SwiftUI redesign's `/profile` page (07fd1cd), reachable from every
  role's nav (owner tab bar, admin sidebar, buyer/driver header). Verified
  live: switching on `/profile` re-renders server-rendered chrome and
  catalog copy immediately and persists across navigation and across owner
  and staff sessions via the `sarihub_lang` cookie.
- [x] Translate DB-sourced free text: `products.category` converted to a real Postgres enum (mirroring `products.source`) with bilingual dictionary labels (`productCategories` in `src/lib/i18n/dictionaries/`). Store/owner/route names remain untranslated by design (proper nouns). Note: category display order (owner catalog, buyer price board, admin catalog list) is now the enum's declaration order — `gulay, itlog, isda, kusina` — not alphabetical, and changing that order requires a new migration, not a config edit.
- [x] Real Filipino/Tagalog date formatting — hand-rolled `date-fns` `Locale` object (`fil` in `src/lib/i18n/tagalogDateLocale.ts`) overriding only `localize.month`/`localize.day` on top of `enUS`; `formatManila`/`formatManilaDate`/`formatManilaTime` (`~/lib/datetime`) gained an optional `locale?: Locale` param threaded through all human-display call sites in the 7 owner/staff client components. `formatLong`, ordinal rules, and `formatDistance`/`formatRelative` were deliberately left unbuilt — nothing in the app uses those tokens, and extending the `fil` object later is additive if that changes. Day-key formatting (`yyyy-MM-dd`, server-side) stays locale-invariant by design.
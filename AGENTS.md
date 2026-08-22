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
| Admin | Tablet or laptop, well-lit office | Dispatching trucks, watching suki exposure, managing the catalog | Kanban board, route load check, daily price entry table |

If you're writing code that doesn't serve one of these four users, you're writing the wrong code.

## Tech stack (canonical)

- **Framework**: Next.js 15, App Router. One repo, one deploy.
- **Language**: TypeScript everywhere. No `any` without a `// TODO(reason)` comment.
- **Styling**: Tailwind CSS + shadcn/ui. No CSS-in-JS, no styled-components.
- **API layer**: tRPC. Procedures live under `src/server/routers/`. Server Actions are fine for form submissions; tRPC for everything queried from the client.
- **Database**: Postgres on Supabase. Migrations in `supabase/migrations/`. Use the Supabase CLI, never edit the schema from the dashboard for anything that ships.
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
                        orders (owner order history), api/trpc/[trpc]
  components/ui/        Shared primitives (Button, Input, Logo)
  lib/                  Client-safe helpers: format (peso/phone), datetime (Manila tz),
                        deliverySchedule (cutoff + weekday bitmask), useCart, schemas/ (zod,
                        shared by forms and tRPC inputs), supabase/, trpc/, i18n/ (dictionaries,
                        LanguageProvider, getServerLocale — see below)
  server/
    db/schema/          Drizzle schema, one file per domain
    routers/            tRPC routers (catalog, store, orders)
    services/           Business logic the routers stay thin over (auth, orders)
    trpc/               init (context, procedures) + root router
drizzle/                Generated migrations + RLS/trigger SQL + seed.sql
```

Money is integer centavos (`bigint`) end to end. `now()` comes from `~/lib/datetime`, never `new Date()`. Tagalog-first copy in every user-facing string — but the app is bilingual (Tagalog/English) via a switcher on `/login`, so **every new user-facing string, including server-emitted tRPC/Server Action error messages, must go through `src/lib/i18n/dictionaries/{tl,en}.ts`**, never a hardcoded literal. Add the key to `tl.ts` first (canonical), then `en.ts` (TypeScript enforces the same shape). Client components read strings via `useDictionary()`/`useLocale()` from `~/lib/i18n/LanguageProvider`; Server Components and services via `getDictionary(await getServerLocale())`, threading `Locale` down as a parameter the same way `Db`/`userId` are threaded. Use `interpolate(template, vars)` for any string with a dynamic value. DB-sourced content (product names — already dual `nameTl`/`nameEn`, categories, store/owner/route names) is explicitly out of scope for the toggle; see the dictionaries' file comments for why.

## Roadmap / to-do

Work top-to-bottom; each unchecked block is roughly one PR-sized slice. Check items off as they land.

### Done
- [x] Scaffold: Next.js 15 + tRPC + Drizzle + Supabase, phone-OTP auth flow (login → verify → home)
- [x] Schema for the whole domain: catalog + append-only `daily_prices`, orders with locked prices, stores, suki ledger (balance kept by DB trigger), routes, inventory. Migration 0000 + RLS/triggers generated
- [x] Owner ordering (the wedge): `catalog.today`, `orders.place` (price locking, suki limit check under `FOR UPDATE`, idempotency key, ledger charge in one transaction), `orders.list`
- [x] Owner UI: catalog browse/search, unit steppers, localStorage cart, confirm sheet with delivery day, `/orders` history
- [x] Dev seed (`drizzle/seed.sql`): Lucena route, 10 products with multi-unit SKUs, today's prices, auto-store per auth user

### Now: make it real
- [x] Wire up a live Supabase project ("Sarihub", ap-southeast-1): all migrations + RLS/storage SQL applied, seeded, phone OTP enabled (test-OTP numbers only — no SMS provider configured yet, see below). Verified live end-to-end for all four roles: owner order+cancel with price lock and suki ledger reversal, buyer price board with real price expiry/carry-over/out-of-stock, admin kanban with forward-only guard and route load, driver stop list with POD + idempotent delivery, plus role-guard and unauthenticated-request enforcement
- [ ] Configure a real SMS provider on the Supabase project so real phone numbers can sign in — currently only two hardcoded test numbers work. Decided on **Twilio**; no app code changes needed (`startPhoneOtp`/`verifyPhoneOtp` in `src/server/services/auth.ts` already call Supabase's generic phone-OTP endpoints). In progress: user is signing up for a Twilio account and provisioning a phone number/Messaging Service — once the Account SID, Auth Token, and Messaging Service SID (or From number) are in hand, remaining work is `supabase link` to the Sarihub project (ref `vxwqearlhoklioatfygc`) and configuring the Twilio provider under Auth → Phone. Watch for PH carrier A2P sender-registration requirements during Twilio setup, or OTPs may get filtered.
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
- [x] SMS via Semaphore: order confirmed, out for delivery, delivered — `notification_queue` table (migration 0005) decouples enqueueing (a local insert inside the same transaction as each status change) from sending (Vercel Cron polling every 5 min, `src/app/api/cron/notifications`); `sendSms` (`src/server/services/sms.ts`) fails closed with zero network calls until a real `SEMAPHORE_API_KEY` is configured, so this ships dormant. Exponential backoff (2/4/8/16 min) over 5 total attempts before a row is permanently failed, `(order_id, kind)` unique constraint prevents double-sends across the two independent code paths (`admin.setStatus`, `driver.markDelivered`) that can both land an order on `delivered`. English SMS copy and an admin UI for failed sends are explicitly deferred — see the spec.
- [x] PWA: manifest + SVG icon, `public/sw.js` (network-first navigations with cached-shell fallback, cache-first static assets, `/api` and `/auth` never cached), `/offline` fallback page
- [x] RLS audit for staff roles: staff-wide SELECT policies on stores/orders/items/ledger/prices/catalog via `is_active_staff()` (0003 RLS SQL); writes stay server-side
- [x] Bilingual UI (Tagalog/English): switcher on `/login`, `src/lib/i18n/` dictionaries covering every screen plus server-emitted tRPC/Server Action messages, verified live that the same request returns the right language purely off the `sarihub_lang` cookie. See the i18n paragraph above for the required pattern on new strings.
- [x] Playwright e2e for the money path: login → order → price lock survives a same-day price change, plus the suki ledger round trip on place/cancel (needs the live project)
- [ ] Payments via PayMongo (explicitly later — suki tab is the MVP payment method)

### Deferred from the bilingual UI work (low priority, not blocking anything)
- [x] A language switcher reachable after login — shipped as part of the
  Apple/SwiftUI redesign's `/profile` page (07fd1cd), reachable from every
  role's nav (owner tab bar, admin sidebar, buyer/driver header). Verified
  live: switching on `/profile` re-renders server-rendered chrome and
  catalog copy immediately and persists across navigation and across owner
  and staff sessions via the `sarihub_lang` cookie.
- [x] Translate DB-sourced free text: `products.category` converted to a real Postgres enum (mirroring `products.source`) with bilingual dictionary labels (`productCategories` in `src/lib/i18n/dictionaries/`). Store/owner/route names remain untranslated by design (proper nouns). Note: category display order (owner catalog, buyer price board, admin catalog list) is now the enum's declaration order — `gulay, itlog, isda, kusina` — not alphabetical, and changing that order requires a new migration, not a config edit.
- [x] Real Filipino/Tagalog date formatting — hand-rolled `date-fns` `Locale` object (`fil` in `src/lib/i18n/tagalogDateLocale.ts`) overriding only `localize.month`/`localize.day` on top of `enUS`; `formatManila`/`formatManilaDate`/`formatManilaTime` (`~/lib/datetime`) gained an optional `locale?: Locale` param threaded through all human-display call sites in the 7 owner/staff client components. `formatLong`, ordinal rules, and `formatDistance`/`formatRelative` were deliberately left unbuilt — nothing in the app uses those tokens, and extending the `fil` object later is additive if that changes. Day-key formatting (`yyyy-MM-dd`, server-side) stays locale-invariant by design.
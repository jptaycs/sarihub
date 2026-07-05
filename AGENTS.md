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
                        shared by forms and tRPC inputs), supabase/, trpc/
  server/
    db/schema/          Drizzle schema, one file per domain
    routers/            tRPC routers (catalog, store, orders)
    services/           Business logic the routers stay thin over (auth, orders)
    trpc/               init (context, procedures) + root router
drizzle/                Generated migrations + RLS/trigger SQL + seed.sql
```

Money is integer centavos (`bigint`) end to end. `now()` comes from `~/lib/datetime`, never `new Date()`. Tagalog-first copy in every user-facing string.

## Roadmap / to-do

Work top-to-bottom; each unchecked block is roughly one PR-sized slice. Check items off as they land.

### Done
- [x] Scaffold: Next.js 15 + tRPC + Drizzle + Supabase, phone-OTP auth flow (login → verify → home)
- [x] Schema for the whole domain: catalog + append-only `daily_prices`, orders with locked prices, stores, suki ledger (balance kept by DB trigger), routes, inventory. Migration 0000 + RLS/triggers generated
- [x] Owner ordering (the wedge): `catalog.today`, `orders.place` (price locking, suki limit check under `FOR UPDATE`, idempotency key, ledger charge in one transaction), `orders.list`
- [x] Owner UI: catalog browse/search, unit steppers, localStorage cart, confirm sheet with delivery day, `/orders` history
- [x] Dev seed (`drizzle/seed.sql`): Lucena route, 10 products with multi-unit SKUs, today's prices, auto-store per auth user

### Now: make it real
- [ ] Wire up a live Supabase project: `.env` from `.env.example`, apply migration 0000 + RLS SQL, run seed, verify login → browse → order end-to-end on a phone
- [ ] Order detail page for owners (`/orders/[id]`): line items with locked prices, status timeline, cancelled-item display
- [ ] Owner order cancellation (only while `submitted`, before route cutoff)

### Next: buyer flow (5 AM palengke)
- [ ] Buyer role + route guard (staff table or role claim; owners must not see buyer screens)
- [ ] Daily price entry screen: today's list, big tap targets, "carry over from yesterday" bulk action, per-unit price edit writes a new `daily_prices` row (never UPDATE)
- [ ] Mark unit out-of-stock for today (drives `cancelled_item` on affected submitted orders + recompute totals)

### Then: admin
- [ ] Admin role + `/admin` layout (tablet/laptop)
- [ ] Catalog management: products + units CRUD, activate/deactivate
- [ ] Orders kanban: submitted → packed → in_transit → delivered, per route, with route load total vs `capacity_kg`
- [ ] Suki exposure view: balances vs limits, record payments (ledger `payment` rows), adjustment entries with reason
- [ ] Store management: create store, assign route, set suki limit

### Then: driver
- [ ] Driver role + today's ordered stop list per route
- [ ] Big "Naihatid" button per stop; POD photo (Supabase Storage) + signature pad for suki
- [ ] Mapbox route view (last — the stop list works without it)

### Cross-cutting, schedule when the flows above exist
- [ ] SMS via Semaphore: order confirmed, out for delivery, delivered (queue + retry, don't block the mutation)
- [ ] PWA: manifest, icons, service worker; offline shell for owner browse and buyer price entry
- [ ] RLS audit once buyer/admin/driver roles exist (current policies assume owner-only access)
- [ ] Playwright e2e for the money path: login → order → price lock survives a next-day price change
- [ ] Payments via PayMongo (explicitly later — suki tab is the MVP payment method)
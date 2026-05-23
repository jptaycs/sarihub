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
# Truck crew app: packing, truck stock, and walk-up POS

## Why

The distributor's truck carries two people: the driver (already has `/driver`)
and the **truck helper** ("kasama" / kargador). The helper is the person who
actually touches the goods: packs each order at the depot before 6 AM, loads
the truck, hands goods over at each stop, and — this is the new part the
owner asked for — **sells straight off the truck** to walk-up customers and
to stores that want more than they ordered. Today nothing records those
sales, so the helper's cash and the leftover stock are untracked, and the
helper has no screen at all.

The design prototype in `sarihub-design-prototype/crew-app.jsx` already
sketches a "Truck crew" app with a Pack mode and a Deliver mode. This spec
builds that, and adds the two things the owner asked for: **stocking**
(what's on the truck, add/reduce) and **selling** (a POS).

The request, in the owner's words: "a POS for the operator of delivery man
that will manage the selling and stocking … the truck helper will click
orders … he must add and reduce item when there is a sales … the truck
helper in a different app, under the admin app."

## Who this serves

| User | Device | Moment | Needs |
|---|---|---|---|
| Truck helper (new `helper` role) | Phone, wet/gloved hands, 5 AM depot then passenger seat | Pack orders, load truck, sell off the truck, hand over at stops | Big tap targets, one screen per job, nothing that needs typing except a cash amount |
| Admin | Laptop or phone | Create helper accounts, check today's truck sales/stock | A staff page, a link to the crew app, sales visible on the suki ledger |

## Goals

1. A `/crew` app for the `helper` role (admins can also open it) with four
   jobs: **Pack**, **Stock**, **Sell**, **Deliver**.
2. Truck stock is a per-route, per-day ledger: load, add, reduce, and every
   sale/delivery subtracts from it. On-hand is derived, never hand-edited.
3. Walk-up sales lock today's price exactly like orders do, support **cash**
   or **suki tab**, and post to the same append-only suki ledger.
4. Admin can create staff (any role, including `helper`) from `/admin/staff`
   instead of SQL.
5. Everything bilingual and phone-first, matching the monochrome design
   system.

## Non-goals

- GCash / PayMongo payments (the prototype shows a GCash pill; still deferred
  per AGENTS.md).
- Cash drawer reconciliation / shift close-out. The Stock screen shows cash
  collected today; that's the whole "end of day" for v1.
- Returns to the depot of unsold goods. On-hand simply carries what's left;
  tomorrow starts a fresh day ledger.
- Editing or voiding a sale. A mistake is corrected with an **adjust**
  movement on stock and an admin suki adjustment on money, both already
  existing patterns. (Anti-goal: never UPDATE/DELETE a sale or ledger row.)
- Offline queueing of sales. Same stance as POD: patchy 4G retries with an
  idempotency key; a dead zone shows the error and the helper retries.

## Anti-goals (would make this a failure even if it works)

- Turning stock into a general inventory system (reorder points, warehouses,
  FIFO costing). It is one truck, one morning.
- Letting on-hand be typed over. If the count is wrong, you record *why*
  (an adjust movement with a reason).
- A second price source. The POS reads the same `daily_prices` row the
  owner app does.

## Decisions made (all mine unless marked "owner said")

### Role and routing
- **Owner said**: helper is a separate app from the store owner's, "under
  the admin app". **My call**: a new `staff_role` value `helper`, a new
  `/crew` route group with its own phone-first layout and bottom tab bar,
  gated to `helper | admin`. It is linked from the admin sidebar/menu as
  "Crew / POS", and admins can operate it fully. It is *not* nested inside
  the `/admin` layout because that layout's chrome (sidebar, kanban links)
  is wrong for a phone in a moving truck, and a helper must not see admin
  navigation.
- `/driver` procedures and layout widen to `driver | helper | admin` so the
  Deliver tab reuses the existing driver stop list unchanged.
- The `(owner)` layout redirects `helper` → `/crew` like other staff.

### Route and day
- The crew app works on **one route for today**. Route choice: if there is
  exactly one route, it is implicit; otherwise a pill picker, remembered in
  `localStorage` for the session. "Today" is the Manila day, same helper as
  `/driver` and `/admin/orders`.

### Pack (I-pack)
- Queue = today's `submitted` orders for the route, in stop order. Tapping an
  order shows its item checklist (local state only — the checks are a
  memory aid). "I-load sa truck" moves the order `submitted → packed` through
  the existing forward-only transition (same code path admin uses, so the
  kanban and the packed timestamp agree). A truck-load bar shows kg packed vs
  `routes.capacity_kg`, reusing the admin board's weight math.

### Stock (Paninda)
- New table `truck_stock_movements`: `(route_id, stock_on date, product_unit_id, kind, quantity, reason, pos_sale_id, created_by, created_at)`. Kinds: `load`, `add`, `reduce`, `sale`. Quantity is always positive; the kind gives the sign (`load`/`add` in, `reduce`/`sale` out). **Append-only**, same stance as the suki ledger.
- The Stock screen lists every active unit with: **Kailangan** (needed = sum of today's non-cancelled order lines on this route), **Nakarga** (loaded + added − reduced), **Nabenta** (POS sales), **Naihatid** (delivered order lines, derived from orders with status `delivered`/`settled` today on this route), **Natitira** (on hand = nakarga − nabenta − naihatid). Deliveries are *derived from orders*, not written as movements, so marking delivered from `/driver`, `/admin/orders`, or `/crew/deliver` all agree with zero extra coupling.
- Actions: "I-load ang lahat ng order" (one tap: writes a `load` movement per unit equal to needed − already loaded, only for units with a shortfall), per-unit stepper that writes `add`/`reduce` movements (reduce requires a reason chip: *nabulok / nasira / mali ang bilang / iba pa*). On-hand may go negative (e.g. helper sold before loading); it is shown in red, never blocked — a blocked sale at a store's door is worse than a stock mismatch the admin can see.
- Header shows **cash collected today** and **sales count** (the "day summary").

### Sell (Benta)
- New tables `pos_sales` and `pos_sale_items`, mirroring `orders`/`order_items`: locked unit price and line total at sale time, idempotency key, `payment` enum `cash | suki`, optional `store_id` (null = walk-in; walk-in may carry a free-text `customer_name`), `sold_by` staff user, `route_id`, `sold_on` Manila date.
- Flow: catalog with search + category pills + steppers (same components as the owner catalog, pulled from `catalog.today`, with no-price units unorderable). Cart sheet → pick customer (search registered stores by name/owner/phone, or "Walk-in") → payment: **Cash** (default for walk-in; disabled for nothing) or **Suki tab** (only when a store is picked). Confirm.
- Server (`services/posSales.ts`, one transaction): re-read live prices and lock them; if suki, `FOR UPDATE` the store row and enforce `limit − balance ≥ total` exactly like `placeOrder`; insert sale + items; insert `sale` stock movements; if suki, insert a `charge` ledger row linked by a new nullable `suki_ledger.pos_sale_id` column; idempotency key makes a retried submit return the original sale.
- Cash sales write **no** ledger row (cash changes hands; the tab is untouched).
- "Benta ngayon" list under the cart: today's sales on this route, newest first, with a per-sale receipt sheet.

### Deliver (I-deliver)
- Renders the existing `DriverClient` component inside the crew layout. No new code beyond widening the role guard.

### Admin: staff page
- `/admin/staff`: list staff (name, phone, role, active), create staff by phone (same "owner must have signed in once" binding as stores; refuses a phone that owns a store), change role, deactivate/reactivate. The existing `profile` page learns the `helper` role label.
- Admin nav gains "Staff" in the main sections and "Crew / POS" in the extras.

### Security
- `truck_stock_movements`, `pos_sales`, `pos_sale_items` ship with a paired `_rls.sql`: RLS enabled, staff-wide SELECT via `is_active_staff()`, no write policies (server-only writes), `updated_at` triggers where the table has the column, and `REVOKE UPDATE, DELETE` on the movements table and sale tables (append-only).
- The same file **enables RLS on `notification_queue`**, which migration 0005 left exposed to PostgREST with the anon key (it holds store phone numbers and message text). No policy is added; the server talks to Postgres directly.
- The unused `inventory_snapshots` / `inventory_snapshot_items` tables stay (additive migration only); AGENTS.md notes they are superseded.

### Copy
- New dictionary sections `crew` and `admin.staff`, plus `profile.roleHelper` and nav labels, in `tl.ts` first then `en.ts`.

## What's left to the builder

- Exact zod shapes (`src/lib/schemas/crew.ts`), following the admin/order precedents (quantities `int 1..999`, max 60 lines per sale, idempotency `uuid`).
- Whether Pack's checklist persists across a refresh (`localStorage` keyed by order id is fine; not required).
- Component split inside `src/app/crew/`; reuse `AdminSheet`-style sheets and the owner `Stepper` by lifting it into `src/components/ui/`.
- Unit tests for the pure parts: on-hand arithmetic (`truckStockMath.ts`) and the load-shortfall computation. DB paths are verified live through Playwright, per repo convention.

## Verification

- `pnpm typecheck && pnpm lint && pnpm test` green.
- Migration applied to the live Supabase project; `drizzle/seed.sql` gains a commented helper-promotion snippet.
- Live walkthrough as the dev admin account: pack an order, load from orders, sell one cash item and one suki item to the dev owner's store, confirm the owner's suki balance moved and the Stock screen's on-hand dropped, deliver via the Deliver tab, confirm Naihatid subtracts.
- A Playwright spec `tests/e2e/crew-pos.spec.ts` covering the suki-sale money round trip.

## Builder-check answers (my calls; the owner was not available)

1. **Owners see suki POS charges.** A suki sale at the door raises the
   owner's balance, so the owner app must show why. `/profile` gains a
   "Galaw ng suki tab" list (owner's own ledger, newest 30 rows) where POS
   charges read "Binili sa truck" with the sale total. No SMS for POS sales
   in v1 (the queue is keyed by order id; extending it is a later slice).
2. **Helper accounts can't be created on the live project yet** — only the
   two test-OTP numbers can sign in and both are taken. `/admin/staff` ships
   and is live-verified for list/edit; the full `helper`-role walkthrough is
   done as the dev admin (who can open `/crew`). Creating a real helper is
   unblocked by the Twilio item already on the roadmap.
3. **Cash tendered / sukli** is a client-only calculator on the cash confirm
   step (optional field, not stored). "Cash today" = sum of cash sale totals.
4. **Departure.** When every order on the route is packed, the Pack screen
   offers "Umalis na ang truck", which moves all `packed` orders on the
   route to `in_transit` (stamps `in_transit_at`, enqueues the
   out-for-delivery SMS). To make this and `packOrder` share the admin
   kanban's rules, the forward-only transition moves from
   `routers/admin.ts` into `services/orders.ts` as `advanceOrderStatus`.
5. **Customer search** returns any registered store, with this route's
   stores listed first. Stock always comes off the truck the helper is on.

Also corrected: migrations live in `drizzle/` (AGENTS.md's
`supabase/migrations/` line is stale and is fixed in the docs task).

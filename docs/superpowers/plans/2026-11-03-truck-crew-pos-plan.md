# Truck Crew App (Pack · Stock · Sell · Deliver) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the truck helper a phone-first `/crew` app to pack today's orders, track truck stock as an append-only ledger, sell off the truck (cash or suki tab) at locked daily prices, and hand over deliveries; give admins a staff page to create helpers.

**Architecture:** New `helper` staff role and `/crew` route group (own layout + bottom tabs) gated to `helper | admin`. Three new tables (`truck_stock_movements`, `pos_sales`, `pos_sale_items`) plus a nullable `suki_ledger.pos_sale_id`. Business logic in `src/server/services/{truckStock,posSales}.ts` with pure arithmetic in `truckStockMath.ts`; thin `crew` tRPC router. On-hand stock is derived: movements minus delivered order lines. Deliver tab reuses `DriverClient`.

**Tech Stack:** Next.js 15 App Router, TypeScript, tRPC v11, Drizzle + postgres-js on Supabase Postgres, zod + react-hook-form, Tailwind v4, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-truck-crew-pos-design.md`

## Global Constraints

- Money is integer centavos (`bigint` in DB, `centavos()` helper), never floats; `now()` from `~/lib/datetime`, never `new Date()`.
- Every user-facing string, including tRPC error messages, goes in `src/lib/i18n/dictionaries/tl.ts` first then `en.ts` (same shape, enforced by `dictionaries.test.ts`). Client: `useDictionary()`; server: `getDictionary(ctx.locale)`; dynamic values via `interpolate`.
- No `any` without `// TODO(reason)`. Append-only: never UPDATE/DELETE `suki_ledger`, `truck_stock_movements`, `pos_sales`, `pos_sale_items`.
- "Today" = Manila day (`formatManila(now(), "yyyy-MM-dd")`), day start instant via `fromManila(new Date(`${day}T00:00:00`))` as in `routers/driver.ts`.
- Routers stay thin over services; services take `(db, ...)` and return `{ ok: true | false, reason, message }` unions like `placeOrder`.
- Migrations are generated with `pnpm db:generate`; RLS/trigger SQL ships in a paired `_rls.sql` file; `is_active_staff()` and `set_updated_at()` already exist.
- Design system: monochrome tokens in `globals.css`; `Button`, `Card`, `Input`, `.glass`, `h-tap` (48px) tap targets; sheets follow `AdminSheet`/`SheetShell`.
- `pnpm typecheck && pnpm lint && pnpm test` must be green at every commit.

## Review Focus

1. A retried POS submit (double-tap on 4G) must return the original sale, not post a second ledger charge or second stock movement — pinned by the idempotency test in Task 5 and the e2e in Task 13.
2. A suki sale that would exceed `limit − balance` must be refused with the remaining room in the message, under `FOR UPDATE` — Task 5.
3. Selling a unit with no live price today must be refused (`no_price_today`), never priced at 0 — Task 5.
4. On-hand must count delivered order lines only for *this route and this Manila day* and skip `cancelled_item` lines — Task 4 (math test) and Task 6 (query).
5. "Load from orders" run twice must not double-load: it writes only the shortfall per unit — Task 4 math test, Task 6.

---

### Task 1: Schema + migration + RLS

**Files:**
- Modify: `src/server/db/schema/staff.ts` (enum gains `"helper"`)
- Create: `src/server/db/schema/pos.ts`
- Modify: `src/server/db/schema/suki.ts` (add `posSaleId`)
- Modify: `src/server/db/schema/index.ts` (export pos)
- Create: `drizzle/0010_truck_crew_pos.sql` (generated, renamed) + `drizzle/0010_truck_crew_pos_rls.sql` (hand-written) + `drizzle/meta/0010_snapshot.json`, journal entry
- Modify: `drizzle/seed.sql` (commented helper-promotion snippet)

**Interfaces:**
- Produces: `staffRole` enum values `["buyer","admin","driver","helper"]`; `posPayment = pgEnum("pos_payment", ["cash","suki"])`; `truckStockKind = pgEnum("truck_stock_kind", ["load","add","reduce","sale"])`; tables `posSales` (id, routeId, storeId nullable, customerName text nullable, payment, totalCentavos, soldOn date, idempotencyKey varchar(64) unique, soldBy uuid, timestamps), `posSaleItems` (id, saleId cascade, productId restrict, productUnitId restrict, quantity int, lockedUnitPriceCentavos, lockedTotalCentavos, createdAt), `truckStockMovements` (id, routeId cascade, stockOn date, productUnitId restrict, kind, quantity int, reason text nullable, posSaleId nullable set null, createdBy uuid, createdAt; index on (routeId, stockOn)); `sukiLedger.posSaleId` uuid nullable → posSales set null. Types `PosSale`, `PosSaleItem`, `TruckStockMovement`, `TruckStockKind`, `PosPayment`.

- [ ] **Step 1: Edit the schema files** per Interfaces. `pos.ts` imports `routes`, `stores`, `productUnits`, `products`; `suki.ts` imports `posSales` from `./pos`.
- [ ] **Step 2: Generate** `pnpm db:generate --name truck_crew_pos`. Rename the output `drizzle/0009_truck_crew_pos.sql` → `0010_truck_crew_pos.sql` and `meta/0009_snapshot.json` → `meta/0010_snapshot.json`, set the journal entry's `tag` to `0010_truck_crew_pos` (file `0009_stores_owner_update_rls_fix.sql` is hand-applied and not journaled; avoid two 0009 prefixes). Confirm the SQL contains `ALTER TYPE "public"."staff_role" ADD VALUE 'helper'` and the three tables.
- [ ] **Step 3: Write `drizzle/0010_truck_crew_pos_rls.sql`**: `set_updated_at` trigger on `pos_sales`; `ENABLE ROW LEVEL SECURITY` on the three new tables **and on `notification_queue`** (0005 left it exposed; no policy, server-only); staff SELECT policies via `is_active_staff()` on the three tables; `REVOKE UPDATE, DELETE ON truck_stock_movements, pos_sales, pos_sale_items FROM PUBLIC, authenticated`.
- [ ] **Step 4: Seed snippet**: append to `drizzle/seed.sql` a commented `INSERT INTO staff ... role 'helper'` block mirroring the buyer one.
- [ ] **Step 5: Verify** `pnpm typecheck` passes. Commit: `feat(db): helper role, truck stock ledger, POS sales tables`.

### Task 2: Dictionaries

**Files:**
- Modify: `src/lib/i18n/dictionaries/tl.ts`, `src/lib/i18n/dictionaries/en.ts`

**Interfaces:**
- Produces keys: `common.errors.crewOnly`; `nav.crew`; `profile.roleHelper`; `admin.nav.staff`, `admin.nav.crew`; `admin.staff.{title,newStaff,newStaffHint,empty,name,mobile,role,active,inactive,roleBuyer,roleAdmin,roleDriver,roleHelper,register,save,saving,cancel,deactivate,reactivate,edit,editHeading,mobileNote}`; `admin.errors.{staffNotFound,phoneIsOwner,staffAlreadyExists,cannotDeactivateSelf}`; `crew.{title,tabPack,tabStock,tabSell,tabDeliver,pickRoute,routeProgress}`; `crew.pack.{title,empty,allPacked,queueStop,itemsChecked,loadButton,shortButton,confirmHeading,confirmBody,confirmYes,confirmNo,loadKg,overCapacity,packing}`; `crew.stock.{title,cashToday,salesToday,loadAllButton,loadAllDone,loadAllNothing,colNeeded,colLoaded,colSold,colDelivered,colOnHand,addAria,reduceAria,reduceHeading,reduceReasonLabel,reasonSpoiled,reasonDamaged,reasonMiscount,reasonOther,reasonOtherPlaceholder,confirmReduce,cancel,saving,negativeNote,empty}`; `crew.sell.{title,searchPlaceholder,cartButtonOne,cartButtonOther,cartTitle,customerLabel,walkIn,walkInNamePlaceholder,pickStore,storeSearchPlaceholder,noStoreFound,paymentLabel,payCash,paySuki,sukiNeedsStore,sukiRoom,tenderedLabel,changeLabel,total,confirmButton,selling,soldTitle,soldSubtitleCash,soldSubtitleSuki,ok,recentHeading,recentEmpty,receiptTitle,receiptWalkIn,receiptCash,receiptSuki,ledgerReason,noPrice,outOfStock}`; `crew.pack.{departButton,departConfirm,departYes,departNo,departed}`; `profile.{ledgerHeading,ledgerEmpty,ledgerCharge,ledgerPos,ledgerPayment,ledgerAdjustment}`; `crew.errors.{unknownItem,noPriceToday,storeNotFound,sukiNeedsStore,overSukiLimit,unknownUnit,notPackable,routeNotFound,orderNotFound,emptySale}`.
- Values: Tagalog-first; the Review Focus error `overSukiLimit` reads `"Lampas sa suki limit ng tindahan. Natitira pang {available}."`.

- [ ] **Step 1: Add the `crew`, `admin.staff` sections and the scattered keys to `tl.ts`**, then mirror in `en.ts`.
- [ ] **Step 2: Run** `pnpm test src/lib/i18n` → PASS (identical key shapes). Commit: `i18n: crew app, staff admin, helper role copy`.

### Task 2b: Shared order transition service

**Files:**
- Modify: `src/server/services/orders.ts` (add `advanceOrderStatus`), `src/server/routers/admin.ts` (`setStatus` delegates)

**Interfaces:**
- Produces:
  ```ts
  export type OrderTarget = "packed" | "in_transit" | "delivered";
  export type AdvanceResult = { ok: true; orderId: string; status: OrderTarget; alreadyThere: boolean } | { ok: false; reason: "not_found" | "bad_transition"; message: string; from?: string };
  export async function advanceOrderStatus(tx: Tx, orderId: string, target: OrderTarget, locale: Locale): Promise<AdvanceResult>
  ```
  `Tx` = the transaction type used inside `placeOrder`. Behaviour = today's inline `setStatus` body: `FOR UPDATE`, `STATUS_TRANSITIONS` table moves there, stamps the timestamp, enqueues `out_for_delivery`/`delivered` SMS. `alreadyThere` is true when the order is already at `target` (idempotent, no error).
- `admin.setStatus` keeps its exact external behaviour (throws NOT_FOUND / PRECONDITION_FAILED with the same dictionary messages) but calls the service.

- [ ] **Step 1: Extract** the function; `setStatus` wraps it in `ctx.db.transaction`.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint`. Commit: `refactor: share forward-only order transition`.

### Task 3: Role plumbing

**Files:**
- Modify: `src/server/trpc/init.ts` (add `crewProcedure`; `driverProcedure` accepts `helper`)
- Modify: `src/app/driver/layout.tsx` (accept `helper`), `src/app/(owner)/layout.tsx` (redirect `helper` → `/crew`), `src/app/profile/page.tsx` (`roleHelper` label), `src/app/admin/AdminNav.tsx` (section link `/admin/staff` with `Users` icon; extra link `/crew` with `ShoppingCart` icon)

**Interfaces:**
- Produces: `crewProcedure` = `staffProcedure` + role in `["helper","admin"]`, else FORBIDDEN with `common.errors.crewOnly`.

- [ ] **Step 1: Implement** the four edits. `AdminNav.sectionLinks` gains `{ href: "/admin/staff", label: dict.admin.nav.staff, icon: Users }` (five tabs still fit at 11px labels); `extraLinks` gains `{ href: "/crew", label: dict.admin.nav.crew, icon: ShoppingCart }` first.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint`. Commit: `feat: helper role guards and nav`.

### Task 4: Pure stock math (TDD)

**Files:**
- Create: `src/server/services/truckStockMath.ts`, `src/server/services/truckStockMath.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type UnitTally = { loaded: number; added: number; reduced: number; sold: number; delivered: number };
  export function onHand(t: UnitTally): number            // loaded + added − reduced − sold − delivered
  export function loadShortfall(needed: number, loadedSoFar: number): number // max(0, needed − loadedSoFar)
  export function tallyMovements(rows: Array<{ productUnitId: string; kind: "load"|"add"|"reduce"|"sale"; quantity: number }>): Map<string, Omit<UnitTally,"delivered">>
  ```
  No `server-only` import (pure, unit-testable, same reason as `pricing.ts`).

- [ ] **Step 1: Write tests**: `onHand` with all five fields → correct sum; `onHand` can go negative; `loadShortfall(10, 4) === 6`, `loadShortfall(4, 10) === 0`, `loadShortfall(0, 0) === 0`; `tallyMovements` groups two units, maps `sale` → `sold` and ignores unknown kinds gracefully by type.
- [ ] **Step 2: Run** `pnpm vitest run src/server/services/truckStockMath.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** the three functions.
- [ ] **Step 4: Run** → PASS. Commit: `feat(crew): truck stock arithmetic`.

### Task 5: POS sale service (+ zod schemas)

**Files:**
- Create: `src/lib/schemas/crew.ts`, `src/server/services/posSales.ts`

**Interfaces:**
- `schemas/crew.ts` produces: `routeIdInput = z.object({ routeId: uuid })`; `packOrderInput = { orderId: uuid }`; `recordStockMovementInput = { routeId, productUnitId, kind: enum ["add","reduce"], quantity: int 1..999, reason: string trim max 200 optional }` with `superRefine` requiring `reason` when `kind === "reduce"`; `loadFromOrdersInput = routeIdInput`; `createPosSaleInput = { routeId, idempotencyKey: uuid, storeId: uuid nullable, customerName: string trim max 80 optional, payment: enum ["cash","suki"], items: array({ productUnitId, quantity int 1..999 }).min(1).max(60) }` with `superRefine`: `payment === "suki"` requires `storeId`; `posSaleIdInput = { saleId: uuid }`.
- `posSales.ts` produces:
  ```ts
  export type CreatePosSaleResult =
    | { ok: true; alreadySold: boolean; sale: { saleId: string; totalCentavos: bigint; payment: "cash"|"suki"; items: Array<{ productUnitId: string; nameTl: string; unitLabelTl: string; quantity: number; lockedUnitPriceCentavos: bigint; lockedTotalCentavos: bigint }> } }
    | { ok: false; reason: "route_not_found"|"unknown_item"|"no_price_today"|"store_not_found"|"suki_needs_store"|"over_suki_limit"; message: string; availableCentavos?: bigint };
  export async function createPosSale(db: Db, staffUserId: string, input: CreatePosSaleInput, locale?: Locale): Promise<CreatePosSaleResult>
  ```
  Algorithm (mirrors `placeOrder`): collapse duplicate units; validate active units; `selectDistinctOn` live price at `now()`; inside `db.transaction`: idempotency lookup by key → return `alreadySold`; if suki: `SELECT suki_balance_centavos, suki_limit_centavos FROM stores WHERE id = $1 FOR UPDATE`, refuse when `total > limit − balance`; insert `pos_sales` (soldOn = Manila day), items, one `truck_stock_movements` row per line (`kind: "sale"`, `stockOn` = same day, `posSaleId`), and when suki a `suki_ledger` row `{ kind: "charge", amountCentavos: total, posSaleId, reason: dict.crew.sell.ledgerReason }` ("Binili sa truck").

- [ ] **Step 1: Write `schemas/crew.ts`** per Interfaces (vitest the two `superRefine` rules in `src/lib/schemas/crew.test.ts`: reduce without reason fails; suki without storeId fails; cash walk-in passes).
- [ ] **Step 2: Run** the schema tests → FAIL, implement, → PASS.
- [ ] **Step 3: Implement `createPosSale`** per the algorithm. Error messages from `dict.crew.errors.*`.
- [ ] **Step 4: Verify** `pnpm typecheck && pnpm lint`. Commit: `feat(crew): POS sale service with price lock, suki check, stock movement`.

### Task 6: Truck stock service

**Files:**
- Create: `src/server/services/truckStock.ts`

**Interfaces:**
- Produces:
  ```ts
  export type StockRow = { productUnitId: string; productId: string; nameTl: string; nameEn: string; unitLabelTl: string; unitLabelEn: string; category: ProductCategory; needed: number; loaded: number; added: number; reduced: number; sold: number; delivered: number; onHand: number };
  export async function stockForRouteDay(db: Db, routeId: string, dayStr: string): Promise<StockRow[]>
  export async function recordMovement(db: Db, staffUserId: string, input: RecordStockMovementInput, locale?: Locale): Promise<{ ok: true } | { ok: false; reason: "unknown_unit"; message: string }>
  export async function loadFromOrders(db: Db, staffUserId: string, routeId: string, locale?: Locale): Promise<{ ok: true; loadedUnits: number }>
  ```
  `stockForRouteDay`: three queries — active units (all, so the helper can add a unit nobody ordered); `needed` = `sum(order_items.quantity)` over orders where `route_id`, `deliver_on = dayStart`, status not in (`cancelled`,`draft`), `cancelled_item = false`; `delivered` = same but status in (`delivered`,`settled`); movements for `(route_id, stock_on)` run through `tallyMovements`; `onHand` via `onHand()`. Order: category, nameTl, sortOrder (same as catalog). `loadFromOrders`: compute `loadShortfall(needed, loaded + added − reduced)` per unit; insert `load` rows for shortfall > 0 in one `insert().values([...])`.

- [ ] **Step 1: Implement** the three functions.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint`. Commit: `feat(crew): truck stock service`.

### Task 7: `crew` tRPC router + admin staff router

**Files:**
- Create: `src/server/routers/crew.ts`
- Modify: `src/server/routers/admin.ts` (add `staffAdminRouter`), `src/server/trpc/root.ts` (mount `crew`), `src/lib/schemas/admin.ts` (`createStaffInput = { name: trim 1..120, phone: trim min 1, role: enum ["buyer","admin","driver","helper"] }`, `updateStaffInput = { id: uuid, name, role, isActive: boolean }`)

**Interfaces:**
- `crew` procedures (all `crewProcedure`):
  - `routesToday()` → `{ day: Date; routes: Array<{ id, name, vehiclePlate, capacityKg, departureLocal, orderCount, packedCount, deliveredCount }> }` (counts exclude cancelled; packed = status in packed/in_transit/delivered/settled).
  - `packQueue({ routeId })` → `Array<{ id, status, totalCentavos, storeName, ownerName, stopOrder, loadKg, items: Array<{ nameTl, unitLabelTl, quantity, cancelledItem, weightGrams }> }>` for today's `submitted` + `packed` orders (packed shown as done), ordered by `stop_order NULLS LAST, name`. Also returns `{ capacityKg, packedKg }` → shape `{ orders, capacityKg, packedKg }`.
  - `packOrder({ orderId })` → `{ orderId, status: "packed" }` via `advanceOrderStatus(tx, orderId, "packed")`; `bad_transition` → PRECONDITION_FAILED `crew.errors.notPackable`.
  - `depart({ routeId })` → `{ moved: number }`: in one transaction, every order on the route for today with status `packed` goes through `advanceOrderStatus(tx, id, "in_transit")`.
  - `stock({ routeId })` → `{ day: string; rows: StockRow[]; cashTodayCentavos: bigint; salesToday: number }`.
  - `loadFromOrders({ routeId })`, `recordMovement(recordStockMovementInput)`.
  - `sell(createPosSaleInput)` → throws TRPCError mapped like `ordersRouter.place` (`REASON_TO_CODE`).
  - `salesToday({ routeId })` → `Array<{ id, totalCentavos, payment, storeName: string|null, customerName: string|null, createdAt, itemCount }>` newest first, limit 100.
  - `sale({ saleId })` → sale + items with names.
  - `storeSearch({ routeId, q: string trim max 60 })` → up to 8 `{ id, name, ownerName, phoneE164, routeId, sukiLimitCentavos, sukiBalanceCentavos }` matching `ilike '%q%'` on name/ownerName/phone (empty `q` = no filter), ordered by `(route_id = $routeId) DESC, name`.
- `store.ledger()` (owner, `protectedProcedure`): newest 30 `suki_ledger` rows for the caller's store → `{ id, kind, amountCentavos, reason, orderId, posSaleId, createdAt }`.
- `admin.staff`: `list()` → staff rows ordered by name; `create(createStaffInput)` (lookup `auth.users` by phone like `stores.create`; refuse if phone owns a store → `phoneIsOwner`; 23505 → `staffAlreadyExists`); `update(updateStaffInput)` (refuse deactivating self → `cannotDeactivateSelf`).

- [ ] **Step 1: Implement** `crew.ts`, the staff sub-router, mount both.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint`. Commit: `feat(crew): crew router; admin staff router`.

### Task 8: Shared `Stepper` + crew shell

**Files:**
- Create: `src/components/ui/Stepper.tsx` (moved from `HomeClient.tsx`, same props), `src/app/crew/layout.tsx`, `src/app/crew/CrewNav.tsx`, `src/app/crew/page.tsx` (redirect `/crew/pack`), `src/app/crew/_components/useCrewRoute.ts`, `src/app/crew/_components/RoutePicker.tsx`, `src/app/crew/_components/CrewStatus.tsx` (loading/error/empty text, same as driver's `StatusText`)
- Modify: `src/app/(owner)/home/HomeClient.tsx` (import Stepper)

**Interfaces:**
- `useCrewRoute(routes: Array<{id:string}>)` → `{ routeId: string | null; setRouteId(id) }`; single route implicit; persisted in `localStorage["sarihub.crew.route"]`.
- `RoutePicker({ routes, routeId, onPick })` renders the pill strip (driver pattern) only when `routes.length > 1`.
- Layout: role gate `helper | admin` else `redirect("/home")`; `max-w-[440px]` shell with glass header (Wordmark + profile link) and `CrewNav` fixed bottom tab bar with four tabs (`/crew/pack` Package, `/crew/stock` Boxes, `/crew/sell` ShoppingCart, `/crew/deliver` Truck) using `dict.crew.tab*`; content gets `pb-[calc(env(safe-area-inset-bottom)+96px)]`.

- [ ] **Step 1: Lift `Stepper`** out of `HomeClient.tsx` into `src/components/ui/Stepper.tsx`; HomeClient imports it. Run `pnpm typecheck`.
- [ ] **Step 2: Build the shell** files per Interfaces.
- [ ] **Step 3: Verify** `pnpm typecheck && pnpm lint`; `pnpm dev`, open `/crew` as the dev admin → tabs render. Commit: `feat(crew): app shell, tab bar, shared Stepper`.

### Task 9: Pack screen

**Files:**
- Create: `src/app/crew/pack/page.tsx`, `src/app/crew/pack/PackClient.tsx`

- [ ] **Step 1: Implement** per spec: header card with `packedCount/orderCount` and load bar (`packedKg / capacityKg`, red over capacity); horizontal queue strip of pending orders (stop number + store); active order's item checklist (local `Set<string>` of `${orderId}:${index}`); sticky CTA "I-load sa truck" enabled when all checked → confirm sheet (order weight, truck load after) → `crew.packOrder`; on success invalidate `packQueue` and `routesToday`, auto-select next pending; all-packed state shows "Umalis na ang truck" → confirm → `crew.depart` (hidden once nothing is `packed`).
- [ ] **Step 2: Verify live** as dev admin after seeding an order from the dev owner: pack it, see it move to "Nakahanda" on `/admin/orders`. Commit: `feat(crew): pack screen`.

### Task 10: Stock screen

**Files:**
- Create: `src/app/crew/stock/page.tsx`, `src/app/crew/stock/StockClient.tsx`

- [ ] **Step 1: Implement**: summary card (cash today, sales count); "I-load ang lahat ng order" button → `loadFromOrders` (toast line with `loadedUnits`, or `loadAllNothing`); grouped list by product with per-unit row: five numbers (needed/loaded/sold/delivered/on-hand, on-hand red when < 0) and `+`/`−` buttons → `+` opens a small sheet with a `Stepper` (default 1) and confirm → `recordMovement add`; `−` opens the reduce sheet with stepper + reason chips (+ free text for "iba pa") → `recordMovement reduce`. Invalidate `crew.stock` on success. `refetchInterval: 60_000`.
- [ ] **Step 2: Verify live**: load from orders, add 2, reduce 1 with reason, on-hand arithmetic matches. Commit: `feat(crew): stock screen`.

### Task 11: Sell screen

**Files:**
- Create: `src/app/crew/sell/page.tsx`, `src/app/crew/sell/SellClient.tsx`, `src/app/crew/sell/useSaleCart.ts` (same shape as `useCart` with key `sarihub.crew.sale.v1`, scoped to the day)

- [ ] **Step 1: Implement**: catalog from `catalog.today` (search + category pills + `Stepper`, no-price/out-of-stock units unorderable, reuse the product card markup from HomeClient as a local `SaleProductCard`); floating cart pill; cart sheet with lines + total, customer section (Walk-in toggle with optional name, or store search via `crew.storeSearch` showing suki room), payment segmented control (Suki disabled until a store is picked, shows `sukiRoom`), confirm → `crew.sell`; success state "Nabenta!" with total and payment; on success clear cart (new idempotency key), invalidate `crew.stock`, `crew.salesToday`. Under the catalog: "Benta ngayon" list from `crew.salesToday` with tap → receipt sheet (`crew.sale`).
- [ ] **Step 2: Verify live**: one cash walk-in sale and one suki sale to the dev owner's store; check owner's `/profile` suki balance rose by the sale total and `/admin/suki` ledger shows the charge; stock on-hand dropped. Commit: `feat(crew): sell (POS) screen`.

### Task 12: Deliver tab + admin staff page

**Files:**
- Create: `src/app/crew/deliver/page.tsx` (renders `DriverClient` from `~/app/driver/DriverClient`), `src/app/admin/staff/page.tsx`, `src/app/admin/staff/StaffClient.tsx`

- [ ] **Step 1: Deliver page** = `<DriverClient />`.
- [ ] **Step 1b: Owner ledger on `/profile`**: under the suki card, a `Card` list from `store.ledger` (client component `SukiActivity.tsx` in `src/app/profile/`): kind label (`profile.ledgerCharge` "Order" / `profile.ledgerPos` "Binili sa truck" when `posSaleId` set / `profile.ledgerPayment` / `profile.ledgerAdjustment`), signed amount, date. Add those four keys plus `profile.ledgerHeading`, `profile.ledgerEmpty` to both dictionaries (fold into Task 2).
- [ ] **Step 2: Staff page**: list (name · phone · role pill · active), "Bagong staff" sheet (name, phone, role select) → `admin.staff.create`; edit sheet (name, role, active checkbox) → `admin.staff.update`. Follow `StoresClient` patterns (`AdminSheet`, `Field`, `selectClass`, `FormActions`, react-hook-form + zodResolver).
- [ ] **Step 3: Verify live**: as dev admin open `/admin/staff`, see the two seeded staff (if any), open `/crew/deliver` and see the driver stop list. Commit: `feat: deliver tab; admin staff management`.

### Task 13: Apply migration, e2e, docs

**Files:**
- Create: `tests/e2e/crew-pos.spec.ts`
- Modify: `AGENTS.md` (roadmap + "who uses the app" row for the helper + project structure lines)

- [ ] **Step 1: Apply** `pnpm db:migrate` against the live project, then the `_rls.sql` via a one-off node script using `postgres` (no psql assumed): `node -e` reading `DATABASE_URL` from `.env` and executing the file with `sql.unsafe`. Confirm with `select enumlabel from pg_enum where enumtypid = 'staff_role'::regtype`.
- [ ] **Step 2: e2e**: owner dev-login reads suki balance on `/home`; staff dev-login goes to `/crew/sell`, searches "Sibuyas", adds 1 kilo, opens cart, picks store "Tindahan ni Suki", chooses Suki, confirms; owner reloads `/home` and balance rose by the Sibuyas 1 kilo price read from the catalog; staff opens `/crew/stock` and the Sibuyas 1 kilo row shows sold ≥ 1. Run `pnpm test:e2e tests/e2e/crew-pos.spec.ts` → PASS.
- [ ] **Step 3: AGENTS.md**: add the helper row to "Who uses the app", a "Then: truck crew + POS" roadmap block (checked), note `inventory_snapshots` is superseded by `truck_stock_movements`, note `/crew` in the structure tree. Commit: `docs: truck crew + POS shipped`.

# SMS order notifications via Semaphore

## Why

AGENTS.md's roadmap has carried this line since the cross-cutting section was
written: "SMS via Semaphore: order confirmed, out for delivery, delivered
(queue + retry, don't block the mutation)." Store owners currently have no
signal that their order was received, is on the truck, or has arrived, short
of opening the app. A text message closes that loop with zero new habits —
sari-sari owners already live on SMS.

## Existing precedent

- **Idempotency, not application locking.** `orders.place` (`src/server/services/orders.ts:176-194`)
  takes a client-supplied `idempotencyKey`, and a retried submit with the same
  key returns the existing order untouched — no row-level locking, just a
  unique constraint plus a check-then-return. This feature reuses that shape:
  a unique `(order_id, kind)` constraint on the queue table makes a duplicate
  enqueue a no-op, not an error to catch.
- **Money/env/locale conventions.** Integer centavos, `now()` from
  `~/lib/datetime` never `new Date()`, lazy zod-validated `env` proxy
  (`src/lib/env.ts`) that throws on first access if a var is missing rather
  than at import time, and every user-facing string through the
  `tl.ts`/`en.ts` dictionaries — all apply here unchanged.
- **`store.phoneE164` already exists** (`src/server/db/schema/stores.ts:13`,
  `varchar(16) not null unique`). No schema change needed to know where to
  send the text.
- **No server-persisted locale preference exists anywhere.**
  `getServerLocale()` (`src/lib/i18n/server.ts`) reads only the
  `sarihub_lang` cookie via `next/headers` — request-scoped, and unreadable
  from a cron job with no request. SMS copy is Tagalog-only for v1 (see Scope).
- **Three independent status-changing call sites**, all wrapped in
  `db.transaction`, all `SELECT ... FOR UPDATE` before writing:
  - `placeOrder` (`orders.ts:176-225`) inserts the order with
    `status: "submitted"`.
  - `admin.setStatus` (`src/server/routers/admin.ts:120-146`) drives
    `STATUS_TRANSITIONS` (`admin.ts:43-47`): `packed ← submitted`,
    `in_transit ← packed`, `delivered ← in_transit`. Admin can drive an
    order all the way to `delivered` without the driver app ever touching it.
  - `driver.markDelivered` (`src/server/routers/driver.ts:103-140`) also
    lands an order on `status: "delivered"`, independently of admin. It
    already no-ops (`{ alreadyDelivered: true }`) if the order is already
    `delivered`/`settled` — the same "duplicate call, harmless" shape this
    feature needs for the notification side.

Because **both** `admin.setStatus` and `driver.markDelivered` can be the one
that lands `delivered`, this feature cannot assume a single call site per
notification kind. The `(order_id, kind)` unique constraint is what makes
that safe: whichever path gets there first enqueues the row; the second
path's insert is a harmless conflict.

- **No existing outbound-HTTP-to-third-party pattern.** The closest analogue,
  `uploadPod()` (`src/lib/supabase/storage.ts`), is client-side and
  best-effort (try/catch, returns `null`, comment: "must never block"). This
  feature is the first server-side outbound HTTP call in the codebase.
- **Testing convention**: only DB-free, network-free pure functions get
  `.test.ts` files (`pricing.test.ts`, `catalogImportValidation.test.ts`,
  `deliverySchedule.test.ts`) — plain `describe`/`it`/`expect`, no mocking
  framework anywhere in the repo. Anything DB- or network-touching is
  verified live instead (the Playwright e2e suite runs against the real
  Supabase project). This feature follows the same split: pure logic
  (message rendering, backoff schedule, kind-for-transition mapping) gets
  unit tests; the actual Semaphore HTTP call does not.
- **Migrations are Drizzle-generated**, not hand-written: a schema change in
  `src/server/db/schema/*.ts` + `pnpm db:generate` produces the next
  `drizzle/NNNN_*.sql`. Latest is `0004_glorious_blue_blade.sql`; this
  feature's migration will be `0005_*`. RLS/trigger SQL only ships as a
  paired `_rls.sql` file when a table is reachable through a Supabase-client
  connection subject to RLS. This table never is — the app talks to Postgres
  through Drizzle over `DATABASE_URL` (a direct connection, not the
  Supabase client SDK), for both the enqueue side and the cron-driven send
  side. No `_rls.sql` file ships with this migration.

## Scope

### 1. New table: `notification_queue`

New schema file `src/server/db/schema/notifications.ts`, added to the
`schema/index.ts` barrel:

```typescript
import { integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { idColumn } from "./_shared";
import { orders } from "./orders";

export const notificationKind = pgEnum("notification_kind", [
  "confirmed",
  "out_for_delivery",
  "delivered",
]);

export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

export const notificationQueue = pgTable(
  "notification_queue",
  {
    id: idColumn(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    /** Rendered at enqueue time — a later copy edit never changes an
     *  already-queued message, and the cron worker never needs to re-fetch
     *  order/store context to know what to send. */
    message: text("message").notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [unique("notification_queue_order_kind_unique").on(table.orderId, table.kind)],
);

export type NotificationQueueRow = typeof notificationQueue.$inferSelect;
```

### 2. Enqueueing — inside the same transaction as the status change

New service file `src/server/services/notifications.ts` exports:

```typescript
export function notificationMessage(dict: Dictionary, kind: NotificationKind, storeName: string): string
```

Pure, unit-testable — pulls the three templates from a new `sms` section in
the dictionaries (see §4) and runs them through the existing `interpolate()`.

```typescript
export async function enqueueNotification(
  tx: Tx, // the transaction handle already in scope at each call site
  orderId: string,
  kind: NotificationKind,
  phoneE164: string,
  message: string,
): Promise<void>
```

A plain `insert(...).onConflictDoNothing()` on `(order_id, kind)`. No
try/catch needed here — the only realistic failure mode is the intentional
conflict (harmless), so this stays inside the parent transaction rather than
being pushed to a best-effort side channel. This is what keeps "don't block
the mutation" true without async/background-job complexity in the request
path: the mutation still only does local Postgres writes, same as today,
just one row more.

**Call sites** (three, all inside their existing transaction, all needing
`store.name`/`store.phoneE164` — already loaded or one extra indexed lookup
away at each site):

- `placeOrder`, right after the `orders` insert (`orders.ts:213-225`):
  `enqueueNotification(tx, order.id, "confirmed", store.phoneE164, notificationMessage(dict, "confirmed", store.name))`.
- `admin.setStatus`, right after the `update(orders)` (`admin.ts:141-144`),
  only when `input.status` is `"in_transit"` or `"delivered"` (not `"packed"`
  — packed isn't one of the three roadmap events). Needs a `store.name` +
  `store.phoneE164` lookup by `orders.storeId` inside the same transaction
  (not currently selected in this handler).
- `driver.markDelivered`, right after the `update(orders)`
  (`driver.ts:127-136`), unconditionally on the non-`alreadyDelivered` path.
  Same store lookup need.

### 3. Sending — Vercel Cron polling the queue

`src/server/services/sms.ts`:

```typescript
export async function sendSms(phoneE164: string, message: string): Promise<{ ok: true } | { ok: false; error: string }>
```

Calls Semaphore's send-message API (`POST https://api.semaphore.co/api/v4/messages`,
form-encoded `apikey`/`number`/`message`, optionally `sendername`) using
`env.SEMAPHORE_API_KEY`. If the key is unset, returns
`{ ok: false, error: "SEMAPHORE_API_KEY not configured" }` immediately —
no network call attempted, no throw, no crash. This is what lets the whole
feature ship and sit dormant today: every queued row fails closed, retries
on schedule, and starts actually sending the instant a real key lands in
`.env` — zero code changes at that point. (Exact field names to confirm
against Semaphore's current API docs during implementation — not verifiable
without a live key, per Scope.)

```typescript
/** attemptNumber is 1-indexed: the attempt that just failed. Returns
 *  minutes until the next retry, or null once retries are exhausted. */
export function backoffMinutes(attemptNumber: number): number | null
```

Pure, unit-testable: `[2, 4, 8, 16][attemptNumber - 1] ?? null`. Four
scheduled retries after the first failure — 2, 4, 8, 16 minutes — for five
total attempts (the original send plus four retries) before a row is
permanently failed. The exact numbers aren't a hill to die on; the shape
(doubling, capped, `null` = stop) is what matters.

```typescript
export async function processNotificationQueue(db: Db): Promise<{ sent: number; failed: number }>
```

Selects rows where `status = 'pending'` (never tried) or
(`status = 'failed' AND next_attempt_at IS NOT NULL AND next_attempt_at <= now()`)
(a scheduled retry that's due), `FOR UPDATE SKIP LOCKED` so an overlapping
cron invocation (Vercel Cron does not guarantee no-overlap) never
double-sends. For each row: call `sendSms`; on success, `status = 'sent'`,
`sent_at = now()`; on failure, `attempts += 1` and `last_error = <message>`,
then look up `backoffMinutes(attempts)`:
- a number → `next_attempt_at = now() + that many minutes`, `status`
  stays `'failed'` (picked up again once due — a retry, not terminal).
- `null` → `next_attempt_at = null`, `status = 'failed'` (now terminal:
  `next_attempt_at IS NULL` is what excludes it from the next cron run's
  selection for good — queryable via DB, no auto-retry, no UI to surface
  it in v1).

### 4. Route handler + Vercel Cron config

`src/app/api/cron/notifications/route.ts` — a `GET` handler (Vercel Cron
calls `GET` by default) that:

1. Checks `request.headers.get("authorization") === \`Bearer ${env.CRON_SECRET}\``
   — Vercel automatically attaches this header to its own cron-triggered
   requests; any request without a matching header is rejected `401`. This
   is the only auth layer — the route is otherwise unauthenticated (a cron
   job has no user session to check against `staffProcedure`/etc.).
2. Calls `processNotificationQueue(db)`.
3. Returns the `{ sent, failed }` counts as JSON, `200`.

New `vercel.json` at the repo root:

```json
{
  "crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }]
}
```

### 5. Env vars

`src/lib/env.ts`'s zod schema gains two optional fields:

```typescript
SEMAPHORE_API_KEY: z.string().min(10).optional(),
CRON_SECRET: z.string().min(16).optional(),
```

Both optional so a fresh checkout / `next build` without them still works
(matches the existing `SUPABASE_SERVICE_ROLE_KEY`/`DATABASE_URL` pattern one
line above). `.env.example` gains both keys with empty values, same as the
existing four.

### 6. Message copy

New `sms` section in `src/lib/i18n/dictionaries/tl.ts` (canonical) and
`en.ts` (shape-matched, unused by any call site yet — see Scope):

```typescript
sms: {
  confirmed: "Suking {storeName}, natanggap na po ang order niyo. Aabot bukas ng umaga. – SariHub",
  outForDelivery: "Nasa daan na po ang order niyo, {storeName}! Aabot na sa umaga. – SariHub",
  delivered: "Naihatid na po ang order niyo, {storeName}. Salamat sa pagtitiwala! – SariHub",
},
```

Exact wording is not load-bearing to this spec and can be refined during
implementation or after seeing real SMS render — what's load-bearing is that
it lives in the dictionary, not a hardcoded literal, per the project's
existing bilingual-string rule (AGENTS.md's Project Structure section).
Each template stays under ~160 characters (one SMS segment) with `{storeName}`
filled in — worth a quick manual check during implementation since
Semaphore likely bills per segment, but not a hard requirement of this spec.

## Out of scope

- **English SMS.** The dictionary carries an `en.ts` entry for shape
  parity (`Dictionary` type stays a single source of truth per the existing
  pattern), but nothing selects it — every send uses `tl`. Wiring a real
  per-store locale preference (a `stores.locale` column, a settings surface
  to change it) is a follow-up, not part of this feature.
- **"Packed" notifications and cancellation notifications.** Not in the
  roadmap line this feature implements. `admin.setStatus` only enqueues on
  `in_transit`/`delivered`, never `packed`; nothing enqueues on cancel.
- **Admin UI for the notification queue.** Failed/pending rows are visible
  only via direct DB query in v1. A `/admin` view listing failures or a
  manual "retry now" button is a reasonable future roadmap line, not this one.
- **Delivery receipts / two-way SMS.** Semaphore's response confirms the API
  accepted the send request, not that the handset received it. No webhook,
  no read-receipt tracking.
- **Rate limiting / spend caps.** No per-store or global cap on SMS volume.
  Order volume is small (one distributor, one route today) — worth revisiting
  if that changes, not a v1 concern.
- **Unit tests for `sendSms` itself.** Per the existing testing convention
  (no mocking framework anywhere in the repo, network-touching code verified
  live rather than mocked), the HTTP call stays unverified by the unit suite.
  `notificationMessage`, `backoffMinutes`, and the kind-for-transition
  mapping are pure and get real test coverage; `sendSms`'s actual request
  shape gets verified manually once a real `SEMAPHORE_API_KEY` exists.

## Risks / tradeoffs

- **Cron cadence (5 min) means up to a 5-minute delay** between an order
  event and the SMS landing, even on the first attempt (nothing sends
  synchronously). Acceptable for this use case — none of the three events
  are time-critical to the second — but worth stating explicitly since it's
  a deliberate trade for "don't block the mutation," not an oversight.
- **`FOR UPDATE SKIP LOCKED` assumes Postgres**, which this project already
  is (Supabase). No portability concern.
- **The unique `(order_id, kind)` constraint means a permanently-failed row
  can never be re-queued by the app** (a second `placeOrder`/`setStatus`
  call for the same order+kind is always a no-op insert, by design). The
  only recovery path for a row that exhausts its 5 attempts is a manual DB
  `UPDATE` resetting its status — acceptable for v1 given the "no admin UI"
  scope call above, but the implementer should leave a code comment at the
  terminal-failure branch saying exactly that, so it's not mistaken for a bug
  later.
- **`vercel.json` is a new repo-root file** — first cron job in this
  project. If the project isn't actually deployed on Vercel yet in whatever
  environment reads AGENTS.md's "Hosting: Vercel (web) + Supabase (data)"
  line, cron won't fire until it is; the queue will simply grow unsent rows
  until then, which is inert (no error state) but worth knowing.

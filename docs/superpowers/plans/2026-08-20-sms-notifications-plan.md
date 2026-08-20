# SMS order notifications via Semaphore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Queue and send SMS notifications (order confirmed, out for delivery, delivered) via Semaphore, without ever blocking the mutation that triggers them.

**Architecture:** A `notification_queue` Postgres table decouples "queue it" (a fast, transactional insert alongside each status-changing mutation) from "send it" (a Vercel Cron job polling the table every 5 minutes, calling Semaphore's HTTP API, retrying failed sends with exponential backoff up to 5 attempts). The Semaphore API key is optional in `env` — until it's configured, every send fails closed and retries on schedule, so this ships and sits dormant safely.

**Tech Stack:** Next.js 15 Route Handler (cron target), Drizzle ORM + Postgres (`FOR UPDATE SKIP LOCKED`), Vercel Cron (`vercel.json`), Vitest for pure-function unit tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-20-sms-notifications-design.md` — read it for the full rationale; this plan implements it task-by-task without repeating the "why."

## Global Constraints

- Money stays integer centavos; `now()` from `~/lib/datetime`, never `new Date()` — this feature adds no money math, but touches `now()` in the queue processor.
- Every user-facing string (the SMS bodies) goes through `src/lib/i18n/dictionaries/{tl,en}.ts`, added to `tl.ts` first. SMS copy is Tagalog-only for v1 — the `en.ts` entry exists only for `Dictionary` type-shape parity and is never selected by any call site.
- No `any` without a `// TODO(reason)` comment.
- **Pure, DB-free, network-free functions get their own file with no `import "server-only"`, so Vitest can import them directly** — this repo's `server-only` package throws when resolved outside a Next.js server context, which breaks under Vitest's Node environment. Existing precedent: `src/server/services/pricing.ts` and `src/server/services/catalogImportValidation.ts` (both pure, no `server-only`, both have `.test.ts` siblings) vs. `src/server/services/orders.ts` and `src/server/services/catalogImport.ts` (both DB-touching, both `import "server-only"`, neither has a test file). This plan follows the same pure/impure file split throughout: `smsBackoff.ts`/`notificationMessage.ts` (pure, tested) vs. `sms.ts`/`notifications.ts` (impure, `server-only`, untested by unit tests — verified manually per Task 6/7/8, matching how `orders.ts` itself is verified in this codebase).
- `(order_id, kind)` unique constraint is the sole duplicate-send guard — no application-level locking beyond the `FOR UPDATE`/`FOR UPDATE SKIP LOCKED` already used elsewhere in the codebase for the same purpose (see `orders.ts`'s idempotency-key check, `admin.ts`/`driver.ts`'s row locks).
- The status-changing mutations (`placeOrder`, `admin.setStatus`, `driver.markDelivered`) must never make a network call. Enqueueing is a local Postgres insert only; the actual Semaphore HTTP call happens exclusively in the cron-driven queue processor.

---

### Task 1: `notification_queue` schema + migration

**Files:**
- Create: `src/server/db/schema/notifications.ts`
- Modify: `src/server/db/schema/index.ts`
- Generated: `drizzle/0005_*.sql` (via `pnpm db:generate`, filename chosen by drizzle-kit)

**Interfaces:**
- Produces: `notificationQueue` (Drizzle table), `notificationKind` (pgEnum: `"confirmed" | "out_for_delivery" | "delivered"`), `NotificationKind` (TS union type), `notificationStatus` (pgEnum: `"pending" | "sent" | "failed"`), `NotificationQueueRow` (inferred select type) — consumed by Task 5's `notifications.ts` and Task 6's call-site edits.

- [ ] **Step 1: Write the schema file**

```typescript
// src/server/db/schema/notifications.ts
import { integer, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { idColumn } from "./_shared";
import { orders } from "./orders";

export const notificationKind = pgEnum("notification_kind", [
  "confirmed",
  "out_for_delivery",
  "delivered",
]);

export type NotificationKind = (typeof notificationKind.enumValues)[number];

export const notificationStatus = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

/**
 * One row per (order, kind). `message` is rendered and frozen at enqueue
 * time, so a later copy edit never changes an already-queued send, and the
 * cron worker never needs to re-fetch order/store context to know what to
 * say. `next_attempt_at` doubles as the terminal-failure marker: once
 * retries are exhausted it's set to null, which is what excludes a row from
 * the next cron run for good (see notifications.ts).
 */
export const notificationQueue = pgTable(
  "notification_queue",
  {
    id: idColumn(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    message: text("message").notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** Nullable — null is the terminal-failure marker once retries are
     *  exhausted (see notifications.ts). Defaults to now() so a fresh
     *  "pending" row is immediately eligible if it were ever queried by
     *  the failed-retry branch, though in practice pending rows are
     *  selected by status alone. */
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [unique("notification_queue_order_kind_unique").on(table.orderId, table.kind)],
);

export type NotificationQueueRow = typeof notificationQueue.$inferSelect;
```

- [ ] **Step 2: Export it from the schema barrel**

In `src/server/db/schema/index.ts`, add one line (matching the existing alphabetical-by-domain ordering — this goes after `orders`, before `suki`):

```typescript
export * from "./notifications";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:generate --name sms_notification_queue`
Expected: a new `drizzle/0005_sms_notification_queue.sql` file, creating the two enum types, the `notification_queue` table, and the unique constraint. Read the generated SQL before proceeding — confirm it matches the schema above (two `CREATE TYPE`, one `CREATE TABLE`, one `CONSTRAINT ... UNIQUE`) and touches no existing table.

- [ ] **Step 5: Apply the migration**

Run: `pnpm db:migrate`
Expected: success output naming `0005_sms_notification_queue.sql` as applied, no errors. This runs against the live Supabase project configured in `.env`'s `DATABASE_URL` — the same command this project has used for every prior migration (0001–0004).

- [ ] **Step 6: Commit**

```bash
git add src/server/db/schema/notifications.ts src/server/db/schema/index.ts drizzle/0005_sms_notification_queue.sql
git commit -m "feat: add notification_queue table for SMS order notifications"
```

---

### Task 2: `backoffMinutes` — the retry schedule

**Files:**
- Create: `src/server/services/smsBackoff.ts`
- Test: `src/server/services/smsBackoff.test.ts`

**Interfaces:**
- Produces: `backoffMinutes(attemptNumber: number): number | null` — consumed by Task 5's `processNotificationQueue`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/server/services/smsBackoff.test.ts
import { describe, expect, it } from "vitest";

import { backoffMinutes } from "./smsBackoff";

describe("backoffMinutes", () => {
  it("doubles from 2 minutes for the first four failed attempts", () => {
    expect(backoffMinutes(1)).toBe(2);
    expect(backoffMinutes(2)).toBe(4);
    expect(backoffMinutes(3)).toBe(8);
    expect(backoffMinutes(4)).toBe(16);
  });

  it("returns null once the fifth attempt has failed — no more retries", () => {
    expect(backoffMinutes(5)).toBeNull();
    expect(backoffMinutes(6)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/server/services/smsBackoff.test.ts`
Expected: FAIL — `./smsBackoff` has no exported member `backoffMinutes` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/server/services/smsBackoff.ts
// Deliberately no "import server-only" here — pure, DB-free, network-free
// retry-schedule math kept directly unit-testable. See the plan's Global
// Constraints note on why "server-only" can't resolve under Vitest.

const BACKOFF_MINUTES = [2, 4, 8, 16];

/**
 * `attemptNumber` is 1-indexed: the attempt that just failed. Returns
 * minutes until the next retry, or null once retries are exhausted — five
 * total attempts (the original send plus four retries) before a queued
 * notification is permanently failed.
 */
export function backoffMinutes(attemptNumber: number): number | null {
  return BACKOFF_MINUTES[attemptNumber - 1] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/server/services/smsBackoff.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/services/smsBackoff.ts src/server/services/smsBackoff.test.ts
git commit -m "feat: add backoffMinutes retry schedule for SMS queue"
```

---

### Task 3: `sendSms` — the Semaphore client

**Files:**
- Create: `src/server/services/sms.ts`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `env` from `~/lib/env` (Task's own env.ts edit).
- Produces: `sendSms(phoneE164: string, message: string): Promise<{ ok: true } | { ok: false; error: string }>` — consumed by Task 5's `processNotificationQueue`.

- [ ] **Step 1: Add `SEMAPHORE_API_KEY` to the env schema**

In `src/lib/env.ts`, add one field to the zod schema (after `DATABASE_URL`, matching its `.optional()` shape so a fresh checkout / `next build` without it still works):

```typescript
  SEMAPHORE_API_KEY: z.string().min(10).optional(),
```

And add the corresponding line to the `parsed = schema.safeParse({...})` call's object literal:

```typescript
        SEMAPHORE_API_KEY: process.env.SEMAPHORE_API_KEY,
```

- [ ] **Step 2: Add the var to `.env.example`**

Append to `.env.example`:

```
# SMS (Semaphore) — optional; notifications queue and retry even without this set,
# they just never actually send until a real key is added
SEMAPHORE_API_KEY=
```

- [ ] **Step 3: Write `sendSms`**

No TDD step here — per the Global Constraints note, this file makes a real outbound HTTP call and reads a secret, so it follows the `orders.ts`/`catalogImport.ts` precedent (`server-only`, no unit test; verified manually once wired up in Task 6 and against a live key later).

```typescript
// src/server/services/sms.ts
import "server-only";

import { env } from "~/lib/env";

const SEMAPHORE_URL = "https://api.semaphore.co/api/v4/messages";

export type SendSmsResult = { ok: true } | { ok: false; error: string };

/**
 * Sends one SMS via Semaphore. Fails closed with no network call when
 * SEMAPHORE_API_KEY isn't configured — this is what lets the notification
 * queue ship and sit dormant: every queued row retries on schedule and
 * starts actually sending the instant a real key lands in .env, with zero
 * code changes at that point.
 */
export async function sendSms(phoneE164: string, message: string): Promise<SendSmsResult> {
  const apiKey = env.SEMAPHORE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "SEMAPHORE_API_KEY not configured" };
  }

  try {
    const res = await fetch(SEMAPHORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ apikey: apiKey, number: phoneE164, message }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Semaphore ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/sms.ts src/lib/env.ts .env.example
git commit -m "feat: add Semaphore SMS client, fails closed without an API key"
```

---

### Task 4: `notificationMessage` — SMS copy

**Files:**
- Create: `src/server/services/notificationMessage.ts`
- Test: `src/server/services/notificationMessage.test.ts`
- Modify: `src/lib/i18n/dictionaries/tl.ts`
- Modify: `src/lib/i18n/dictionaries/en.ts`

**Interfaces:**
- Consumes: `NotificationKind` from Task 1's `~/server/db/schema`, `Dictionary` type from `~/lib/i18n/dictionaries`, `interpolate` from `~/lib/i18n/interpolate` (all pre-existing).
- Produces: `notificationMessage(dict: Dictionary, kind: NotificationKind, storeName: string): string` — consumed by Task 6's three call-site edits.

- [ ] **Step 1: Add the `sms` section to `tl.ts` (canonical)**

Add a new top-level key to the dictionary object in `src/lib/i18n/dictionaries/tl.ts`, placed after the existing `productCategories` key (the current last key — check the file's actual end and insert as a sibling, keeping the object's closing brace after it):

```typescript
  sms: {
    confirmed: "Suking {storeName}, natanggap na po ang order niyo. Aabot bukas ng umaga. – SariHub",
    outForDelivery: "Nasa daan na po ang order niyo, {storeName}! Aabot na sa umaga. – SariHub",
    delivered: "Naihatid na po ang order niyo, {storeName}. Salamat sa pagtitiwala! – SariHub",
  },
```

- [ ] **Step 2: Add the matching `sms` section to `en.ts`**

Same three keys, English copy, same position (`Dictionary`'s shape is inferred from `tl.ts`, so `en.ts` must match it structurally or `pnpm typecheck` fails):

```typescript
  sms: {
    confirmed: "Hi {storeName}, we've received your order. Arriving tomorrow morning. – SariHub",
    outForDelivery: "Your order is on the way, {storeName}! Arriving this morning. – SariHub",
    delivered: "Your order has been delivered, {storeName}. Thank you! – SariHub",
  },
```

- [ ] **Step 3: Write the failing test**

```typescript
// src/server/services/notificationMessage.test.ts
import { describe, expect, it } from "vitest";

import { tl } from "~/lib/i18n/dictionaries/tl";

import { notificationMessage } from "./notificationMessage";

describe("notificationMessage", () => {
  it("renders the confirmed template with the store name", () => {
    expect(notificationMessage(tl, "confirmed", "Aling Marisa")).toBe(
      "Suking Aling Marisa, natanggap na po ang order niyo. Aabot bukas ng umaga. – SariHub",
    );
  });

  it("renders the out_for_delivery template", () => {
    expect(notificationMessage(tl, "out_for_delivery", "Aling Marisa")).toBe(
      "Nasa daan na po ang order niyo, Aling Marisa! Aabot na sa umaga. – SariHub",
    );
  });

  it("renders the delivered template", () => {
    expect(notificationMessage(tl, "delivered", "Aling Marisa")).toBe(
      "Naihatid na po ang order niyo, Aling Marisa. Salamat sa pagtitiwala! – SariHub",
    );
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm vitest run src/server/services/notificationMessage.test.ts`
Expected: FAIL — `./notificationMessage` has no exported member `notificationMessage` (module doesn't exist yet).

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/server/services/notificationMessage.ts
// Deliberately no "import server-only" here — pure, DB-free, network-free
// string rendering kept directly unit-testable. See the plan's Global
// Constraints note on why "server-only" can't resolve under Vitest.

import { interpolate } from "~/lib/i18n/interpolate";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import type { NotificationKind } from "~/server/db/schema";

const TEMPLATE_KEY: Record<NotificationKind, keyof Dictionary["sms"]> = {
  confirmed: "confirmed",
  out_for_delivery: "outForDelivery",
  delivered: "delivered",
};

/** Renders the SMS body for one notification kind. Tagalog-only for v1 —
 *  see the spec's Scope for why (no server-persisted per-store locale
 *  exists yet); callers always pass the `tl` dictionary today. */
export function notificationMessage(dict: Dictionary, kind: NotificationKind, storeName: string): string {
  return interpolate(dict.sms[TEMPLATE_KEY[kind]], { storeName });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/server/services/notificationMessage.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no errors — this also confirms `tl.ts`/`en.ts` structurally match (a mismatch here is a compile error against `Dictionary`).

- [ ] **Step 8: Commit**

```bash
git add src/server/services/notificationMessage.ts src/server/services/notificationMessage.test.ts src/lib/i18n/dictionaries/tl.ts src/lib/i18n/dictionaries/en.ts
git commit -m "feat: add SMS copy and notificationMessage renderer"
```

---

### Task 5: `enqueueNotification` + `processNotificationQueue`

**Files:**
- Create: `src/server/services/notifications.ts`

**Interfaces:**
- Consumes: `notificationQueue`, `NotificationKind` from `~/server/db/schema` (Task 1); `sendSms` from `~/server/services/sms` (Task 3); `backoffMinutes` from `~/server/services/smsBackoff` (Task 2); `now` from `~/lib/datetime`.
- Produces: `enqueueNotification(tx: Tx, orderId: string, kind: NotificationKind, phoneE164: string, message: string): Promise<void>` and `processNotificationQueue(db: Db): Promise<{ sent: number; failed: number }>` — `enqueueNotification` consumed by Task 6's three call-site edits; `processNotificationQueue` consumed by Task 7's cron route.

No dedicated unit test for this task — both functions touch the database, and this codebase's established convention (see Global Constraints) verifies DB-touching service code live rather than with mocks. `enqueueNotification` gets exercised for real in Task 6 (placing a real order through the dev server and inspecting the resulting row); `processNotificationQueue` gets exercised for real in Task 7 (curling the cron route and inspecting the row's `status`/`attempts` afterward). This task's own deliverable is `pnpm typecheck` passing clean against the real Drizzle schema from Task 1 — a real structural check, not a placeholder.

- [ ] **Step 1: Write the service file**

```typescript
// src/server/services/notifications.ts
import "server-only";

import { and, eq, isNotNull, lte, or } from "drizzle-orm";

import { now } from "~/lib/datetime";
import { db as defaultDb } from "~/server/db";
import { notificationQueue, type NotificationKind } from "~/server/db/schema";
import { backoffMinutes } from "./smsBackoff";
import { sendSms } from "./sms";

type Db = typeof defaultDb;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Queues one notification inside the caller's existing transaction — a
 * local Postgres insert only, never a network call, which is what keeps the
 * status-changing mutation that calls this un-blocked. The unique
 * (order_id, kind) constraint makes a duplicate call for the same order and
 * kind a harmless no-op: whichever code path gets there first wins (see the
 * spec's note on admin.setStatus and driver.markDelivered both being able
 * to land an order on "delivered").
 */
export async function enqueueNotification(
  tx: Tx,
  orderId: string,
  kind: NotificationKind,
  phoneE164: string,
  message: string,
): Promise<void> {
  await tx
    .insert(notificationQueue)
    .values({ orderId, kind, phoneE164, message })
    .onConflictDoNothing();
}

/**
 * Sends every due row: fresh ("pending") rows, plus "failed" rows whose
 * scheduled retry time has arrived. FOR UPDATE SKIP LOCKED so an
 * overlapping cron invocation (Vercel Cron does not guarantee no-overlap)
 * never double-sends the same row.
 */
export async function processNotificationQueue(db: Db): Promise<{ sent: number; failed: number }> {
  const at = now();
  let sent = 0;
  let failed = 0;

  await db.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(notificationQueue)
      .where(
        or(
          eq(notificationQueue.status, "pending"),
          and(
            eq(notificationQueue.status, "failed"),
            isNotNull(notificationQueue.nextAttemptAt),
            lte(notificationQueue.nextAttemptAt, at),
          ),
        ),
      )
      .for("update", { skipLocked: true });

    for (const row of due) {
      const result = await sendSms(row.phoneE164, row.message);

      if (result.ok) {
        await tx
          .update(notificationQueue)
          .set({ status: "sent", sentAt: at })
          .where(eq(notificationQueue.id, row.id));
        sent++;
        continue;
      }

      const attempts = row.attempts + 1;
      const nextIn = backoffMinutes(attempts);
      await tx
        .update(notificationQueue)
        .set({
          status: "failed",
          attempts,
          lastError: result.error,
          // null once retries are exhausted — this is the terminal marker
          // that excludes the row from future runs' WHERE clause above.
          nextAttemptAt: nextIn === null ? null : new Date(at.getTime() + nextIn * 60_000),
        })
        .where(eq(notificationQueue.id, row.id));
      failed++;
    }
  });

  return { sent, failed };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. (The `Tx` type derivation and the `.for("update", { skipLocked: true })` call above were both verified against the installed `drizzle-orm@0.36.4` types before this plan was written — copy them as given.)

- [ ] **Step 3: Commit**

```bash
git add src/server/services/notifications.ts
git commit -m "feat: add enqueueNotification and processNotificationQueue"
```

---

### Task 6: Wire the three call sites

**Files:**
- Modify: `src/server/services/orders.ts`
- Modify: `src/server/routers/admin.ts`
- Modify: `src/server/routers/driver.ts`

**Interfaces:**
- Consumes: `enqueueNotification` from `~/server/services/notifications` (Task 5), `notificationMessage` from `~/server/services/notificationMessage` (Task 4), `getDictionary` (pre-existing, already imported in `admin.ts`/`driver.ts`; needs adding to `orders.ts`'s imports — check first, it may already use `getDictionary` there for `dict`).

- [ ] **Step 1: `orders.ts` — enqueue "confirmed" on submit**

Add to the imports (alongside the existing `~/server/services/*`-relative imports at the top of the file):

```typescript
import { notificationMessage } from "./notificationMessage";
import { enqueueNotification } from "./notifications";
```

`placeOrder` already computes `dict = getDictionary(locale).orders.errors` near the top, narrowed to the `.orders.errors` slice — `notificationMessage` needs the *root* dictionary (for its `.sms` key), so call `getDictionary(locale)` fresh inline below rather than trying to reuse `dict`; it's a cheap plain object lookup, not worth a new named variable. Right after the `orders` insert (the `const [order] = await tx.insert(orders)...returning(...)` block, before the `orderItems` insert that follows it):

```typescript
    await enqueueNotification(
      tx,
      order!.id,
      "confirmed",
      store.phoneE164,
      notificationMessage(getDictionary(locale), "confirmed", store.name),
    );
```

(`store` is already in scope from the `select().from(stores)` call earlier in this function — it carries `name` and `phoneE164`.)

- [ ] **Step 2: `admin.ts` — enqueue "out_for_delivery" / "delivered" on transition**

Extend the existing lock query's shape and add the enqueue call. Change:

```typescript
      const rows = await tx.execute<{ status: string }>(
        sql`SELECT status FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
      );
```

to:

```typescript
      const rows = await tx.execute<{ status: string; store_id: string }>(
        sql`SELECT status, store_id FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
      );
```

Then, right after the existing `await tx.update(orders).set({ status: input.status, [transition.stamp]: at }).where(eq(orders.id, input.orderId));` line and before the `return { orderId: input.orderId, status: input.status };`, add:

```typescript
      if (input.status === "in_transit" || input.status === "delivered") {
        const [orderStore] = await tx
          .select({ name: stores.name, phoneE164: stores.phoneE164 })
          .from(stores)
          .where(eq(stores.id, order.store_id))
          .limit(1);
        if (orderStore) {
          await enqueueNotification(
            tx,
            input.orderId,
            input.status === "in_transit" ? "out_for_delivery" : "delivered",
            orderStore.phoneE164,
            notificationMessage(getDictionary(ctx.locale), input.status === "in_transit" ? "out_for_delivery" : "delivered", orderStore.name),
          );
        }
      }
```

Add the two new imports at the top of `admin.ts`, alongside the existing `~/server/services/catalogImport` import:

```typescript
import { notificationMessage } from "~/server/services/notificationMessage";
import { enqueueNotification } from "~/server/services/notifications";
```

- [ ] **Step 3: `driver.ts` — enqueue "delivered" on the driver's own delivery confirmation**

Same lock-query extension as `admin.ts`. Change:

```typescript
      const rows = await tx.execute<{ status: string }>(
        sql`SELECT status FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
      );
```

to:

```typescript
      const rows = await tx.execute<{ status: string; store_id: string }>(
        sql`SELECT status, store_id FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
      );
```

Then, right after the existing `await tx.update(orders).set({ status: "delivered", ... }).where(eq(orders.id, input.orderId));` block and before `return { orderId: input.orderId, alreadyDelivered: false };`, add:

```typescript
      const [orderStore] = await tx
        .select({ name: stores.name, phoneE164: stores.phoneE164 })
        .from(stores)
        .where(eq(stores.id, order.store_id))
        .limit(1);
      if (orderStore) {
        await enqueueNotification(
          tx,
          input.orderId,
          "delivered",
          orderStore.phoneE164,
          notificationMessage(getDictionary(ctx.locale), "delivered", orderStore.name),
        );
      }
```

Add the two new imports at the top of `driver.ts`:

```typescript
import { notificationMessage } from "~/server/services/notificationMessage";
import { enqueueNotification } from "~/server/services/notifications";
```

(`driver.ts` already imports `stores` from `~/server/db/schema` — confirm it's in the existing import list; `admin.ts` also already imports `stores`.)

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Manual verification against the dev server**

Run: `pnpm dev`, sign in as the owner dev account (`/login`'s dev shortcut), place an order. Then check the queue table directly:

```bash
pnpm exec drizzle-kit studio
```

Open the `notification_queue` table in the browser UI it opens and confirm one row exists: `kind = 'confirmed'`, `status = 'pending'`, `phone_e164` matching the dev owner account's number, `message` containing the Tagalog "natanggap na po ang order niyo" copy. Then, as the staff (admin) dev account, transition that order through `packed → in_transit` on `/admin/orders` — confirm a second row appears with `kind = 'out_for_delivery'` (and none for the `packed` step). Then transition to `delivered` (or use the driver flow) — confirm a third row with `kind = 'delivered'`. Stop `drizzle-kit studio` and the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add src/server/services/orders.ts src/server/routers/admin.ts src/server/routers/driver.ts
git commit -m "feat: enqueue SMS notifications on order confirm/out-for-delivery/delivered"
```

---

### Task 7: Cron route + Vercel Cron config

**Files:**
- Create: `src/app/api/cron/notifications/route.ts`
- Create: `vercel.json`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `processNotificationQueue` from `~/server/services/notifications` (Task 5), `db` from `~/server/db` (pre-existing), `env` from `~/lib/env` (this task's own edit).

- [ ] **Step 1: Add `CRON_SECRET` to the env schema**

In `src/lib/env.ts`, add another field to the zod schema, right after the `SEMAPHORE_API_KEY` line added in Task 3:

```typescript
  CRON_SECRET: z.string().min(16).optional(),
```

And to the `parsed = schema.safeParse({...})` object literal:

```typescript
        CRON_SECRET: process.env.CRON_SECRET,
```

- [ ] **Step 2: Add the var to `.env.example`**

Append to `.env.example`, right after the `SEMAPHORE_API_KEY` block added in Task 3:

```
# Cron auth — Vercel attaches "Authorization: Bearer $CRON_SECRET" to its own
# Cron Job requests automatically once this is set; the route rejects anything else
CRON_SECRET=
```

- [ ] **Step 3: Write the route handler**

```typescript
// src/app/api/cron/notifications/route.ts
import { NextResponse } from "next/server";

import { env } from "~/lib/env";
import { db } from "~/server/db";
import { processNotificationQueue } from "~/server/services/notifications";

/**
 * Vercel Cron target (see vercel.json), hit every 5 minutes. Vercel attaches
 * "Authorization: Bearer $CRON_SECRET" to its own scheduled requests once
 * that env var is set — anything else is rejected. Without CRON_SECRET
 * configured, this route refuses every request (fails closed, same posture
 * as sendSms without SEMAPHORE_API_KEY).
 */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await processNotificationQueue(db);
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Write `vercel.json`**

```json
{
  "crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }]
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Manual verification against the dev server**

Set a `CRON_SECRET` in `.env` locally (any string 16+ characters — e.g. `openssl rand -hex 16`), restart `pnpm dev`, then:

```bash
curl -i http://localhost:3000/api/cron/notifications
```

Expected: `401 {"error":"unauthorized"}` (no auth header sent).

```bash
curl -i http://localhost:3000/api/cron/notifications -H "Authorization: Bearer <the CRON_SECRET value you set>"
```

Expected: `200 {"sent":0,"failed":N}` where `N` matches however many pending rows exist from Task 6's manual test (they'll all fail, since no `SEMAPHORE_API_KEY` is configured yet — that's the expected fail-closed behavior). Re-run `drizzle-kit studio` and confirm those rows now show `status = 'failed'`, `attempts = 1`, `last_error = 'SEMAPHORE_API_KEY not configured'`, and a `next_attempt_at` roughly 2 minutes in the future.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cron/notifications/route.ts vercel.json src/lib/env.ts .env.example
git commit -m "feat: add Vercel Cron route to process the SMS notification queue"
```

---

### Task 8: Final verification

**Files:** none (verification + roadmap update only)

- [ ] **Step 1: Full check**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. `pnpm test` should show `smsBackoff.test.ts` (2 tests) and `notificationMessage.test.ts` (3 tests) passing alongside every existing suite, with the full count reflecting both additions.

- [ ] **Step 2: Confirm the queue is inert without credentials, per the spec's core guarantee**

Re-read `src/server/services/sms.ts`'s `sendSms` and confirm: no `SEMAPHORE_API_KEY` → immediate `{ ok: false }` return, zero `fetch` calls. This is what makes it safe to deploy this whole feature before Semaphore credentials exist — it was already exercised live in Task 7 Step 6, but re-read the code once more here as a final sanity check that no path bypasses it.

- [ ] **Step 3: Update AGENTS.md's roadmap**

In `AGENTS.md`'s "Cross-cutting" section, change:

```
- [ ] SMS via Semaphore: order confirmed, out for delivery, delivered (queue + retry, don't block the mutation)
```

to:

```
- [x] SMS via Semaphore: order confirmed, out for delivery, delivered — `notification_queue` table (migration 0005) decouples enqueueing (a local insert inside the same transaction as each status change) from sending (Vercel Cron polling every 5 min, `src/app/api/cron/notifications`); `sendSms` (`src/server/services/sms.ts`) fails closed with zero network calls until a real `SEMAPHORE_API_KEY` is configured, so this ships dormant. Exponential backoff (2/4/8/16 min) over 5 total attempts before a row is permanently failed, `(order_id, kind)` unique constraint prevents double-sends across the two independent code paths (`admin.setStatus`, `driver.markDelivered`) that can both land an order on `delivered`. English SMS copy and an admin UI for failed sends are explicitly deferred — see the spec.
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: check off SMS via Semaphore in the roadmap"
```

# Tagalog date formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dates render in Tagalog (day/month names) when the app's locale is `"tl"`, everywhere the bilingual toggle already applies — without touching the machine-readable day-key formatting business logic depends on.

**Architecture:** A small hand-rolled `date-fns` `Locale` object (`fil`) overrides only `localize.month`/`localize.day` on top of `enUS`. The existing `formatManila`/`formatManilaDate`/`formatManilaTime` helpers gain an optional `locale?: Locale` parameter (the app's own `"tl"|"en"` type) that selects it. Every human-display call site — all inside client components that already read the current locale — passes it through.

**Tech Stack:** `date-fns` v4, `date-fns-tz` v3, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-06-tagalog-date-formatting-design.md` — read it for the full rationale; this plan implements it task-by-task without repeating the "why."

## Global Constraints

- Day-key calls (`formatManila(x, "yyyy-MM-dd")`) in `src/server/routers/{admin,driver,buyer,catalog}.ts` and `src/server/services/{stockouts,orders}.ts` are **never touched** — they must stay locale-invariant.
- Day/month names are translated **in place, cardinal, same token structure** as the existing English patterns (`"23 Mayo 2026"`, not `"ika-23 ng Mayo, 2026"`).
- **AM/PM is not translated** — `"h:mm a"` renders `"5:30 AM"` in both locales.
- Only `localize.month` and `localize.day` are overridden on the new `fil` Locale object; `formatLong`, `match`, `ordinalNumber`, `formatDistance`, `formatRelative` fall through to `enUS` unchanged — nothing in the app calls the tokens that would exercise them.
- `formatManila`/`formatManilaDate`/`formatManilaTime`'s new `locale?: Locale` parameter is the app's own type from `~/lib/i18n/locale` (`"tl"|"en"`), never `date-fns`'s `Locale` type — callers outside `~/lib/datetime.ts` never import or reference `fil` directly.
- Omitting the new parameter (or passing `"en"`) must produce byte-identical output to the current, unmodified behavior — every existing call site that doesn't pass it (all day-key calls) is provably unaffected.
- No `any` without a `// TODO(reason)` comment.

---

### Task 1: `fil` — the Tagalog date-fns Locale

**Files:**
- Create: `src/lib/i18n/tagalogDateLocale.ts`
- Test: `src/lib/i18n/tagalogDateLocale.test.ts`

**Interfaces:**
- Produces: `fil: Locale` (the `date-fns` `Locale` type) — consumed by Task 2's `src/lib/datetime.ts`. Nothing outside `src/lib/datetime.ts` should ever import this.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/i18n/tagalogDateLocale.test.ts
import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import { fil } from "./tagalogDateLocale";

describe("fil (Tagalog date-fns Locale)", () => {
  // 2026-05-25 is a Monday.
  const date = new Date(2026, 4, 25);

  it("renders full day and month names", () => {
    expect(format(date, "EEEE, d MMMM yyyy", { locale: fil })).toBe("Lunes, 25 Mayo 2026");
  });

  it("renders abbreviated day and month names", () => {
    expect(format(date, "EEE, d MMM", { locale: fil })).toBe("Lun, 25 May");
  });

  it("renders every month name correctly", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      format(new Date(2026, i, 1), "MMMM", { locale: fil }),
    );
    expect(months).toEqual([
      "Enero",
      "Pebrero",
      "Marso",
      "Abril",
      "Mayo",
      "Hunyo",
      "Hulyo",
      "Agosto",
      "Setyembre",
      "Oktubre",
      "Nobyembre",
      "Disyembre",
    ]);
  });

  it("renders every abbreviated month name correctly", () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      format(new Date(2026, i, 1), "MMM", { locale: fil }),
    );
    expect(months).toEqual([
      "Ene",
      "Peb",
      "Mar",
      "Abr",
      "May",
      "Hun",
      "Hul",
      "Ago",
      "Set",
      "Okt",
      "Nob",
      "Dis",
    ]);
  });

  it("renders every day name correctly", () => {
    // 2026-05-24 is a Sunday (Linggo); walk a full week from there.
    const days = Array.from({ length: 7 }, (_, i) =>
      format(new Date(2026, 4, 24 + i), "EEEE", { locale: fil }),
    );
    expect(days).toEqual([
      "Linggo",
      "Lunes",
      "Martes",
      "Miyerkules",
      "Huwebes",
      "Biyernes",
      "Sabado",
    ]);
  });

  it("renders every abbreviated day name correctly", () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      format(new Date(2026, 4, 24 + i), "EEE", { locale: fil }),
    );
    expect(days).toEqual(["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"]);
  });

  it("falls through to enUS for tokens this app never uses (AM/PM dayPeriod)", () => {
    const morning = new Date(2026, 4, 25, 8, 0);
    expect(format(morning, "h:mm a", { locale: fil })).toBe("8:00 AM");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/i18n/tagalogDateLocale.test.ts`
Expected: FAIL — `./tagalogDateLocale` has no exported member `fil` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/i18n/tagalogDateLocale.ts
import { enUS } from "date-fns/locale";
import type { Locale } from "date-fns";

const DAYS_WIDE = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
const DAYS_ABBREVIATED = ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];
const MONTHS_WIDE = [
  "Enero",
  "Pebrero",
  "Marso",
  "Abril",
  "Mayo",
  "Hunyo",
  "Hulyo",
  "Agosto",
  "Setyembre",
  "Oktubre",
  "Nobyembre",
  "Disyembre",
];
const MONTHS_ABBREVIATED = [
  "Ene",
  "Peb",
  "Mar",
  "Abr",
  "May",
  "Hun",
  "Hul",
  "Ago",
  "Set",
  "Okt",
  "Nob",
  "Dis",
];

/**
 * Filipino/Tagalog date-fns Locale. Only day and month names are translated
 * (cardinal, in place — "23 Mayo 2026", not "ika-23 ng Mayo"; AM/PM is left
 * as-is). Nothing in this app uses ordinal, formatLong (P/PP/PPP), or
 * formatDistance/formatRelative tokens, so those fall through to enUS
 * unchanged rather than shipping unverified translations with zero callers.
 */
export const fil: Locale = {
  ...enUS,
  code: "fil",
  localize: {
    ...enUS.localize,
    day: (value, options) =>
      (options?.width === "abbreviated" ? DAYS_ABBREVIATED : DAYS_WIDE)[value],
    month: (value, options) =>
      (options?.width === "abbreviated" ? MONTHS_ABBREVIATED : MONTHS_WIDE)[value],
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/i18n/tagalogDateLocale.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/tagalogDateLocale.ts src/lib/i18n/tagalogDateLocale.test.ts
git commit -m "feat: add Tagalog date-fns Locale (fil)"
```

---

### Task 2: Locale-aware `formatManila` / `formatManilaDate` / `formatManilaTime`

**Files:**
- Modify: `src/lib/datetime.ts`
- Modify: `src/lib/datetime.test.ts`

**Interfaces:**
- Consumes: `fil` from Task 1 (`~/lib/i18n/tagalogDateLocale`).
- Produces: `formatManila(utc: Date, pattern: string, locale?: Locale): string`, `formatManilaDate(utc: Date, locale?: Locale): string`, `formatManilaTime(utc: Date, locale?: Locale): string` — where `Locale` is `~/lib/i18n/locale`'s `"tl"|"en"` type. Consumed by Task 3 and Task 4's client components.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/datetime.test.ts` (inside the existing `describe("Manila formatters", ...)` block, after the existing tests — keep the existing `utc` constant and tests untouched):

```typescript
  it("formatManilaDate renders Tagalog month name when locale is 'tl'", () => {
    expect(formatManilaDate(utc, "tl")).toBe("25 Mayo 2026");
  });

  it("formatManila renders Tagalog weekday and month names when locale is 'tl'", () => {
    expect(formatManila(utc, "EEEE, d MMM yyyy", "tl")).toBe("Lunes, 25 Mayo 2026");
  });

  it("formatManilaTime keeps AM/PM as-is regardless of locale", () => {
    expect(formatManilaTime(utc, "tl")).toBe("8:00 AM");
  });

  it("defaults to English when locale is omitted or 'en'", () => {
    expect(formatManilaDate(utc)).toBe("25 May 2026");
    expect(formatManilaDate(utc, "en")).toBe("25 May 2026");
    expect(formatManila(utc, "EEEE, d MMM yyyy", "en")).toBe("Monday, 25 May 2026");
  });

  it("day-key patterns are unaffected by locale", () => {
    expect(formatManila(utc, "yyyy-MM-dd", "tl")).toBe("2026-05-25");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/datetime.test.ts`
Expected: FAIL — `formatManilaDate`/`formatManila`/`formatManilaTime` don't accept a second/third argument yet (TypeScript error) or the extra argument is silently ignored and Tagalog assertions fail.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/lib/datetime.ts` with:

```typescript
import { format, formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { fil } from "~/lib/i18n/tagalogDateLocale";
import type { Locale } from "~/lib/i18n/locale";

export const MANILA_TZ = "Asia/Manila";

/**
 * Current instant. The single permitted "now()" in the app.
 * Anywhere else that calls `new Date()` is a bug.
 */
export function now(): Date {
  return new Date();
}

/** Convert a UTC Date to a Date that represents the same wall-clock in Manila. */
export function toManila(utc: Date): Date {
  return toZonedTime(utc, MANILA_TZ);
}

/** Convert a Manila wall-clock Date to its UTC instant. */
export function fromManila(manila: Date): Date {
  return fromZonedTime(manila, MANILA_TZ);
}

/**
 * Format a UTC instant for display in Manila time. `locale` selects Tagalog
 * day/month names ("tl") or the existing English default (omitted or "en") —
 * day-key patterns like "yyyy-MM-dd" are numeric-only and unaffected either way.
 */
export function formatManila(utc: Date, pattern: string, locale?: Locale): string {
  return formatInTimeZone(utc, MANILA_TZ, pattern, locale === "tl" ? { locale: fil } : undefined);
}

/** Short Manila date, e.g. "23 May 2026" / "23 Mayo 2026". */
export function formatManilaDate(utc: Date, locale?: Locale): string {
  return formatManila(utc, "d MMM yyyy", locale);
}

/** Short Manila time, e.g. "5:30 AM" — AM/PM is not translated, same in both locales. */
export function formatManilaTime(utc: Date, locale?: Locale): string {
  return formatManila(utc, "h:mm a", locale);
}

/** Re-export for callers that genuinely need raw `format` on a zoned Date. */
export { format };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/datetime.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/datetime.ts src/lib/datetime.test.ts
git commit -m "feat: add optional locale parameter to Manila date formatters"
```

---

### Task 3: Thread locale through owner-facing screens

**Files:**
- Modify: `src/app/(owner)/orders/OrdersClient.tsx`
- Modify: `src/app/(owner)/home/HomeClient.tsx`
- Modify: `src/app/(owner)/orders/[id]/OrderDetailClient.tsx`

**Interfaces:**
- Consumes: `formatManila`/`formatManilaDate`/`formatManilaTime`'s new `locale?: Locale` param (Task 2); `useLocale()` from `~/lib/i18n/LanguageProvider` (pre-existing, exports `{ locale, setLocale }`).

- [ ] **Step 1: `OrdersClient.tsx`**

Replace the import line `import { useDictionary } from "~/lib/i18n/LanguageProvider";` with:

```typescript
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
```

In `OrdersClient()`, right after `const dict = useDictionary();`, add:

```typescript
  const { locale } = useLocale();
```

Change the one call site:

```typescript
{interpolate(dict.common.deliverOnLabel, { date: formatManilaDate(order.deliverOn, locale) })}
```

- [ ] **Step 2: `HomeClient.tsx`**

Replace these three existing import lines:

```typescript
import { useDictionary } from "~/lib/i18n/LanguageProvider";
import { interpolate } from "~/lib/i18n/interpolate";
import type { Dictionary } from "~/lib/i18n/dictionaries";
```

with:

```typescript
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
import { interpolate } from "~/lib/i18n/interpolate";
import type { Dictionary } from "~/lib/i18n/dictionaries";
import type { Locale } from "~/lib/i18n/locale";
```

Update `deliveryLabel`'s signature and its one human-display call (leave the `dayOf`/day-key logic untouched):

```typescript
/** "later this morning" / "tomorrow morning" / "Mon, 13 Jul" for the delivery day. */
function deliveryLabel(dict: Dictionary, locale: Locale, deliverOn: Date): string {
  const dayOf = (d: Date) => formatManila(d, "yyyy-MM-dd");
  const today = now();
  if (dayOf(deliverOn) === dayOf(today)) return dict.home.deliveryToday;
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  if (dayOf(deliverOn) === dayOf(tomorrow)) return dict.home.deliveryTomorrow;
  return formatManila(deliverOn, "EEE, d MMM", locale);
}
```

In `CartSheet` (the function whose props start `{ store: StoreMe; lines: ...`), right after `const dict = useDictionary();`, add:

```typescript
  const { locale } = useLocale();
```

Update both `deliveryLabel` call sites in `CartSheet` to pass `locale`:

```typescript
              when: deliveryLabel(dict, locale, placed.deliverOn),
```

and

```typescript
          {interpolate(dict.cart.deliveryNote, { when: deliveryLabel(dict, locale, deliverOn) })}
```

Do not add `useLocale()` to `HomeClient()` itself or to the other sub-components (`SheetShell`, the two other functions with their own `useDictionary()` calls) — none of them call `deliveryLabel` or `formatManila*`.

- [ ] **Step 3: `OrderDetailClient.tsx`**

Replace the import line `import { useDictionary } from "~/lib/i18n/LanguageProvider";` with:

```typescript
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
```

In `OrderDetailClient(props)`, right after `const dict = useDictionary();`, add:

```typescript
  const { locale } = useLocale();
```

Update all four human-display call sites:

```typescript
{interpolate(dict.common.deliverOnLabel, { date: formatManilaDate(order.deliverOn, locale) })}
```

```typescript
{formatManila(order.cancelledAt, "d MMM, h:mm a", locale)}
```

```typescript
{formatManila(at, "d MMM", locale)} · {formatManilaTime(at, locale)}
```

```typescript
                  time: formatManilaTime(order.cancelUntil, locale),
                  date: formatManila(order.cancelUntil, "d MMM", locale),
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(owner)/orders/OrdersClient.tsx" "src/app/(owner)/home/HomeClient.tsx" "src/app/(owner)/orders/[id]/OrderDetailClient.tsx"
git commit -m "feat: render Tagalog dates on owner-facing screens"
```

---

### Task 4: Thread locale through staff-facing screens

**Files:**
- Modify: `src/app/driver/DriverClient.tsx`
- Modify: `src/app/admin/suki/SukiClient.tsx`
- Modify: `src/app/admin/orders/OrdersBoardClient.tsx`
- Modify: `src/app/buyer/prices/PricesClient.tsx`

**Interfaces:**
- Consumes: same as Task 3 — `formatManila`/`formatManilaDate`'s `locale?: Locale` param (Task 2), `useLocale()` (pre-existing).

- [ ] **Step 1: `DriverClient.tsx`**

Replace the import line `import { useDictionary } from "~/lib/i18n/LanguageProvider";` with:

```typescript
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
```

In `DriverClient()`, right after `const dict = useDictionary();`, add:

```typescript
  const { locale } = useLocale();
```

Update the one call site:

```typescript
          <p className="mt-0.5 text-[13px] text-ink-2">{formatManilaDate(day, locale)}</p>
```

- [ ] **Step 2: `SukiClient.tsx`**

Replace the import line `import { useDictionary } from "~/lib/i18n/LanguageProvider";` with:

```typescript
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
```

In `StoreLedgerPanel` (the function with `props: { storeId: string }`), right after `const dict = useDictionary();`, add:

```typescript
  const { locale } = useLocale();
```

Update the one call site:

```typescript
                  {formatManila(entry.createdAt, "d MMM yyyy, h:mm a", locale)}
```

Do not add `useLocale()` to `SukiClient()` or `StoreRow` — neither calls `formatManila`.

- [ ] **Step 3: `OrdersBoardClient.tsx`**

Replace the import line `import { useDictionary } from "~/lib/i18n/LanguageProvider";` with:

```typescript
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
```

In `OrdersBoardClient()`, right after `const dict = useDictionary();`, add:

```typescript
  const { locale } = useLocale();
```

Update the one call site:

```typescript
          {interpolate(dict.admin.orders.heading, { date: formatManilaDate(board.day, locale) })}
```

- [ ] **Step 4: `PricesClient.tsx`**

Replace the import line `import { useDictionary } from "~/lib/i18n/LanguageProvider";` with:

```typescript
import { useDictionary, useLocale } from "~/lib/i18n/LanguageProvider";
```

In `PricesClient()`, right after `const dict = useDictionary();`, add:

```typescript
  const { locale } = useLocale();
```

Update the one call site:

```typescript
            {formatManila(now(), "EEEE, d MMM yyyy", locale)}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/driver/DriverClient.tsx src/app/admin/suki/SukiClient.tsx src/app/admin/orders/OrdersBoardClient.tsx src/app/buyer/prices/PricesClient.tsx
git commit -m "feat: render Tagalog dates on staff-facing screens"
```

---

### Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full check**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. `pnpm test` should show `tagalogDateLocale.test.ts` (7 tests) and the 5 new `datetime.test.ts` cases passing alongside every existing suite, with the full count reflecting all additions.

- [ ] **Step 2: Confirm no day-key call site was touched**

Run: `git diff main --stat` (or the equivalent range for this branch) and confirm the only files touched are: `src/lib/i18n/tagalogDateLocale.ts` (new), `src/lib/i18n/tagalogDateLocale.test.ts` (new), `src/lib/datetime.ts`, `src/lib/datetime.test.ts`, and the 7 client component files from Tasks 3–4. None of `src/server/routers/*.ts` or `src/server/services/{stockouts,orders}.ts` should appear in the diff — those are exactly the day-key call sites that must stay untouched.

- [ ] **Step 3: Commit** (only if Step 1 turned up fixes; otherwise nothing to commit)

```bash
git add -A
git commit -m "fix: address issues found in final verification"
```

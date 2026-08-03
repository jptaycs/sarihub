# CSV product/price import + bulk price adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins two bulk pricing tools: a CSV upload that creates/updates products+units+today's prices from a distributor pricelist, and a one-action percent/fixed price adjustment across every priced unit on the buyer price board.

**Architecture:** Two independent features sharing the append-only `daily_prices` write pattern already used by `buyer.carryOverYesterday`. Each feature's row/price math lives in a pure, DB-free function (`validateRow`, `adjustCentavos`) so it can be unit-tested directly; the DB orchestration wraps those pure functions in a `src/server/services/*.ts` file, and a thin tRPC mutation wraps the service. New dictionary keys for both UIs go into `tl.ts` (canonical) then `en.ts`.

**Tech Stack:** Next.js 15 App Router, tRPC, Drizzle/Postgres, Zod, react-hook-form, Vitest. New dependency: `papaparse` (+ `@types/papaparse`) for server-side CSV parsing.

**Spec:** `docs/superpowers/specs/2026-07-29-csv-import-bulk-price-adjust-design.md` — read it in full before starting; this plan implements it task-by-task but doesn't repeat its rationale.

## Global Constraints

- Money is integer centavos (`bigint`) end to end. The one exception is the float pass-through inside `adjustCentavos`'s percent math, which must round back to an integer immediately, in that one function.
- `now()` comes from `~/lib/datetime`, never `new Date()`.
- No `any` without a `// TODO(reason)` comment.
- Every new user-facing string (including server-emitted skipped-row reasons) goes into `src/lib/i18n/dictionaries/tl.ts` first, then `en.ts` — never a hardcoded literal in a component or service. (Zod schema validation messages are the one established exception in this codebase — every existing schema in `src/lib/schemas/` hardcodes Tagalog-only messages, e.g. `"Lagyan po ng presyo."` in `schemas/price.ts`. New schemas in this plan follow that same existing precedent, not the dictionary system.)
- Routers stay thin over `src/server/services/`.
- No schema changes / no migration — both features write through `products`, `product_units`, `daily_prices` exactly as they exist today.
- Price writes are always `INSERT`, never `UPDATE` — the 24-hour-validity append-only pattern `buyer.setPrice` and `buyer.carryOverYesterday` already use.
- **Important repo-specific gotcha discovered during planning:** the `server-only` package is *not* an installed npm dependency in this repo — every existing `src/server/services/*.ts` and `src/server/db/index.ts` file imports it as their first line, but that only resolves inside Next.js's own bundler (which special-cases the specifier). It does **not** resolve under plain Node/Vitest (confirmed: `node -e "require.resolve('server-only')"` throws `MODULE_NOT_FOUND`). This is why no existing `src/server/services/*.ts` file has a unit test today. To keep `adjustCentavos` and `validateRow` directly unit-testable (as the spec requires), this plan puts them in files that do **not** import `server-only` or anything that transitively does (i.e., they must not import `~/server/db` or any file that imports it). The DB-touching orchestration around them lives in separate sibling files that *do* carry `import "server-only"`, matching every other service file.
- CSV import always creates/reuses exactly two units per product (Individual = `piraso`/`per piece`/sort `01`, Pack = `pakete`/`pack`/sort `02`) — never touches a product's other units.
- Bulk price adjustment always applies to every active unit with a live price — no per-category/per-product scoping, no undo.

---

### Task 1: `adjustCentavos` — pure pricing math

**Files:**
- Create: `src/server/services/pricing.ts`
- Test: `src/server/services/pricing.test.ts`

**Interfaces:**
- Produces: `adjustCentavos(currentCentavos: bigint, mode: "percent" | "fixed", direction: "up" | "down", value: number): bigint` — used by Task 7's `buyer.bulkAdjustPrices` mutation.

- [ ] **Step 1: Write the failing test**

```typescript
// src/server/services/pricing.test.ts
import { describe, expect, it } from "vitest";

import { adjustCentavos } from "./pricing";

describe("adjustCentavos", () => {
  it("increases by a percentage, rounding to the nearest centavo", () => {
    expect(adjustCentavos(10000n, "percent", "up", 10)).toBe(11000n);
    expect(adjustCentavos(9999n, "percent", "up", 1)).toBe(10099n);
  });

  it("decreases by a percentage", () => {
    expect(adjustCentavos(10000n, "percent", "down", 10)).toBe(9000n);
  });

  it("increases by a fixed centavos amount", () => {
    expect(adjustCentavos(10000n, "fixed", "up", 500)).toBe(10500n);
  });

  it("decreases by a fixed centavos amount", () => {
    expect(adjustCentavos(10000n, "fixed", "down", 500)).toBe(9500n);
  });

  it("floors at 1 centavo on a steep percent markdown", () => {
    expect(adjustCentavos(100n, "percent", "down", 100)).toBe(1n);
  });

  it("floors at 1 centavo on a steep fixed markdown", () => {
    expect(adjustCentavos(100n, "fixed", "down", 500)).toBe(1n);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/server/services/pricing.test.ts`
Expected: FAIL — `./pricing` has no exported member `adjustCentavos` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/server/services/pricing.ts
// Deliberately no "import server-only" here — this is a pure function with no
// DB access, kept directly unit-testable. See the plan's Global Constraints
// note on why "server-only" can't resolve under Vitest in this repo.

const MIN_CENTAVOS = 1n;

/**
 * Adjust a live price by a percent or fixed amount, up or down. Percent math
 * necessarily passes through a float — rounded back to an integer centavos
 * value immediately, in this one function — then floored at 1 centavo so a
 * steep markdown can never zero out or go negative.
 */
export function adjustCentavos(
  currentCentavos: bigint,
  mode: "percent" | "fixed",
  direction: "up" | "down",
  value: number,
): bigint {
  const sign = direction === "up" ? 1 : -1;
  const result =
    mode === "fixed"
      ? currentCentavos + BigInt(Math.round(value)) * BigInt(sign)
      : BigInt(Math.round(Number(currentCentavos) * (1 + (sign * value) / 100)));
  return result < MIN_CENTAVOS ? MIN_CENTAVOS : result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/server/services/pricing.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/services/pricing.ts src/server/services/pricing.test.ts
git commit -m "feat: add adjustCentavos pure pricing helper"
```

---

### Task 2: `buyer.bulkAdjustPrices` mutation

**Files:**
- Modify: `src/lib/schemas/price.ts`
- Modify: `src/server/routers/buyer.ts`

**Interfaces:**
- Consumes: `adjustCentavos` from Task 1 (`src/server/services/pricing.ts`).
- Produces: `bulkAdjustPricesInput` (Zod schema + `BulkAdjustPricesInput` type) for Task 9's UI form; `buyer.bulkAdjustPrices` mutation returning `{ adjusted: number }`.

- [ ] **Step 1: Add the input schema**

Append to `src/lib/schemas/price.ts` (after `markOutOfStockInput`):

```typescript
/**
 * Bulk price adjustment — moves every active unit's live price by a percent
 * or fixed amount, up or down. `value` means differently per mode: a percent
 * (5 = 5%) for "percent", already-converted integer centavos for "fixed" —
 * same client-side pesosToCentavos() conversion point as setPriceInput.
 */
export const bulkAdjustPricesInput = z
  .object({
    mode: z.enum(["percent", "fixed"]),
    direction: z.enum(["up", "down"]),
    value: z.number(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "percent") {
      if (!(val.value > 0 && val.value <= 100)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "Sa pagitan ng 0 at 100 lang po ang porsyento.",
        });
      }
    } else if (!(Number.isInteger(val.value) && val.value > 0 && val.value <= 10_000_000)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Lagyan po ng tamang halaga.",
      });
    }
  });

export type BulkAdjustPricesInput = z.infer<typeof bulkAdjustPricesInput>;
```

- [ ] **Step 2: Add the mutation**

Modify `src/server/routers/buyer.ts`. First widen the drizzle-orm import (it currently only pulls in `and, asc, eq, sql`):

```typescript
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
```

Add the pricing import alongside the existing service import:

```typescript
import { adjustCentavos } from "~/server/services/pricing";
```

Add `bulkAdjustPricesInput` to the existing schema import line (currently `import { markOutOfStockInput, setPriceInput } from "~/lib/schemas/price";`):

```typescript
import { bulkAdjustPricesInput, markOutOfStockInput, setPriceInput } from "~/lib/schemas/price";
```

Then add the mutation as the last member of `buyerRouter`, after `markOutOfStock` (i.e. replace the router's closing `});` at the end of the file with the new mutation plus the closing brace):

```typescript
  /**
   * One action for a market-wide price swing: every active unit with a live
   * price today gets a fresh row at the adjusted price. Same 24-hour-validity
   * append-only write as setPrice/carryOverYesterday — never UPDATE.
   */
  bulkAdjustPrices: buyerProcedure.input(bulkAdjustPricesInput).mutation(async ({ ctx, input }) => {
    const at = now();
    const validUntil = addHours(at, PRICE_VALIDITY_HOURS);

    const liveRows = await ctx.db
      .selectDistinctOn([dailyPrices.productUnitId], {
        productUnitId: dailyPrices.productUnitId,
        priceCentavos: dailyPrices.priceCentavos,
      })
      .from(dailyPrices)
      .innerJoin(productUnits, eq(productUnits.id, dailyPrices.productUnitId))
      .innerJoin(products, eq(products.id, productUnits.productId))
      .where(
        and(
          eq(productUnits.isActive, true),
          eq(products.isActive, true),
          lte(dailyPrices.capturedAt, at),
          gt(dailyPrices.validUntil, at),
        ),
      )
      .orderBy(dailyPrices.productUnitId, desc(dailyPrices.capturedAt));

    if (liveRows.length === 0) {
      return { adjusted: 0 };
    }

    await ctx.db.insert(dailyPrices).values(
      liveRows.map((r) => ({
        productUnitId: r.productUnitId,
        priceCentavos: adjustCentavos(r.priceCentavos, input.mode, input.direction, input.value),
        capturedAt: at,
        validUntil,
        capturedBy: ctx.staff.userId,
      })),
    );

    return { adjusted: liveRows.length };
  }),
});
```

(Keep every other existing member of `buyerRouter` — `me`, `priceBoard`, `setPrice`, `carryOverYesterday`, `markOutOfStock` — unchanged above this addition.)

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. (No unit test for this step — it's DB-dependent router code; the codebase's established pattern is to verify mutations like this live, not with a mocked-DB unit test. `adjustCentavos` itself is already covered by Task 1.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/price.ts src/server/routers/buyer.ts
git commit -m "feat: add buyer.bulkAdjustPrices mutation"
```

---

### Task 3: Dictionary keys for the bulk-adjust UI

**Files:**
- Modify: `src/lib/i18n/dictionaries/tl.ts`
- Modify: `src/lib/i18n/dictionaries/en.ts`

**Interfaces:**
- Produces: `dict.buyerPrices.bulkAdjustButton` and `dict.buyerPrices.bulkAdjust.*` keys, consumed by Task 4's UI.

- [ ] **Step 1: Add Tagalog keys (canonical)**

In `src/lib/i18n/dictionaries/tl.ts`, inside the `buyerPrices` object, insert a new `bulkAdjustButton` string and `bulkAdjust` object immediately before the existing `errors: {` line (currently line 155):

```typescript
    bulkAdjustButton: "Ayusin ang presyo",
    bulkAdjust: {
      heading: "Ayusin ang presyo",
      modePercent: "Porsyento (%)",
      modeFixed: "Nakapirming halaga (₱)",
      directionUp: "Taasan",
      directionDown: "Babaan",
      valueLabel: "Halaga",
      valuePlaceholderPercent: "hal. 5",
      valuePlaceholderFixed: "hal. 2.00",
      affectedCount: "{count} produkto ang maaapektuhan",
      confirmPrompt: "Aayusin ang presyo ng {count} produkto. Sigurado ka ba?",
      confirmYes: "Oo",
      confirmNo: "Hindi",
      submit: "Ayusin",
      adjusting: "Inaayos…",
      cancel: "Huwag",
      resultSummary: "{adjusted} presyo ang na-update.",
    },
```

- [ ] **Step 2: Add matching English keys**

In `src/lib/i18n/dictionaries/en.ts`, inside the `buyerPrices` object, insert the mirrored keys immediately before its `errors: {` line (currently line 152):

```typescript
    bulkAdjustButton: "Adjust prices",
    bulkAdjust: {
      heading: "Adjust prices",
      modePercent: "Percent (%)",
      modeFixed: "Fixed amount (₱)",
      directionUp: "Increase",
      directionDown: "Decrease",
      valueLabel: "Amount",
      valuePlaceholderPercent: "e.g. 5",
      valuePlaceholderFixed: "e.g. 2.00",
      affectedCount: "{count} products will be affected",
      confirmPrompt: "This will adjust prices for {count} products. Are you sure?",
      confirmYes: "Yes",
      confirmNo: "No",
      submit: "Adjust",
      adjusting: "Adjusting…",
      cancel: "Cancel",
      resultSummary: "{adjusted} prices updated.",
    },
```

- [ ] **Step 3: Run the dictionary parity test**

Run: `pnpm vitest run src/lib/i18n/dictionaries.test.ts`
Expected: PASS — `tl` and `en` have identical key shapes, every value non-empty.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/tl.ts src/lib/i18n/dictionaries/en.ts
git commit -m "feat: add bulk price adjustment dictionary keys"
```

---

### Task 4: Bulk price adjustment UI on `/buyer/prices`

**Files:**
- Modify: `src/app/buyer/prices/PricesClient.tsx`

**Interfaces:**
- Consumes: `trpc.buyer.bulkAdjustPrices` (Task 2), `dict.buyerPrices.bulkAdjustButton` / `dict.buyerPrices.bulkAdjust.*` (Task 3), `pesosToCentavos` from `~/lib/format` (already imported in this file).

- [ ] **Step 1: Add the bulk-adjust button and panel**

In `src/app/buyer/prices/PricesClient.tsx`, add local state and a new panel to `PricesClient`. Replace the current function body (everything from `export function PricesClient()` through its closing `}`) with:

```typescript
export function PricesClient() {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const boardQuery = trpc.buyer.priceBoard.useQuery();
  const carryOver = trpc.buyer.carryOverYesterday.useMutation({
    onSuccess() {
      void utils.buyer.priceBoard.invalidate();
    },
  });
  const [adjusting, setAdjusting] = useState(false);

  if (boardQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (boardQuery.error || !boardQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  const board = boardQuery.data;
  const allUnits = board.products.flatMap((p) => p.units);
  const unpriced = allUnits.filter((u) => u.todayCentavos === null && !u.outOfStockToday);
  const carryable = unpriced.filter((u) => u.previousCentavos !== null);
  const pricedCount = allUnits.filter((u) => u.todayCentavos !== null).length;

  return (
    <div>
      <header className="flex items-start justify-between py-3">
        <div>
          <h1 className="title-large">{dict.buyerPrices.title}</h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {formatManila(now(), "EEEE, d MMM yyyy")}
          </p>
        </div>
        <Link
          href="/profile"
          aria-label={dict.nav.profileAria}
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-pill border border-hair-strong bg-white text-ink-2 active:bg-surface-2"
        >
          <CircleUser size={22} strokeWidth={1.75} />
        </Link>
      </header>

      {unpriced.length > 0 ? (
        <div className="mb-3 rounded-md bg-warning-soft px-3.5 py-3">
          <p className="text-[13px] font-medium text-warning">
            {interpolate(dict.buyerPrices.unpricedWarning, { count: unpriced.length })}
          </p>
          {carryable.length > 0 && (
            <Button
              block
              className="mt-2.5"
              disabled={carryOver.isPending}
              onClick={() => carryOver.mutate()}
            >
              {carryOver.isPending
                ? dict.buyerPrices.carryingOver
                : interpolate(dict.buyerPrices.carryOverButton, { count: carryable.length })}
            </Button>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-md bg-success-soft px-3.5 py-3 text-[13px] font-medium text-success">
          {dict.buyerPrices.allPriced}
        </div>
      )}

      {carryOver.error && (
        <p className="mb-3 text-[13px] font-medium text-danger">{carryOver.error.message}</p>
      )}

      {!adjusting && (
        <Button variant="secondary" block className="mb-3" onClick={() => setAdjusting(true)}>
          {dict.buyerPrices.bulkAdjustButton}
        </Button>
      )}
      {adjusting && (
        <BulkAdjustPanel pricedCount={pricedCount} onDone={() => setAdjusting(false)} />
      )}

      {board.products.map((product) => (
        <ProductPriceGroup key={product.id} product={product} />
      ))}
    </div>
  );
}

function BulkAdjustPanel(props: { pricedCount: number; onDone: () => void }) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [rawValue, setRawValue] = useState("");
  const [confirming, setConfirming] = useState(false);

  const bulkAdjust = trpc.buyer.bulkAdjustPrices.useMutation({
    onSuccess() {
      setConfirming(false);
      void utils.buyer.priceBoard.invalidate();
    },
  });

  const value = mode === "percent" ? Number(rawValue) : pesosToCentavos(rawValue);
  const canSubmit =
    mode === "percent"
      ? Number.isFinite(value) && (value as number) > 0 && (value as number) <= 100
      : typeof value === "number" && value > 0;

  if (bulkAdjust.data) {
    return (
      <div className="mb-3 rounded-md bg-success-soft px-3.5 py-3 text-[13px] font-medium text-success">
        {interpolate(dict.buyerPrices.bulkAdjust.resultSummary, { adjusted: bulkAdjust.data.adjusted })}
        <Button variant="secondary" block className="mt-2.5" onClick={props.onDone}>
          {dict.buyerPrices.bulkAdjust.cancel}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-md border border-hair bg-white px-4 py-3.5">
      <h3 className="text-[14px] font-medium">{dict.buyerPrices.bulkAdjust.heading}</h3>

      <div className="mt-2.5 flex gap-2">
        <Button
          variant={mode === "percent" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setMode("percent")}
        >
          {dict.buyerPrices.bulkAdjust.modePercent}
        </Button>
        <Button
          variant={mode === "fixed" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setMode("fixed")}
        >
          {dict.buyerPrices.bulkAdjust.modeFixed}
        </Button>
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          variant={direction === "up" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setDirection("up")}
        >
          {dict.buyerPrices.bulkAdjust.directionUp}
        </Button>
        <Button
          variant={direction === "down" ? "primary" : "secondary"}
          className="flex-1"
          onClick={() => setDirection("down")}
        >
          {dict.buyerPrices.bulkAdjust.directionDown}
        </Button>
      </div>

      <label className="mt-2.5 block text-[13px] text-ink-2">
        {dict.buyerPrices.bulkAdjust.valueLabel}
        <input
          inputMode="decimal"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          placeholder={
            mode === "percent"
              ? dict.buyerPrices.bulkAdjust.valuePlaceholderPercent
              : dict.buyerPrices.bulkAdjust.valuePlaceholderFixed
          }
          className="mt-1 h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px]"
        />
      </label>

      {canSubmit && (
        <p className="mt-2 text-[13px] text-ink-2">
          {interpolate(dict.buyerPrices.bulkAdjust.affectedCount, { count: props.pricedCount })}
        </p>
      )}

      {!confirming ? (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" block onClick={props.onDone}>
            {dict.buyerPrices.bulkAdjust.cancel}
          </Button>
          <Button block disabled={!canSubmit} onClick={() => setConfirming(true)}>
            {dict.buyerPrices.bulkAdjust.submit}
          </Button>
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-warning-soft px-3 py-2.5">
          <p className="text-[13px] font-medium text-warning">
            {interpolate(dict.buyerPrices.bulkAdjust.confirmPrompt, { count: props.pricedCount })}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              block
              disabled={bulkAdjust.isPending}
              onClick={() => setConfirming(false)}
            >
              {dict.buyerPrices.bulkAdjust.confirmNo}
            </Button>
            <Button
              block
              disabled={bulkAdjust.isPending || !canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                bulkAdjust.mutate({ mode, direction, value: value as number });
              }}
            >
              {bulkAdjust.isPending ? dict.buyerPrices.bulkAdjust.adjusting : dict.buyerPrices.bulkAdjust.confirmYes}
            </Button>
          </div>
        </div>
      )}

      {bulkAdjust.error && (
        <p className="mt-2 text-[13px] font-medium text-danger">{bulkAdjust.error.message}</p>
      )}
    </div>
  );
}
```

Leave `ProductPriceGroup` and `UnitPriceRow` below this untouched.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Manual check with the dev server**

Run: `pnpm dev`, sign in as the buyer test account, open `/buyer/prices`, click "Ayusin ang presyo" / "Adjust prices", try both percent and fixed modes, confirm the two-step gate, confirm the price board refetches with new prices after submit. This exercises the live Supabase project per AGENTS.md's "verified live" bar — do this for real, don't just eyeball the JSX.

- [ ] **Step 4: Commit**

```bash
git add src/app/buyer/prices/PricesClient.tsx
git commit -m "feat: add bulk price adjustment UI to the buyer price board"
```

---

### Task 5: `validateRow` — pure CSV row validation

**Files:**
- Create: `src/server/services/catalogImportValidation.ts`
- Test: `src/server/services/catalogImportValidation.test.ts`
- Modify: `src/lib/i18n/dictionaries/tl.ts`
- Modify: `src/lib/i18n/dictionaries/en.ts`

**Interfaces:**
- Produces: `ValidatedRow` type, `RowValidationResult` type, `validateRow(raw: Record<string, string | undefined>, errors: CsvImportErrorDict): RowValidationResult` — consumed by Task 6's `catalogImport.ts`.

- [ ] **Step 1: Add the error-message dictionary keys first (validateRow's messages come from here)**

In `src/lib/i18n/dictionaries/tl.ts`, inside the `admin.catalog` object, insert a new `csvImport` object immediately after the existing `unitActive: "Aktibo",` line (currently line 224, right before the `},` that closes `catalog`):

```typescript
      csvImport: {
        errors: {
          emptyFile: "Walang laman ang file.",
          blankName: "Kailangan ang pangalan.",
          unknownCategory: "Hindi kilalang kategorya: \"{value}\".",
          malformedPrice: "Hindi tamang presyo ({field}): \"{value}\".",
        },
      },
```

In `src/lib/i18n/dictionaries/en.ts`, inside the `admin.catalog` object, insert the mirrored keys immediately after `unitActive: "Active",` (currently line 221):

```typescript
      csvImport: {
        errors: {
          emptyFile: "The file is empty.",
          blankName: "Name is required.",
          unknownCategory: "Unrecognized category: \"{value}\".",
          malformedPrice: "Invalid price ({field}): \"{value}\".",
        },
      },
```

(Task 8 will add the rest of `csvImport`'s keys — the upload UI copy — as a sibling of `errors` in this same object.)

- [ ] **Step 2: Write the failing test**

```typescript
// src/server/services/catalogImportValidation.test.ts
import { describe, expect, it } from "vitest";

import { getDictionary } from "~/lib/i18n/dictionaries";

import { validateRow } from "./catalogImportValidation";

const errors = getDictionary("tl").admin.catalog.csvImport.errors;

describe("validateRow", () => {
  it("accepts a valid row with both prices", () => {
    expect(
      validateRow(
        { name: "Sibuyas", category: "gulay", pack_price: "161.00", individual_price: "15" },
        errors,
      ),
    ).toEqual({
      ok: true,
      row: { name: "Sibuyas", category: "gulay", packCentavos: 16100, individualCentavos: 1500 },
    });
  });

  it("treats blank prices as 'no price this round', not an error", () => {
    expect(
      validateRow({ name: "Kamatis", category: "gulay", pack_price: "", individual_price: "" }, errors),
    ).toEqual({
      ok: true,
      row: { name: "Kamatis", category: "gulay", packCentavos: null, individualCentavos: null },
    });
  });

  it("matches category case-insensitively", () => {
    expect(
      validateRow({ name: "Sibuyas", category: "GULAY", pack_price: "", individual_price: "" }, errors),
    ).toEqual({
      ok: true,
      row: { name: "Sibuyas", category: "gulay", packCentavos: null, individualCentavos: null },
    });
  });

  it("rejects a blank name", () => {
    expect(
      validateRow({ name: "  ", category: "gulay", pack_price: "1", individual_price: "" }, errors),
    ).toEqual({ ok: false, reason: errors.blankName });
  });

  it("rejects an unknown category", () => {
    const result = validateRow(
      { name: "Sibuyas", category: "prutas", pack_price: "", individual_price: "" },
      errors,
    );
    expect(result).toEqual({ ok: false, reason: 'Hindi kilalang kategorya: "prutas".' });
  });

  it("rejects a malformed price", () => {
    const result = validateRow(
      { name: "Sibuyas", category: "gulay", pack_price: "abc", individual_price: "" },
      errors,
    );
    expect(result).toEqual({ ok: false, reason: 'Hindi tamang presyo (pack_price): "abc".' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/server/services/catalogImportValidation.test.ts`
Expected: FAIL — module `./catalogImportValidation` doesn't exist yet.

- [ ] **Step 4: Write minimal implementation**

```typescript
// src/server/services/catalogImportValidation.ts
// Deliberately no "import server-only" here — pure, DB-free row validation
// kept directly unit-testable. See the plan's Global Constraints note.

import { interpolate } from "~/lib/i18n/interpolate";
import { pesosToCentavos } from "~/lib/format";
import type { ProductCategory } from "~/server/db/schema";

const VALID_CATEGORIES: readonly ProductCategory[] = ["gulay", "itlog", "isda", "kusina"];

export type CsvImportErrorDict = {
  emptyFile: string;
  blankName: string;
  unknownCategory: string;
  malformedPrice: string;
};

export type ValidatedRow = {
  name: string;
  category: ProductCategory;
  /** null = "don't set a price for that unit this round", not an error. */
  packCentavos: number | null;
  individualCentavos: number | null;
};

export type RowValidationResult = { ok: true; row: ValidatedRow } | { ok: false; reason: string };

/** Validates and normalizes one parsed CSV row. Pure — no DB, unit-tested directly. */
export function validateRow(
  raw: Record<string, string | undefined>,
  errors: CsvImportErrorDict,
): RowValidationResult {
  const name = (raw.name ?? "").trim();
  if (!name) return { ok: false, reason: errors.blankName };

  const categoryRaw = (raw.category ?? "").trim().toLowerCase();
  const category = VALID_CATEGORIES.find((c) => c === categoryRaw);
  if (!category) {
    return { ok: false, reason: interpolate(errors.unknownCategory, { value: raw.category ?? "" }) };
  }

  const packRaw = (raw.pack_price ?? "").trim();
  const packCentavos = packRaw ? pesosToCentavos(packRaw) : null;
  if (packRaw && packCentavos === null) {
    return {
      ok: false,
      reason: interpolate(errors.malformedPrice, { field: "pack_price", value: packRaw }),
    };
  }

  const individualRaw = (raw.individual_price ?? "").trim();
  const individualCentavos = individualRaw ? pesosToCentavos(individualRaw) : null;
  if (individualRaw && individualCentavos === null) {
    return {
      ok: false,
      reason: interpolate(errors.malformedPrice, { field: "individual_price", value: individualRaw }),
    };
  }

  return { ok: true, row: { name, category, packCentavos, individualCentavos } };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/server/services/catalogImportValidation.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Run the dictionary parity test too**

Run: `pnpm vitest run src/lib/i18n/dictionaries.test.ts`
Expected: PASS (the `csvImport.errors` keys you added to both files must match in shape).

- [ ] **Step 7: Commit**

```bash
git add src/server/services/catalogImportValidation.ts src/server/services/catalogImportValidation.test.ts src/lib/i18n/dictionaries/tl.ts src/lib/i18n/dictionaries/en.ts
git commit -m "feat: add pure CSV row validation for catalog import"
```

---

### Task 6: `importCatalogCsv` — CSV parsing + DB orchestration

**Files:**
- Create: `src/server/services/catalogImport.ts`
- Modify: `package.json` (new dependency)

**Interfaces:**
- Consumes: `validateRow`, `CsvImportErrorDict` from Task 5 (`~/server/services/catalogImportValidation`).
- Produces: `ImportCsvResult` type, `importCatalogCsv(db: Db, csvText: string, capturedBy: string, errors: CsvImportErrorDict): Promise<ImportCsvResult>` — consumed by Task 7's `admin.catalog.importCsv` mutation.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add papaparse && pnpm add -D @types/papaparse`
Expected: `package.json` gains `papaparse` under `dependencies` and `@types/papaparse` under `devDependencies`.

- [ ] **Step 2: Write the service**

```typescript
// src/server/services/catalogImport.ts
import "server-only";

import { addHours } from "date-fns";
import Papa from "papaparse";
import { and, eq, sql } from "drizzle-orm";

import { now } from "~/lib/datetime";
import { db as defaultDb } from "~/server/db";
import { dailyPrices, productUnits, products } from "~/server/db/schema";

import { validateRow, type CsvImportErrorDict, type ValidatedRow } from "./catalogImportValidation";

type Db = typeof defaultDb;

/** New price rows are good for 24 hours, same convention as buyer.setPrice. */
const PRICE_VALIDITY_HOURS = 24;
/** Rows beyond this are silently dropped — the format hint states the cap. */
const MAX_ROWS = 1000;

export type ImportCsvResult = {
  created: number;
  updated: number;
  priceRowsInserted: number;
  skipped: Array<{ row: number; reason: string }>;
};

const UNIT_SPECS = [
  { labelTl: "piraso", labelEn: "per piece", sortOrder: "01", priceField: "individualCentavos" as const },
  { labelTl: "pakete", labelEn: "pack", sortOrder: "02", priceField: "packCentavos" as const },
];

/**
 * Import a distributor pricelist CSV: header row `name, category, pack_price,
 * individual_price` (any order, case-insensitive). Best-effort per row — one
 * bad row is skipped and reported, the rest of the upload still lands, each
 * row in its own transaction so one failure can't roll back another row's
 * success.
 */
export async function importCatalogCsv(
  db: Db,
  csvText: string,
  capturedBy: string,
  errors: CsvImportErrorDict,
): Promise<ImportCsvResult> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.data.length === 0) {
    return { created: 0, updated: 0, priceRowsInserted: 0, skipped: [{ row: 0, reason: errors.emptyFile }] };
  }

  const rows = parsed.data.slice(0, MAX_ROWS);
  let created = 0;
  let updated = 0;
  let priceRowsInserted = 0;
  const skipped: Array<{ row: number; reason: string }> = [];

  for (const [index, raw] of rows.entries()) {
    const rowNum = index + 2; // +1 for 0-index, +1 for the header row
    const validation = validateRow(raw, errors);
    if (!validation.ok) {
      skipped.push({ row: rowNum, reason: validation.reason });
      continue;
    }
    try {
      const result = await importOneRow(db, validation.row, capturedBy);
      if (result.createdProduct) created++;
      else updated++;
      priceRowsInserted += result.priceRowsInserted;
    } catch (error) {
      skipped.push({ row: rowNum, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  return { created, updated, priceRowsInserted, skipped };
}

async function importOneRow(
  db: Db,
  row: ValidatedRow,
  capturedBy: string,
): Promise<{ createdProduct: boolean; priceRowsInserted: number }> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(sql`lower(${products.nameTl}) = lower(${row.name})`)
      .limit(1);

    let productId: string;
    let createdProduct = false;
    if (existing) {
      productId = existing.id;
      await tx.update(products).set({ category: row.category }).where(eq(products.id, productId));
    } else {
      const [inserted] = await tx
        .insert(products)
        .values({
          nameTl: row.name,
          nameEn: row.name,
          category: row.category,
          isPerishable: true,
          source: "palengke",
        })
        .returning({ id: products.id });
      productId = inserted!.id;
      createdProduct = true;
    }

    const at = now();
    const validUntil = addHours(at, PRICE_VALIDITY_HOURS);
    let priceRowsInserted = 0;

    for (const spec of UNIT_SPECS) {
      const [existingUnit] = await tx
        .select({ id: productUnits.id })
        .from(productUnits)
        .where(and(eq(productUnits.productId, productId), eq(productUnits.labelTl, spec.labelTl)))
        .limit(1);

      let unitId: string;
      if (existingUnit) {
        unitId = existingUnit.id;
      } else {
        const [insertedUnit] = await tx
          .insert(productUnits)
          .values({
            productId,
            labelTl: spec.labelTl,
            labelEn: spec.labelEn,
            sortOrder: spec.sortOrder,
            weightGrams: null,
          })
          .returning({ id: productUnits.id });
        unitId = insertedUnit!.id;
      }

      const centavos = row[spec.priceField];
      if (centavos !== null) {
        await tx.insert(dailyPrices).values({
          productUnitId: unitId,
          priceCentavos: BigInt(centavos),
          capturedAt: at,
          validUntil,
          capturedBy,
        });
        priceRowsInserted++;
      }
    }

    return { createdProduct, priceRowsInserted };
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. (No unit test here — this file is DB-dependent orchestration; `validateRow`, the part the spec calls out for unit testing, is already covered in Task 5. This file gets its correctness check from Task 7's live verification.)

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/server/services/catalogImport.ts
git commit -m "feat: add CSV catalog/price import service"
```

---

### Task 7: `admin.catalog.importCsv` mutation

**Files:**
- Modify: `src/lib/schemas/admin.ts`
- Modify: `src/server/routers/admin.ts`

**Interfaces:**
- Consumes: `importCatalogCsv` from Task 6 (`~/server/services/catalogImport`).
- Produces: `importCsvInput` schema, `admin.catalog.importCsv` mutation returning `ImportCsvResult` (Task 6's type) — consumed by Task 8's UI.

- [ ] **Step 1: Add the input schema**

Append to `src/lib/schemas/admin.ts` (end of file, after `updateStoreInput`):

```typescript
export const importCsvInput = z.object({
  /** Raw CSV text, already read client-side via file.text() — one parser, server-side only. */
  csv: z.string().trim().min(1, "Walang laman ang file."),
});
export type ImportCsvInput = z.infer<typeof importCsvInput>;
```

- [ ] **Step 2: Wire the mutation**

Modify `src/server/routers/admin.ts`. Add `importCsvInput` to the existing schema import (currently listing `createStoreInput, recordAdjustmentInput, recordPaymentInput, setOrderStatusInput, updateStoreInput, upsertProductInput, upsertUnitInput`):

```typescript
import {
  createStoreInput,
  importCsvInput,
  recordAdjustmentInput,
  recordPaymentInput,
  setOrderStatusInput,
  updateStoreInput,
  upsertProductInput,
  upsertUnitInput,
} from "~/lib/schemas/admin";
```

Add the service import:

```typescript
import { importCatalogCsv } from "~/server/services/catalogImport";
```

Add the mutation as the last member of `catalogAdminRouter`, right after `upsertUnit` (i.e. insert before the router's closing `});`, currently at line 225):

```typescript
  importCsv: adminProcedure.input(importCsvInput).mutation(async ({ ctx, input }) => {
    const errors = getDictionary(ctx.locale).admin.catalog.csvImport.errors;
    return importCatalogCsv(ctx.db, input.csv, ctx.staff.userId, errors);
  }),
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/admin.ts src/server/routers/admin.ts
git commit -m "feat: add admin.catalog.importCsv mutation"
```

---

### Task 8: Dictionary keys for the CSV upload UI

**Files:**
- Modify: `src/lib/i18n/dictionaries/tl.ts`
- Modify: `src/lib/i18n/dictionaries/en.ts`

**Interfaces:**
- Produces: `dict.admin.catalog.csvImport.{uploadButton,panelHeading,formatHint,fileLabel,submit,uploading,cancel,resultSummary,skippedHeading,skippedRow}`, consumed by Task 9's UI. (Task 5 already added `dict.admin.catalog.csvImport.errors`.)

- [ ] **Step 1: Extend the Tagalog `csvImport` object**

In `src/lib/i18n/dictionaries/tl.ts`, the `csvImport` object currently reads (from Task 5):

```typescript
      csvImport: {
        errors: {
          emptyFile: "Walang laman ang file.",
          blankName: "Kailangan ang pangalan.",
          unknownCategory: "Hindi kilalang kategorya: \"{value}\".",
          malformedPrice: "Hindi tamang presyo ({field}): \"{value}\".",
        },
      },
```

Replace it with (adding UI-copy keys as siblings of `errors`):

```typescript
      csvImport: {
        uploadButton: "I-upload ang presyo (CSV)",
        panelHeading: "Mag-upload ng presyo (CSV)",
        formatHint:
          "Header: name, category, pack_price, individual_price. Halimbawa: Sibuyas,gulay,161.00,15.00",
        fileLabel: "Piliin ang CSV file",
        submit: "I-upload",
        uploading: "Ina-a-upload…",
        cancel: "Huwag",
        resultSummary: "{created} bagong produkto, {updated} na-update, {priceRowsInserted} presyong nailagay.",
        skippedHeading: "Mga row na na-skip ({count})",
        skippedRow: "Row {row}: {reason}",
        errors: {
          emptyFile: "Walang laman ang file.",
          blankName: "Kailangan ang pangalan.",
          unknownCategory: "Hindi kilalang kategorya: \"{value}\".",
          malformedPrice: "Hindi tamang presyo ({field}): \"{value}\".",
        },
      },
```

- [ ] **Step 2: Extend the English `csvImport` object**

In `src/lib/i18n/dictionaries/en.ts`, replace the Task 5 version:

```typescript
      csvImport: {
        errors: {
          emptyFile: "The file is empty.",
          blankName: "Name is required.",
          unknownCategory: "Unrecognized category: \"{value}\".",
          malformedPrice: "Invalid price ({field}): \"{value}\".",
        },
      },
```

with:

```typescript
      csvImport: {
        uploadButton: "Upload prices (CSV)",
        panelHeading: "Upload prices from CSV",
        formatHint:
          "Header: name, category, pack_price, individual_price. Example: Sibuyas,gulay,161.00,15.00",
        fileLabel: "Choose a CSV file",
        submit: "Upload",
        uploading: "Uploading…",
        cancel: "Cancel",
        resultSummary: "{created} new products, {updated} updated, {priceRowsInserted} prices set.",
        skippedHeading: "Skipped rows ({count})",
        skippedRow: "Row {row}: {reason}",
        errors: {
          emptyFile: "The file is empty.",
          blankName: "Name is required.",
          unknownCategory: "Unrecognized category: \"{value}\".",
          malformedPrice: "Invalid price ({field}): \"{value}\".",
        },
      },
```

- [ ] **Step 3: Run the dictionary parity test**

Run: `pnpm vitest run src/lib/i18n/dictionaries.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/tl.ts src/lib/i18n/dictionaries/en.ts
git commit -m "feat: add CSV upload UI dictionary keys"
```

---

### Task 9: CSV upload UI on `/admin/catalog`

**Files:**
- Modify: `src/app/admin/catalog/CatalogClient.tsx`

**Interfaces:**
- Consumes: `trpc.admin.catalog.importCsv` (Task 7), `dict.admin.catalog.csvImport.*` (Tasks 5 + 8).

- [ ] **Step 1: Add the upload button and panel**

In `src/app/admin/catalog/CatalogClient.tsx`, modify the top of `CatalogClient` to track a second panel and render the new button next to "New product". Replace:

```typescript
export function CatalogClient() {
  const dict = useDictionary();
  const catalogQuery = trpc.admin.catalog.list.useQuery();
  const [creating, setCreating] = useState(false);

  if (catalogQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (catalogQuery.error || !catalogQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="title-large">{dict.admin.catalog.title}</h2>
        {!creating && (
          <Button onClick={() => setCreating(true)}>{dict.admin.catalog.newProduct}</Button>
        )}
      </div>

      {creating && (
        <div className="mt-3 rounded-md border border-hair bg-white px-4 py-4">
          <h3 className="text-[14px] font-medium">{dict.admin.catalog.newProductHeading}</h3>
          <ProductForm onDone={() => setCreating(false)} />
        </div>
      )}

      <div className="mt-3">
        {catalogQuery.data.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

with:

```typescript
export function CatalogClient() {
  const dict = useDictionary();
  const catalogQuery = trpc.admin.catalog.list.useQuery();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (catalogQuery.isLoading) {
    return <p className="pt-8 text-center text-[13px] text-ink-2">{dict.common.loading}</p>;
  }
  if (catalogQuery.error || !catalogQuery.data) {
    return (
      <p className="pt-8 text-center text-[13px] text-danger">{dict.common.connectionError}</p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="title-large">{dict.admin.catalog.title}</h2>
        <div className="flex gap-1.5">
          {!uploading && (
            <Button variant="secondary" onClick={() => setUploading(true)}>
              {dict.admin.catalog.csvImport.uploadButton}
            </Button>
          )}
          {!creating && (
            <Button onClick={() => setCreating(true)}>{dict.admin.catalog.newProduct}</Button>
          )}
        </div>
      </div>

      {uploading && <CsvImportPanel onDone={() => setUploading(false)} />}

      {creating && (
        <div className="mt-3 rounded-md border border-hair bg-white px-4 py-4">
          <h3 className="text-[14px] font-medium">{dict.admin.catalog.newProductHeading}</h3>
          <ProductForm onDone={() => setCreating(false)} />
        </div>
      )}

      <div className="mt-3">
        {catalogQuery.data.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function CsvImportPanel(props: { onDone: () => void }) {
  const dict = useDictionary();
  const utils = trpc.useUtils();
  const importCsv = trpc.admin.catalog.importCsv.useMutation({
    onSuccess() {
      void utils.admin.catalog.list.invalidate();
    },
  });

  return (
    <div className="mt-3 rounded-md border border-hair bg-white px-4 py-4">
      <h3 className="text-[14px] font-medium">{dict.admin.catalog.csvImport.panelHeading}</h3>
      <p className="mt-1 text-[13px] text-ink-2">{dict.admin.catalog.csvImport.formatHint}</p>

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[13px] text-ink-2">{dict.admin.catalog.csvImport.fileLabel}</span>
        <input
          type="file"
          accept=".csv"
          disabled={importCsv.isPending}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const csv = await file.text();
            importCsv.mutate({ csv });
            e.target.value = "";
          }}
          className="block w-full text-[13px]"
        />
      </label>

      {importCsv.isPending && (
        <p className="mt-2 text-[13px] text-ink-2">{dict.admin.catalog.csvImport.uploading}</p>
      )}

      {importCsv.error && (
        <p className="mt-2 text-[13px] font-medium text-danger">{importCsv.error.message}</p>
      )}

      {importCsv.data && (
        <div className="mt-2.5 rounded-md bg-success-soft px-3 py-2.5 text-[13px] text-success">
          <p className="font-medium">
            {interpolate(dict.admin.catalog.csvImport.resultSummary, {
              created: importCsv.data.created,
              updated: importCsv.data.updated,
              priceRowsInserted: importCsv.data.priceRowsInserted,
            })}
          </p>
          {importCsv.data.skipped.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-warning">
                {interpolate(dict.admin.catalog.csvImport.skippedHeading, {
                  count: importCsv.data.skipped.length,
                })}
              </p>
              <ul className="mt-1 list-disc pl-4 text-ink-2">
                {importCsv.data.skipped.map((s) => (
                  <li key={s.row}>
                    {interpolate(dict.admin.catalog.csvImport.skippedRow, { row: s.row, reason: s.reason })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Button variant="secondary" block className="mt-3" onClick={props.onDone}>
        {dict.admin.catalog.csvImport.cancel}
      </Button>
    </div>
  );
}
```

No new imports are needed for this step — `interpolate`, `Button`, `useDictionary`, and `trpc` are already imported at the top of this file.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Manual check with the dev server**

Run: `pnpm dev`, sign in as admin, open `/admin/catalog`, click "I-upload ang presyo (CSV)" / "Upload prices (CSV)". Test against the live Supabase project per AGENTS.md's "verified live" bar:
- A CSV with a new product name → confirm it appears in the catalog list with two units (piraso/pakete) and today's prices on `/buyer/prices`.
- Re-upload the same CSV with a different `category` → confirm the existing product's category changed, not duplicated.
- A CSV with one malformed row (bad category or unparseable price) mixed with valid rows → confirm the valid rows land and the bad row shows up in the skipped-rows list with a readable reason.
- A row with a blank `pack_price` → confirm the Pack unit is created (or reused) but gets no price row.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/catalog/CatalogClient.tsx
git commit -m "feat: add CSV catalog/price upload UI to admin catalog"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full check**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. `pnpm test` should show the new suites (`pricing.test.ts`, `catalogImportValidation.test.ts`) passing alongside the existing ones, and `dictionaries.test.ts` still passing with the new keys.

- [ ] **Step 2: Re-confirm both features live**

Re-run the manual checks from Task 4 Step 3 (bulk price adjustment) and Task 9 Step 3 (CSV import) against the live "Sarihub" Supabase project in one sitting, back to back, to catch any interaction between them (e.g. upload a CSV, then bulk-adjust, then confirm the price board reflects both in the right order).

- [ ] **Step 3: Commit** (only if Step 1/2 turned up fixes; otherwise nothing to commit)

```bash
git add -A
git commit -m "fix: address issues found in final verification"
```

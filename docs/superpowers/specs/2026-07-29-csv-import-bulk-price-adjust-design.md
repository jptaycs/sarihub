# CSV product/price import + bulk price adjustment

## Why

Two admin-side bulk pricing tools, requested together:

1. The admin gets a CSV pricelist from the distributor's sourcing team and
   currently has to enter every product one at a time via the catalog form.
2. Wet-market prices swing as a block (fuel cost, a bad harvest week) and
   the admin currently has to re-key every affected unit's price by hand on
   the buyer price board to reflect a general move up or down.

Both write into the same pricing data (`daily_prices`), so they're
specified together, but they are independent features that can ship and be
tested separately.

## Existing precedent

- `buyer.carryOverYesterday` is the existing bulk-write into `daily_prices`:
  one `INSERT ... SELECT` that fills in a fresh price row for every active
  unit that doesn't have a live price yet, in the same append-only,
  24-hour-validity pattern every price write uses. Both new features follow
  this same shape (new rows only, never `UPDATE`).
- `admin.catalog.upsertProduct` / `upsertUnit` are the existing
  create-or-update pattern for products and units (`id` present → update,
  absent → insert), which the CSV import's per-row logic mirrors.
- `~/lib/format.ts`'s `pesosToCentavos()` is already the single conversion
  point from a user-typed peso string to integer centavos; both features
  reuse it rather than re-implementing peso parsing.
- `buyerProcedure` already permits the `admin` role ("Admins can also
  operate them"), and the admin sidebar's "Presyo" link already points at
  `/buyer/prices` — admin already has a foot in that screen today.

## Scope

### 1. CSV product/price import

**Where:** `/admin/catalog`, new "Upload presyo (CSV)" button next to "New
product," opening an inline panel (file picker + short format hint: the 4
column names and one example row).

**Format:** UTF-8 `.csv`, header row required (case-insensitive, any
column order): `name`, `category`, `pack_price`, `individual_price`. Max
1000 data rows per upload. `pack_price` / `individual_price` are peso
strings (`"161.00"`, `"161"`) parsed via `pesosToCentavos()`; either may be
blank, meaning "don't set a price for that unit this round" (not an
error).

**Parsing:** server-side only, via a new `papaparse` dependency (handles
quoted fields / embedded commas from real Excel-or-Sheets exports — a
correctness trap to hand-roll). The client reads the file as raw text
(`file.text()`) and sends the whole string as the mutation input; there is
exactly one parser, not a client copy and a server copy.

**New mutation:** `admin.catalog.importCsv` (`adminProcedure`), backed by a
new `src/server/services/catalogImport.ts`. Per row, best-effort (one bad
row is skipped and reported; the rest of the upload still lands):

1. Validate: `name` non-blank, `category` is one of
   `gulay|itlog|isda|kusina` (case-insensitive), each non-blank price
   parses via `pesosToCentavos()`. Any failure → skip this row, record
   `{ row, reason }`.
2. Match an existing product by case-insensitive exact match on `nameTl`,
   regardless of `isActive` (avoids duplicating a deactivated product).
   - Found: reuse it, and sync its `category` to the CSV's value (CSV is
     the refresh source of truth for name/category on re-upload).
   - Not found: create it, with `nameTl = nameEn = name` (this app's
     bilingual requirement is satisfied by using the one CSV name for
     both; the admin can edit a real English name afterward in the
     catalog UI), `isPerishable = true`, `source = "palengke"`.
3. Ensure exactly two `product_units` rows exist on the product, matched by
   `labelTl`, created if missing:
   - `labelTl: "piraso", labelEn: "per piece", sortOrder: "01"` (Individual)
   - `labelTl: "pakete", labelEn: "pack", sortOrder: "02"` (Pack)

   `weightGrams` is left `null` (not in the CSV; edited later in the
   catalog UI if the load check needs it).
4. For each unit with a non-blank price, insert one new `daily_prices` row
   (same 24-hour validity as `setPrice`, `capturedBy` = the acting admin's
   staff id).
5. Each row runs in its own transaction, so one row's failure can't roll
   back another row's success.

**Response:** `{ created, updated, priceRowsInserted, skipped: Array<{
row: number; reason: string }> }`, rendered as a summary panel (counts,
plus a skipped-rows list if any). Catalog list refetches on success.

### 2. Bulk price adjustment

**Where:** `/buyer/prices`, new "Ayusin ang presyo" button next to "carry
over from yesterday."

**New mutation:** `buyer.bulkAdjustPrices` (`buyerProcedure`), input
`{ mode: "percent" | "fixed", direction: "up" | "down", value: number }`
(`value` > 0; the `direction` supplies the sign). Backed by a new pure
function in `src/server/services/pricing.ts`:

```
adjustCentavos(currentCentavos, mode, direction, value): number
```

- `percent`: `Math.round(current * (1 ± value/100))` — the multiplication
  necessarily passes through a float (any percentage-of-an-integer
  calculation does), but the result is rounded back to an integer-centavos
  value immediately, in this one function, before it ever reaches a
  `daily_prices` insert. This isn't an exception to "money is always
  integer centavos" — it's the one place that arithmetic is allowed to
  happen, exactly like `pesosToCentavos()` already is for parsing.
- `fixed`: `current ± valueCentavos` — plain integer arithmetic, no float
  involved.
- floored at a **minimum of 1 centavo** either way — a documented safety
  rail so a steep "down" adjustment can never zero out or go negative; not
  expected to trigger for realistic adjustment values.

**Server flow:**

1. Read every active unit's current live price — the same "live" window
   (`captured_at <= now() < valid_until`) `priceBoard` already uses.
2. Compute each unit's new price via `adjustCentavos` in TypeScript (not
   raw SQL arithmetic), so the rounding/floor logic is one place that gets
   unit-tested directly.
3. Bulk-insert one new `daily_prices` row per affected unit in a single
   `db.insert(dailyPrices).values([...])` call — append-only, 24-hour
   validity, `capturedBy` = the acting staff id.
4. Units with no live price today are skipped (nothing to adjust) — same
   distinction `priceBoard` already draws between priced and unpriced
   units.

**Response:** `{ adjusted: number }`.

**UI flow:** inline form (percent/fixed toggle, up/down toggle, value
input). Since `/buyer/prices` already has today's live prices loaded via
the existing `priceBoard` query, the affected-unit count ("N products will
be adjusted") is computed client-side as the admin types, with no extra
network round-trip. Given this can move the entire catalog's prices in one
action, a second explicit step — "Aayusin ang presyo ng N produkto.
Sigurado ka ba?" / Oo–Hindi — gates the actual submit, the same weight the
app already gives order cancellation. On success: summary toast, price
board refetches.

### 3. Cross-cutting

- **New dependency:** `papaparse` + `@types/papaparse`.
- **No schema changes.** Both features write through the existing
  `products` / `product_units` / `daily_prices` tables exactly as they
  are today — no migration.
- **New files:** `src/server/services/catalogImport.ts`,
  `src/server/services/pricing.ts` — keeps the routers thin over services,
  per AGENTS.md's stated project structure.
- **Dictionaries:** new keys under `dict.admin.catalog` (CSV upload UI)
  and `dict.buyerPrices` (bulk-adjust UI) in both `tl.ts` and `en.ts`,
  Tagalog added first per the existing convention.
- **Testing:** unit tests for `catalogImport`'s row validation (valid row,
  blank name, unknown category, malformed price, blank-price-is-ok) and
  `pricing.ts`'s `adjustCentavos` (percent/fixed, up/down, floor-at-1
  triggering on a steep markdown) — both pure functions, no DB needed.
  Both features get verified live against the live Supabase project
  (real CSV upload, real bulk adjustment), matching this project's
  established "verified live" bar for every roadmap item; exact
  automated-e2e scope is left to the implementation plan.

## Out of scope

- CSV support for the full multi-unit model (more than 2 units per
  product). CSV always writes exactly a Pack and an Individual unit;
  products with a richer unit set from manual catalog entry keep their
  other units untouched.
- A downloadable CSV template file. The inline format hint (column names +
  one example row) is the only in-product guidance; a template file can be
  added later if it turns out to be needed.
- Per-category or per-product selection for the bulk price adjustment — it
  always applies to every active unit with a live price. A "just the
  vegetables" scoped adjustment is a possible future refinement, not part
  of this spec.
- Undo for the bulk adjustment. Because pricing is append-only, an
  over-correction is fixed the same way any price mistake is fixed today:
  run another adjustment (or a manual `setPrice`) in the opposite
  direction. There is no one-click revert.
- Editing `isPerishable`, `source`, or `isActive` via CSV — those aren't
  CSV columns; on create they take fixed defaults, on update they're left
  untouched. Managed only through the existing catalog form.

## Risks / tradeoffs

- Syncing `category` on every CSV re-upload means a typo'd category in a
  later pricelist silently overwrites a correct one set via the catalog
  UI. Accepted because CSV is meant to be the routine "refresh today's
  pricelist" action (confirmed during design), so it should win.
- Using one CSV name for both `nameTl` and `nameEn` means freshly
  CSV-created products have no real English name until an admin edits one
  in — acceptable since most product names (Bawang, Kamatis) read fine
  unmodified in either language, and it avoids requiring a stricter
  two-column CSV format.
- The floor-at-1-centavo rail on bulk adjustment is a mathematical safety
  net, not a business rule — it will never produce a *sensible* price for
  real goods if a chain of adjustments pushes something that low. In
  practice this should never be reached with reasonable adjustment values;
  flagged here so it isn't mistaken for a considered pricing floor.
- A best-effort CSV upload (rather than all-or-nothing) means a typo'd
  category on row 14 doesn't block rows 1–13 and 15–40 from landing — but
  it also means a single upload can leave the catalog in a partially
  updated state if the admin doesn't read the skipped-rows summary
  carefully. Accepted per the design conversation; the summary panel is
  the mitigation.

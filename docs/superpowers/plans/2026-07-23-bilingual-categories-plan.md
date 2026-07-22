# Bilingual Product Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `products.category` from free-text `varchar(48)` to a real Postgres enum (`gulay`/`itlog`/`isda`/`kusina`), and display it via bilingual dictionary labels everywhere it's shown to a user, mirroring the existing `products.source` enum precedent exactly.

**Architecture:** One migration (schema enum + column-type change), then one coherent code slice: zod input validation tightened to the same enum, a new `productCategories` dictionary section (Tagalog canonical, English mirror), the admin catalog form's free-text input replaced with a `<select>`, and the two read-only display sites (owner catalog filter pills, admin catalog product badge) switched from the raw DB string to the dictionary lookup.

**Tech Stack:** Drizzle ORM (`pgEnum`), drizzle-kit (`pnpm db:generate` / `pnpm db:migrate`), zod, react-hook-form, the existing `src/lib/i18n/` dictionary system.

## Global Constraints

- Money/locale conventions from AGENTS.md still apply project-wide (integer centavos, `~/lib/datetime`'s `now()`, Tagalog-first copy through the dictionaries) — this plan doesn't touch money or dates, noted only because it binds every task implicitly.
- The 4 enum values are exactly `gulay`, `itlog`, `isda`, `kusina` — confirmed via a live query against the "Sarihub" Supabase project that these are the only values currently in `products.category`. Do not add, rename, or reorder them.
- No RLS changes — this is a column-type change on a table RLS already covers (same precedent as migration `0002`, which shipped without a paired `_rls.sql`).
- **The live database migration is applied by the controller (the orchestrating session), not by an implementer subagent.** Task 1 generates the migration file and stops — it does not run `pnpm db:migrate`. This is a deliberate gate: altering the live shared Supabase project's schema is a hard-to-reverse action on shared infrastructure, so it gets a human-visible checkpoint (the controller reviews the generated SQL) rather than running unattended inside a subagent.
- Match the existing `source`/`productSource` pattern exactly wherever this plan says "mirror `source`" — do not invent a different convention (e.g. do not cross-import `productCategory.enumValues` into the zod schema to deduplicate the literal list; the existing `source` enum already duplicates its literal list between the Drizzle schema and `src/lib/schemas/admin.ts`, and this plan preserves that same duplication for consistency rather than introducing a new pattern nobody asked for).

---

### Task 1: Migration — `products.category` becomes a real enum

**Files:**
- Modify: `src/server/db/schema/catalog.ts`
- Create (via `pnpm db:generate`, not by hand): `drizzle/0004_*.sql` + `drizzle/meta/0004_snapshot.json` + an updated `drizzle/meta/_journal.json`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the exported type `ProductCategory` (a `"gulay" | "itlog" | "isda" | "kusina"` union), re-exported from `~/server/db/schema` via the existing `export * from "./catalog"` barrel in `src/server/db/schema/index.ts` (no change needed to that barrel file). Task 2 imports this type in `src/server/routers/catalog.ts` and `src/server/routers/buyer.ts`.

- [ ] **Step 1: Edit the Drizzle schema**

In `src/server/db/schema/catalog.ts`, the current top of the file reads:

```ts
export const productSource = pgEnum("product_source", ["palengke", "warehouse"]);

export const products = pgTable(
  "products",
  {
    id: idColumn(),
    nameTl: varchar("name_tl", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    category: varchar("category", { length: 48 }).notNull(),
    isPerishable: boolean("is_perishable").notNull().default(false),
    source: productSource("source").notNull().default("palengke"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (t) => [index("products_category_idx").on(t.category)],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
```

Change it to:

```ts
export const productSource = pgEnum("product_source", ["palengke", "warehouse"]);
export const productCategory = pgEnum("product_category", ["gulay", "itlog", "isda", "kusina"]);

export const products = pgTable(
  "products",
  {
    id: idColumn(),
    nameTl: varchar("name_tl", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 120 }).notNull(),
    category: productCategory("category").notNull(),
    isPerishable: boolean("is_perishable").notNull().default(false),
    source: productSource("source").notNull().default("palengke"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (t) => [index("products_category_idx").on(t.category)],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductCategory = (typeof productCategory.enumValues)[number];
```

(Only the `category` column's type and the two new lines — the `productCategory` enum declaration and the `ProductCategory` type export — change. `varchar` stays imported and used by `nameTl`/`nameEn`, no import changes needed.)

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`

This reads the schema diff against `drizzle/meta/0003_snapshot.json` and writes a new `drizzle/0004_<random-name>.sql` plus a matching snapshot — no `DATABASE_URL` connection is needed for this step (drizzle-kit diffs against the local snapshot files, not the live database).

Expected: a new file `drizzle/0004_<name>.sql` exists. Open it and confirm it contains (drizzle-kit's exact formatting may vary slightly, but the semantic content must be):
1. A `CREATE TYPE "public"."product_category" AS ENUM(...)` statement with the 4 values in this order: `'gulay', 'itlog', 'isda', 'kusina'`.
2. An `ALTER TABLE "products" ALTER COLUMN "category" ... TYPE "public"."product_category" USING ...` statement (or equivalent drizzle-kit phrasing) that casts the existing `varchar` data to the new enum.

If the generated SQL does not contain both of those semantic pieces, STOP and report back rather than editing the generated file by hand — the shape of the auto-generated statement matters for a safe live conversion, and a hand-edit risks producing SQL that hasn't been drizzle-kit-validated against its own journal bookkeeping.

- [ ] **Step 3: Typecheck the schema change (this does not need the live DB)**

Run: `pnpm typecheck`

Expected: this will very likely show errors in `src/server/routers/catalog.ts`, `src/server/routers/buyer.ts`, `src/lib/schemas/admin.ts`, and possibly `src/app/admin/catalog/CatalogClient.tsx` / `src/app/(owner)/home/HomeClient.tsx` — that's expected and correct at this point in the plan (Task 2 fixes all of them). Do not fix them in this task. Just confirm the errors are all about `category` typing (e.g. "Type 'string' is not assignable to type ...") and not something unrelated to this change — if you see an unrelated pre-existing error, note it in your report but don't fix it.

- [ ] **Step 4: STOP — do not run `pnpm db:migrate`**

Do not apply this migration to the live database. Do not run `pnpm db:migrate` under any circumstance in this task. Report DONE with the exact contents of the generated `drizzle/0004_*.sql` file pasted into your report (this is the most important thing your report contains — the controller reviews this SQL before applying it).

- [ ] **Step 5: Commit the schema + migration files only**

```bash
git add src/server/db/schema/catalog.ts drizzle/0004_*.sql "drizzle/meta/0004_snapshot.json" "drizzle/meta/_journal.json"
git commit -m "$(cat <<'EOF'
feat: convert products.category to a real Postgres enum

Mirrors the existing products.source enum precedent. Migration
generated but NOT applied to the live database — that is a
controller-reviewed step outside this commit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(Do not `git add -A` — stage exactly these files. `pnpm typecheck` failures from Step 3 are expected and left unstaged/unfixed for Task 2.)

---

### Task 2: Bilingual labels, admin form, display sites, and full verification

**Files:**
- Modify: `src/lib/schemas/admin.ts`
- Modify: `src/lib/i18n/dictionaries/tl.ts`
- Modify: `src/lib/i18n/dictionaries/en.ts`
- Modify: `src/server/routers/catalog.ts`
- Modify: `src/server/routers/buyer.ts`
- Modify: `src/app/admin/catalog/CatalogClient.tsx`
- Modify: `src/app/(owner)/home/HomeClient.tsx`

**Interfaces:**
- Consumes: `ProductCategory` type from `~/server/db/schema` (Task 1). **The live database must already have the migration applied before this task's live/e2e verification steps (Step 8 onward) — confirm with the controller that Task 1's migration has been applied via `pnpm db:migrate` before running this task's live verification. Typecheck/lint/unit tests (Steps 1-7) do not require the live migration to be applied.**
- Produces: nothing further — this is the last task.

- [ ] **Step 1: Add the `productCategories` dictionary section (Tagalog first)**

In `src/lib/i18n/dictionaries/tl.ts`, the file currently ends with:

```ts
    signOut: "Mag-sign Out",
    signingOut: "Nag-si-sign out…",
    noStore: "Wala pang tindahan sa account na ito. Tawagan po kami para ma-setup.",
  },
};

export type Dictionary = typeof tl;
```

Change it to:

```ts
    signOut: "Mag-sign Out",
    signingOut: "Nag-si-sign out…",
    noStore: "Wala pang tindahan sa account na ito. Tawagan po kami para ma-setup.",
  },
  productCategories: {
    gulay: "Gulay",
    itlog: "Itlog",
    isda: "Isda",
    kusina: "Kusina",
  },
};

export type Dictionary = typeof tl;
```

- [ ] **Step 2: Add the matching English section**

In `src/lib/i18n/dictionaries/en.ts`, the file currently ends with:

```ts
    signOut: "Sign Out",
    signingOut: "Signing out…",
    noStore: "This account has no store yet. Please call us to set it up.",
  },
};
```

Change it to:

```ts
    signOut: "Sign Out",
    signingOut: "Signing out…",
    noStore: "This account has no store yet. Please call us to set it up.",
  },
  productCategories: {
    gulay: "Vegetables",
    itlog: "Eggs",
    isda: "Fish",
    kusina: "Kitchen essentials",
  },
};
```

- [ ] **Step 3: Run the dictionary shape test**

Run: `pnpm test`

Expected: `src/lib/i18n/dictionaries.test.ts` passes — it walks every key path in both files and asserts they match and are all non-empty strings, so the new section needs no additional test of its own. All 47 pre-existing tests plus this check should pass (still 4 test files, 47 tests — this step adds no new test count, it's covered by the existing generic key-shape test).

- [ ] **Step 4: Tighten the zod schema to the enum**

In `src/lib/schemas/admin.ts`, change:

```ts
  category: z.string().trim().min(1, "Kailangan ang kategorya.").max(48),
```

to:

```ts
  category: z.enum(["gulay", "itlog", "isda", "kusina"]),
```

(This line is inside `upsertProductInput`, directly above `isPerishable: z.boolean(),` — leave everything else in that object unchanged.)

- [ ] **Step 5: Narrow the two router-level `ProductOut` types**

In `src/server/routers/catalog.ts`, change the import line:

```ts
import { dailyPrices, productUnits, products, routes, stores } from "~/server/db/schema";
```

to:

```ts
import { dailyPrices, productUnits, products, routes, stores, type ProductCategory } from "~/server/db/schema";
```

Then change the local type:

```ts
    type ProductOut = {
      id: string;
      nameTl: string;
      nameEn: string;
      category: string;
      isPerishable: boolean;
      units: UnitOut[];
    };
```

to:

```ts
    type ProductOut = {
      id: string;
      nameTl: string;
      nameEn: string;
      category: ProductCategory;
      isPerishable: boolean;
      units: UnitOut[];
    };
```

In `src/server/routers/buyer.ts`, change the import line:

```ts
import { dailyPrices, productUnits, products } from "~/server/db/schema";
```

to:

```ts
import { dailyPrices, productUnits, products, type ProductCategory } from "~/server/db/schema";
```

Then change its local type:

```ts
    type ProductOut = {
      id: string;
      nameTl: string;
      nameEn: string;
      category: string;
      units: UnitOut[];
    };
```

to:

```ts
    type ProductOut = {
      id: string;
      nameTl: string;
      nameEn: string;
      category: ProductCategory;
      units: UnitOut[];
    };
```

(`admin.catalog.list` in `src/server/routers/admin.ts` needs no change — it returns `.select()`'s full row shape directly with no manually-declared type, so its `category` field picks up the narrowed union automatically once Task 1's schema change lands.)

- [ ] **Step 6: Admin catalog form — replace the free-text input with a select, and give new products a default category**

In `src/app/admin/catalog/CatalogClient.tsx`, change the "new product" default values:

```ts
    defaultValues: product
      ? {
          id: product.id,
          nameTl: product.nameTl,
          nameEn: product.nameEn,
          category: product.category,
          isPerishable: product.isPerishable,
          source: product.source,
          isActive: product.isActive,
        }
      : { isPerishable: false, source: "palengke", isActive: true },
```

to:

```ts
    defaultValues: product
      ? {
          id: product.id,
          nameTl: product.nameTl,
          nameEn: product.nameEn,
          category: product.category,
          isPerishable: product.isPerishable,
          source: product.source,
          isActive: product.isActive,
        }
      : { isPerishable: false, source: "palengke", category: "gulay", isActive: true },
```

Then change the category field itself:

```tsx
      <Field label={dict.admin.catalog.category} error={form.formState.errors.category?.message}>
        <Input {...form.register("category")} placeholder="gulay" />
      </Field>
```

to:

```tsx
      <Field label={dict.admin.catalog.category} error={form.formState.errors.category?.message}>
        <select
          {...form.register("category")}
          className="h-tap w-full rounded-md border border-hair-strong bg-white px-3 text-[15px]"
        >
          <option value="gulay">{dict.productCategories.gulay}</option>
          <option value="itlog">{dict.productCategories.itlog}</option>
          <option value="isda">{dict.productCategories.isda}</option>
          <option value="kusina">{dict.productCategories.kusina}</option>
        </select>
      </Field>
```

Then change the admin catalog list badge:

```tsx
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs capitalize text-ink-2">
            {product.category}
          </span>
```

to:

```tsx
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs capitalize text-ink-2">
            {dict.productCategories[product.category]}
          </span>
```

- [ ] **Step 7: Owner catalog filter pills**

In `src/app/(owner)/home/HomeClient.tsx`, change:

```tsx
        {categories.map((c) => (
          <CategoryPill
            key={c}
            label={c}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          />
        ))}
```

to:

```tsx
        {categories.map((c) => (
          <CategoryPill
            key={c}
            label={dict.productCategories[c]}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          />
        ))}
```

- [ ] **Step 8: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

Expected: both pass with zero errors/warnings. If `pnpm lint` fails specifically because this task is running inside a nested worktree under `.claude/worktrees/` (a known unrelated Next.js workspace-root false positive — it detects two lockfiles and reports an ESLint plugin conflict that has nothing to do with any code change), note that in your report and don't treat it as a task failure; `pnpm typecheck` passing cleanly is the load-bearing check for this step. If lint fails for any other reason, treat it as a real failure.

- [ ] **Step 9: Confirm the live migration is applied, then run the full local test suite**

Before this step, confirm with the controller that Task 1's `drizzle/0004_*.sql` has already been applied to the live database via `pnpm db:migrate` (run by the controller, not by you). If it hasn't been applied yet, stop and report NEEDS_CONTEXT rather than proceeding — the steps below query the live database and will fail confusingly (a Postgres type-mismatch error, not a clean test failure) if the column is still the old `varchar`.

Once confirmed applied, run: `pnpm test:e2e`

Expected: both `tests/e2e/login.spec.ts` and `tests/e2e/money-path.spec.ts` pass (2 passed) — `money-path.spec.ts` loads the owner `/home` catalog page, which now renders `dict.productCategories[c]` for every category pill; if the dictionary/type wiring were broken this would crash that page and fail the test, so a green run here is real evidence the change works end-to-end against the live project.

- [ ] **Step 10: Live browser check of both display sites in both languages**

Using this session's available browser automation (Playwright MCP or Claude-in-Chrome, whichever is connected), with `pnpm dev` running against the live project:
1. Log in as the owner dev account (`/login` → "Mag-login: Sari-Sari Owner"), go to `/home`, and confirm the category filter pills read `Lahat / Gulay / Isda / Itlog / Kusina` (Tagalog default) — not raw lowercase slugs.
2. On `/profile`, switch to English, return to `/home`, and confirm the pills now read `All / Vegetables / Fish / Eggs / Kitchen essentials`.
3. Sign out, log in as the staff (admin) dev account, go to `/admin/catalog`, and confirm each product's category badge shows the translated label (Tagalog, since a fresh staff session defaults to Tagalog unless the cookie says otherwise) and that opening "Edit" on any product shows a `<select>` (not a text box) with the correct value pre-selected.
4. Switch to English on `/profile` and re-check `/admin/catalog` shows the English category labels.

Report exactly what you observed at each of the 4 sub-steps (a short description is fine, a screenshot if your tooling makes that easy) — this is the step that catches anything the type system and unit tests can't (e.g. a dictionary key typo that still compiles because both `tl.ts`/`en.ts` have matching-but-wrong keys, or a visual/layout regression from swapping `<Input>` for `<select>`).

- [ ] **Step 11: Commit**

```bash
git add src/lib/schemas/admin.ts src/lib/i18n/dictionaries/tl.ts src/lib/i18n/dictionaries/en.ts src/server/routers/catalog.ts src/server/routers/buyer.ts src/app/admin/catalog/CatalogClient.tsx "src/app/(owner)/home/HomeClient.tsx"
git commit -m "$(cat <<'EOF'
feat: bilingual product category labels

Category is now a closed, enum-backed vocabulary (mirrors the
existing source enum) with proper tl/en display labels, replacing
the admin form's free-text input with a select and translating the
two read-only display sites (owner catalog pills, admin catalog
badge).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 12: Update the roadmap**

Modify `AGENTS.md`'s deferred-items line:

```
- [ ] Translate DB-sourced free text (`products.category` values like `gulay`/`itlog`; store/owner/route names are inherently proper nouns and shouldn't be) — would need either a bilingual category column or a lookup table
```

to:

```
- [x] Translate DB-sourced free text: `products.category` converted to a real Postgres enum (mirroring `products.source`) with bilingual dictionary labels (`productCategories` in `src/lib/i18n/dictionaries/`). Store/owner/route names remain untranslated by design (proper nouns).
```

Commit this as its own small commit:

```bash
git add AGENTS.md
git commit -m "$(cat <<'EOF'
docs: check off bilingual category text in the roadmap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

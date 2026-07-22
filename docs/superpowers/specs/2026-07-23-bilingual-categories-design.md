# Bilingual product categories

## Why

Roadmap item (AGENTS.md, "Deferred from the bilingual UI work"): translate
DB-sourced free text — specifically `products.category` values (`gulay`,
`itlog`, etc.), which currently render as raw Tagalog slugs regardless of
the active locale. Store/owner/route names are excluded from that item on
purpose (proper nouns); category is a closed, hand-curated vocabulary and
should have a real tl/en pair like everything else user-facing.

## Existing precedent

`products.source` already solves this exact shape of problem: a real
Postgres enum (`pgEnum productSource`, `'palengke' | 'warehouse'`), a zod
`z.enum([...])` input, a `<select>` in the admin form, and dictionary-driven
short labels (`dict.admin.catalog.sourcePalengkeShort` /
`sourceWarehouseShort`). `category` is currently a free-text `varchar(48)`
doing the same job with none of that structure. A live query against the
"Sarihub" project confirms only 4 distinct values exist today: `gulay`,
`itlog`, `isda`, `kusina` — no cleanup needed before converting.

## Scope

1. **Migration** (`drizzle/0004_*.sql` + matching Drizzle schema edit): add
   `pgEnum productCategory` with exactly `["gulay", "itlog", "isda",
   "kusina"]`; alter `products.category` from `varchar(48)` to this enum.
   No RLS file needed — this is a column-type change on a table whose RLS
   already covers it, matching the precedent of migration `0002`
   (`stormy_weapon_omega`), which also shipped without a paired `_rls.sql`.
2. **Zod schema** (`src/lib/schemas/admin.ts`): `upsertProductInput.category`
   changes from `z.string().trim().min(1)...max(48)` to
   `z.enum(["gulay", "itlog", "isda", "kusina"])`, directly mirroring
   `source: z.enum(["palengke", "warehouse"])` on the adjacent line.
3. **Dictionaries** (`src/lib/i18n/dictionaries/tl.ts` /`en.ts`): new
   top-level `productCategories` section (Tagalog is canonical, added
   first):
   ```
   productCategories: {
     gulay:  "Gulay"  / "Vegetables",
     itlog:  "Itlog"  / "Eggs",
     isda:   "Isda"   / "Fish",
     kusina: "Kusina" / "Kitchen essentials",
   }
   ```
4. **Admin form** (`src/app/admin/catalog/CatalogClient.tsx`): the
   category `<Input>` becomes a `<select>` populated from the same 4
   values, labelled via `dict.productCategories`, structurally identical
   to the existing `source` `<select>` immediately below it in the form.
5. **Display sites** — both switch from rendering the raw DB string to
   `dict.productCategories[value]`:
   - `HomeClient.tsx` — the owner catalog's category filter pills
     (currently `label={c}` using the raw slug capitalized via CSS).
   - `CatalogClient.tsx` — the admin product-row category badge
     (currently `{product.category}`).

## Out of scope

- Store/owner/route names — proper nouns, excluded by the roadmap item
  itself.
- No change to `catalog.ts`/`buyer.ts` router query shapes — they already
  select and return `category` as a plain column; the column's Postgres
  type changing from `varchar` to an enum flows through Drizzle's inferred
  types without a router code change (both compile to `string` in
  TypeScript, just narrower after the zod/enum change on the write path).
- No admin self-service category management UI. Adding a 5th category is a
  code change (new enum value via migration + a new dictionary entry), not
  something an admin can do from the UI. Matches how `source` already
  works and is appropriate for a single-distributor, hand-curated
  vocabulary — flagged explicitly so it isn't mistaken for an oversight.
- The category *filter state* in `HomeClient.tsx` (`useState<string |
  null>`) continues to store the raw enum value (`"gulay"`, etc.) for
  equality checks against `product.category`; only the *pill label*
  rendered to the user changes to the translated string. No behavior
  change to filtering logic itself.

## Risks / tradeoffs

- Postgres enums support `ALTER TYPE ... ADD VALUE` for future extension,
  so adding a 5th category later doesn't require dropping/recreating the
  column — just a small follow-up migration + dictionary entry.
- The admin catalog form's zod validation becomes strict (only the 4 known
  values accepted) where previously any non-empty string up to 48 chars
  was allowed. This is intentional — it's the entire point of closing the
  free-text hole — but note it as a real behavior change for the admin
  form, not merely a display change.

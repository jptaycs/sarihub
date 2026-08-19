# Real Filipino/Tagalog date formatting

## Why

The bilingual toggle (Tagalog/English, `/login`, `sarihub_lang` cookie) already
covers every user-facing string via `src/lib/i18n/dictionaries/`, but dates
have always rendered in English regardless of the selected language — `date-fns`
ships no `fil` (Filipino) locale, so `formatManila()` has silently used its
English defaults since before the language toggle existed. A store owner who
switches to Tagalog still sees "Sat, 23 May" on their order history. This
closes that last gap.

## Existing precedent

- `src/lib/datetime.ts`'s `formatManila(utc, pattern)` (wrapping
  `date-fns-tz`'s `formatInTimeZone`) is the single formatting entry point;
  `formatManilaDate`/`formatManilaTime` are two fixed-pattern convenience
  wrappers around it. All three are extended, not replaced.
- `src/lib/i18n/locale.ts`'s `Locale = "tl" | "en"` is the app's own locale
  type, already threaded explicitly as a parameter everywhere else in the
  codebase (`getDictionary(locale)`, `getDictionary(await getServerLocale())`)
  — this feature follows that same explicit-parameter convention rather than
  introducing a hook or context-based formatter.
- `useLocale()` / `useDictionary()` (`src/lib/i18n/LanguageProvider.tsx`) are
  already called in every client component that will need this — none of the
  7 files below gain a new hook dependency, they gain a new argument to a
  function they already import.

## Scope

### 1. Two call-site categories — only one needs to change

`formatManila` is called from ~15 places. They split cleanly:

- **Day-key calls** (`formatManila(x, "yyyy-MM-dd")`), used server-side in
  `src/server/routers/{admin,driver,buyer,catalog}.ts` and
  `src/server/services/{stockouts,orders}.ts` to compute a Manila calendar
  date for DB lookups (stockouts, delivery-day matching). These are never
  shown to a user and must stay locale-invariant — **not touched**.
- **Human-display calls**, all inside `"use client"` components that already
  call `useDictionary()`/`useLocale()`: `OrdersClient.tsx`, `HomeClient.tsx`,
  `OrderDetailClient.tsx`, `DriverClient.tsx`, `SukiClient.tsx`,
  `OrdersBoardClient.tsx`, `PricesClient.tsx`. These use patterns
  `"d MMM yyyy"`, `"EEE, d MMM"`, `"EEEE, d MMM yyyy"`, `"h:mm a"`,
  `"d MMM, h:mm a"`, `"d MMM yyyy, h:mm a"` — **these gain Tagalog output**
  when the active locale is `"tl"`.

No `MMMM` (full month name), ordinal (`"do"`), or `formatLong` (`P`/`PP`/`PPP`)
tokens are used anywhere in the app today.

### 2. New file: `src/lib/i18n/tagalogDateLocale.ts`

Exports `fil`, a `date-fns` `Locale` object built as
`{ ...enUS, code: "fil", localize: { ...enUS.localize, month: <fn>, day: <fn> } }`.
Only `localize.month` and `localize.day` are overridden — `formatLong`,
`match`, `ordinalNumber`, `formatDistance`, and `formatRelative` fall through
to `enUS` unchanged, since nothing in the app calls the tokens that would
exercise them. If a real caller ever needs one of those (e.g. someone adds a
`MMMM` pattern), extending this object is a small, additive change — not a
redesign.

Names (standard Filipino, Spanish-derived — the same words used in Philippine
government and news date formatting):

| | Full | Abbreviated (3-letter, `EEE`/`MMM` width) |
|---|---|---|
| Days | Linggo, Lunes, Martes, Miyerkules, Huwebes, Biyernes, Sabado | Lin, Lun, Mar, Miy, Huw, Biy, Sab |
| Months | Enero, Pebrero, Marso, Abril, Mayo, Hunyo, Hulyo, Agosto, Setyembre, Oktubre, Nobyembre, Disyembre | Ene, Peb, Mar, Abr, May, Hun, Hul, Ago, Set, Okt, Nob, Dis |

Note: Marso's (month) and Martes's (day) abbreviations are both `"Mar"`.
Harmless — the two are read from different `localize` functions and never
rendered in the same token slot — but worth this note so a future reader
doesn't mistake it for a copy-paste bug.

Day/month names are **translated in place, cardinal, same token structure**
as the existing English patterns — `"d MMM yyyy"` renders `"23 Hun 2026"`,
not a restructured `"ika-23 ng Mayo, 2026"`. This matches the app's existing
casual, direct Tagalog tone (`"Kailangan po"`, not formal/literary register)
and is a minimal change to string *content*, never string *shape*.

**AM/PM is not translated.** `"h:mm a"` renders `"5:30 AM"` in both locales —
AM/PM are near-universally understood as-is in Philippine English/Tagalog
digital contexts, and translating them (`"ng umaga"`/`"ng hapon"`/`"ng gabi"`)
would require a morning/afternoon/evening boundary rule this app has no
other reason to define, for a token that isn't actually confusing today.

### 3. `formatManila` / `formatManilaDate` / `formatManilaTime` gain an optional locale param

```
formatManila(utc: Date, pattern: string, locale?: Locale): string
formatManilaDate(utc: Date, locale?: Locale): string
formatManilaTime(utc: Date, locale?: Locale): string
```

`Locale` here is the app's own `"tl" | "en"` type from `~/lib/i18n/locale`,
not `date-fns`'s `Locale` type — callers never import or touch `fil`
directly. Internally, `"tl"` maps to `{ locale: fil }` passed to
`formatInTimeZone`; `"en"` or omitted keeps current behavior exactly
(`formatInTimeZone`'s own English default) — so every existing call site
that doesn't pass the new argument is provably unaffected, day-key calls
included.

### 4. Call sites: pass `locale` at every human-display call

In each of the 7 client files, at the point they call `formatManila*` for
something a user reads, add the third/second argument from the component's
own `useLocale().locale` (already in scope, since each file already calls
`useDictionary()` from the same provider). Server-rendered chrome (nav,
headers) is out of scope — the only server-side date arithmetic in this app
is day-key computation, already excluded above.

## Out of scope

- Ordinal dates (`"ika-23"` / `"23rd"`) — no current pattern uses the `"do"`
  token.
- `MMMM` (full month name) support — no current pattern uses it.
- `formatLong` tokens (`P`/`PP`/`PPP`) — unused.
- Translating `formatDistance`/`formatRelative` output (e.g. "3 days ago") —
  the app doesn't call either function today.
- AM/PM translation — explicitly decided against; see above.
- Any change to day-key (`"yyyy-MM-dd"`) call sites — must stay
  locale-invariant, not part of this feature.

## Risks / tradeoffs

- Building only `localize.month`/`localize.day` instead of a textbook-complete
  `Locale` means this won't silently do the right thing if a future PR adds
  an ordinal or `MMMM` pattern — it'll render in English (via the `enUS`
  fallback) until someone extends `tagalogDateLocale.ts`. Accepted: building
  ordinal/formatLong logic now, with zero current callers to verify it
  against, is speculative code nobody can confirm is correct.
- The cardinal-in-place translation choice (`"23 Mayo 2026"`) is a good match
  for this app's casual register but is not the most traditional written
  Tagalog date form. Confirmed during design as the right call for this
  product's tone, not a compromise.

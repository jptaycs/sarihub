# Playwright e2e: the money path (price lock + suki ledger)

## Why

Roadmap item (AGENTS.md, Cross-cutting): "Playwright e2e for the money path:
login → order → price lock survives a next-day price change (needs the live
project)." This is the only unchecked cross-cutting item that doesn't require
a new external account (SMS/Mapbox/PayMongo all need credentials this
environment doesn't have).

It exercises wedge rule #1 directly: a store's locked unit price must survive
a later price change on the same unit, and the suki ledger must move in step
with the order lifecycle.

## Scope

One new spec file, `tests/e2e/money-path.spec.ts`, added to the existing
Playwright suite (`playwright.config.ts`, `tests/e2e/login.spec.ts` already
exist). Runs against the live "Sarihub" Supabase project via the two
`sms_test_otp` dev accounts (`DevLoginButtons`/`devLoginAction`):

- `owner` → store "Aling Suki" / phone `+639171234567`
- `staff` → `role: admin` (confirmed live) / phone `+639179998888`

No new seed data, migrations, or fixtures. Uses the existing seeded product
"Sibuyas" (red onion), unit "1 kilo" (`product_units` label_tl).

## Flow

1. Open two browser contexts in one test: `ownerPage` and `staffPage`, each
   logging in through its own dev button on `/login`.
2. **staffPage**: after dev-login redirects (admin lands outside `/home`,
   e.g. `/admin/orders`), navigate to `/buyer/prices` directly — the buyer
   layout guard allows `admin` role in. Set today's price for Sibuyas · 1
   kilo to price **A** (a fixed, distinctive value, e.g. ₱160.00) via the
   existing edit-price UI (`buyer.setPrice`). This step is required
   regardless of whatever's currently live, since `daily_prices` rows expire
   24h after `captured_at` and the seeded rows are already stale.
3. **ownerPage**: reload `/home`, confirm the Sibuyas · 1 kilo button shows
   price A, capture the store's current suki balance from the tab pill, tap
   the unit to add qty 1, open the cart sheet, place the order.
4. **ownerPage**: follow "Tingnan ang mga order →" to `/orders`, open the
   newly placed order (top of list), assert:
   - the item's locked unit price equals A (not whatever price is live at
     assertion time)
   - the order total equals A × 1
5. **ownerPage**: reload `/home`, assert the suki balance pill increased by
   exactly the order total versus the value captured in step 3.
6. **staffPage**: back on `/buyer/prices`, set the same unit to a different
   distinctive price **B** (e.g. ₱175.00).
7. **ownerPage**: reload the order detail page again — the locked price must
   still read A, unaffected by B. Reload `/home` — the catalog now shows B
   for that unit, proving the price change took effect going forward.
8. **ownerPage**: cancel the order (still `submitted`, within the
   cancellable window) via the existing cancel-confirm flow. Assert the suki
   balance pill on `/home` returns to the value captured in step 3 — full
   round trip, and keeps the shared live dev store's balance from drifting
   across repeated test runs.

## Out of scope

- No new dev-login account, seed data, or DB migration.
- No assertion on `daily_prices` history rows directly (DB-level) — the test
  stays UI-driven, consistent with `login.spec.ts`'s existing style.
- No changes to non-test code. If anything in the app is hard to select
  reliably (no `data-testid`, etc.), the test uses existing accessible roles
  and Tagalog copy (the default locale), same as `login.spec.ts` does today.

## Risks / tradeoffs

- Runs against the shared live dev Supabase project, not an isolated test DB.
  Each run appends a new `daily_prices` row per price-set (expected/harmless
  — mirrors real buyer usage) and one submitted-then-cancelled order (ledger
  neutral by design of step 8).
- Depends on the two hardcoded dev-OTP accounts and the "Sibuyas / 1 kilo"
  seed row continuing to exist. If the live project's seed or dev accounts
  ever change, this test needs updating alongside `devLoginAction.ts`'s
  existing comment about keeping the two pairs in sync.
- No `try`/`finally` around the cancel step: if an assertion fails between
  placing the order and cancelling it, the run aborts with a real submitted
  order and a shifted suki balance left on the shared dev store. The balance
  self-heals on the next run (baseline is re-captured each time), but the
  orphaned order needs manual cleanup. Acceptable for a manually-run local
  e2e test; revisit with a `try`/`finally` cancel if this is ever promoted
  to unattended CI.

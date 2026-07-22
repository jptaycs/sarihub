# Money-Path Playwright E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `tests/e2e/money-path.spec.ts`, a Playwright test that logs in as both dev accounts against the live "Sarihub" Supabase project and proves a store's locked order price survives a later price change, with the suki ledger balance moving correctly on place and cancel.

**Architecture:** One Playwright test, two `BrowserContext`s (`ownerPage`, `staffPage`) created from the shared `browser` fixture, driving the real app UI (no API calls, no test-only hooks). Built incrementally as a sequence of `test.step()` blocks inside a single `test()`, each block run against the live dev server before moving to the next. Full spec: `docs/superpowers/specs/2026-07-22-money-path-e2e-design.md`.

**Tech Stack:** `@playwright/test` (already a dependency), existing `playwright.config.ts` (mobile-chromium project, `pnpm dev` webServer, baseURL `http://localhost:3000`).

## Global Constraints

- Money is always integer centavos in the app; the test only reads/writes peso strings through the UI (`formatPeso`/`pesosToCentavos` already handle conversion) — never compute money in the test beyond simple peso-string arithmetic for assertions.
- No new dependencies, no `data-testid` attributes added to app code, no DB/seed/migration changes — the test is UI-driven only, matching `tests/e2e/login.spec.ts`'s existing style of hardcoding the Tagalog copy directly (the app's default locale) rather than importing dictionaries.
- Uses only the two existing dev-OTP accounts (`owner` → store "Aling Suki" / `+639171234567`, `staff` → `role: admin` / `+639179998888`) and the existing seeded product "Sibuyas" / unit "1 kilo". Do not add accounts or seed rows.
- Runs against the shared live dev Supabase project — the test must leave state clean: cancel the order it places so the suki balance returns to its pre-test value.
- Single file: `tests/e2e/money-path.spec.ts`. No other files change.

---

### Task 1: Dual dev-login scaffolding

**Files:**
- Create: `tests/e2e/money-path.spec.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `test("money path: price lock survives a price change", async ({ browser }) => {...})` skeleton with `ownerPage` and `staffPage` set up and logged in. Later tasks append `test.step()` blocks inside this same test body, after the login steps. Also produces two module-level helpers later tasks call directly:
  - `function pesoTextToNumber(text: string): number` — parses a `"₱1,234.56"`-containing string to `1234.56`.
  - `async function readSukiBalance(page: Page): Promise<number>` — reads the current suki balance shown on `/home` as a peso number.

**Step 1: Write the test skeleton with both logins**

```ts
import { expect, test, type Page } from "@playwright/test";

/** Parses the first "₱1,234.56"-shaped amount out of a string, returning pesos as a number. */
function pesoTextToNumber(text: string): number {
  const match = /₱([\d,]+\.\d{2})/.exec(text);
  if (!match) throw new Error(`no peso amount found in "${text}"`);
  return Number(match[1].replace(/,/g, ""));
}

/** Reads the suki balance pill on the owner's /home ("Suki tab" row). */
async function readSukiBalance(page: Page): Promise<number> {
  const label = page.getByText("Suki tab", { exact: true });
  const row = label.locator("xpath=..");
  const priceText = await row.locator(".price").first().textContent();
  return pesoTextToNumber(priceText ?? "");
}

test("money path: price lock survives a price change", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const staffContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const staffPage = await staffContext.newPage();

  await test.step("owner dev-login", async () => {
    await ownerPage.goto("/login");
    await ownerPage.getByRole("button", { name: "Mag-login: Sari-Sari Owner" }).click();
    await ownerPage.waitForURL("**/home");
  });

  await test.step("staff (admin) dev-login, navigate to price board", async () => {
    await staffPage.goto("/login");
    await staffPage.getByRole("button", { name: "Mag-login: Staff (admin)" }).click();
    // Admin role bounces off the owner /home guard straight to /admin/orders.
    await staffPage.waitForURL("**/admin/orders");
    await staffPage.goto("/buyer/prices");
    await expect(staffPage.getByRole("heading", { name: "Presyo ngayon" })).toBeVisible();
  });

  await ownerContext.close();
  await staffContext.close();
});
```

**Step 2: Run it against the live dev server**

Run: `pnpm test:e2e tests/e2e/money-path.spec.ts`
Expected: PASS (1 passed). This only proves both dev accounts can log in and land on the right screens — no business logic yet.

**Step 3: Commit**

```bash
git add tests/e2e/money-path.spec.ts
git commit -m "$(cat <<'EOF'
test: scaffold money-path e2e with dual dev-login

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Staff sets today's price; owner sees it and captures baseline balance

**Files:**
- Modify: `tests/e2e/money-path.spec.ts` (insert new steps between the two login steps' block and the `ownerContext.close()` cleanup at the end — the close calls always stay last)

**Interfaces:**
- Consumes: `ownerPage`, `staffPage` from Task 1; `readSukiBalance(page)` helper from Task 1.
- Produces: a `setSibuyasKiloPrice(page, pesos)` helper later tasks (3, 4) reuse to set the second price; a `baselineBalance: number` variable later tasks (3, 5) compare against.

**Step 1: Add the price-setting helper and the "staff sets price A" + "owner sees it" steps**

Insert this helper above the `test(...)` call (after `readSukiBalance`):

```ts
/** Sets today's price for Sibuyas · 1 kilo on the buyer price board and waits for it to save. */
async function setSibuyasKiloPrice(page: Page, pesos: string): Promise<void> {
  const oosButton = page.getByRole("button", { name: "Markahang ubos ang Sibuyas 1 kilo" });
  const priceButton = oosButton.locator("xpath=preceding-sibling::button[1]");
  await priceButton.click();
  await page.getByLabel("Presyo ng Sibuyas 1 kilo").fill(pesos);
  await page.getByRole("button", { name: "I-save" }).click();
  await expect(priceButton).toContainText(`₱${pesos}`);
}
```

Insert these steps inside the `test(...)` body, immediately after the "staff (admin) dev-login" step and before `ownerContext.close()`:

```ts
  let baselineBalance = 0;

  await test.step("staff sets today's price for Sibuyas · 1 kilo", async () => {
    await setSibuyasKiloPrice(staffPage, "161.00");
  });

  await test.step("owner sees the new price and baseline suki balance", async () => {
    await ownerPage.goto("/home");
    baselineBalance = await readSukiBalance(ownerPage);
    // The unfiltered catalog shows a "1 kilo" unit for several products
    // (Sibuyas, Kamatis, Galunggong, Asukal) — narrow to Sibuyas first.
    await ownerPage.getByPlaceholder(/Hanapin/i).fill("sibuyas");
    await expect(ownerPage.getByRole("button", { name: /^1 kilo/ })).toContainText("₱161.00");
  });
```

**Step 2: Run it**

Run: `pnpm test:e2e tests/e2e/money-path.spec.ts`
Expected: PASS (1 passed).

**Step 3: Commit**

```bash
git add tests/e2e/money-path.spec.ts
git commit -m "$(cat <<'EOF'
test: staff sets today's price, owner catalog reflects it

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Owner places the order; assert locked price and suki balance

**Files:**
- Modify: `tests/e2e/money-path.spec.ts`

**Interfaces:**
- Consumes: `ownerPage` (already on `/home`, search filtered to "sibuyas", from Task 2); `baselineBalance`; `readSukiBalance`.
- Produces: an `orderUrl: string` variable Tasks 4 and 5 navigate back to.

**Step 1: Add the "place order" and "verify locked price + balance" steps**

Insert after the Task 2 steps, before `ownerContext.close()`:

```ts
  let orderUrl = "";

  await test.step("owner adds the unit and places the order", async () => {
    await ownerPage.getByRole("button", { name: /^1 kilo/ }).click();
    await ownerPage.getByRole("button", { name: /Tingnan ang order/ }).click();
    await expect(ownerPage.getByRole("heading", { name: "Ang order ninyo" })).toBeVisible();
    await ownerPage.getByRole("button", { name: /I-place ang order/ }).click();
    await expect(ownerPage.getByRole("heading", { name: "Naipasa na po ang order!" })).toBeVisible();
    await ownerPage.getByRole("link", { name: /Tingnan ang mga order/ }).click();
    await ownerPage.waitForURL("**/orders");
  });

  await test.step("owner opens the fresh order and checks the locked price", async () => {
    await ownerPage.locator('a[href^="/orders/"]').first().click();
    await ownerPage.waitForURL(/\/orders\/.+/);
    orderUrl = ownerPage.url();
    await expect(ownerPage.getByText("1 × ₱161.00", { exact: true })).toBeVisible();
  });

  await test.step("suki balance increased by the order total", async () => {
    await ownerPage.goto("/home");
    const afterPlaceBalance = await readSukiBalance(ownerPage);
    expect(afterPlaceBalance).toBeCloseTo(baselineBalance + 161.0, 2);
  });
```

**Step 2: Run it**

Run: `pnpm test:e2e tests/e2e/money-path.spec.ts`
Expected: PASS (1 passed). If the order total assertion fails, check that the cart didn't retain a stale item from a previous manual test run of the same browser profile — Playwright contexts here are fresh per run, so this shouldn't happen, but confirm by reading the failure screenshot/trace Playwright attaches on failure.

**Step 3: Commit**

```bash
git add tests/e2e/money-path.spec.ts
git commit -m "$(cat <<'EOF'
test: place order and verify locked price + suki balance increase

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Staff changes the price; locked order is unaffected, catalog reflects the change

**Files:**
- Modify: `tests/e2e/money-path.spec.ts`

**Interfaces:**
- Consumes: `staffPage`, `orderUrl`, `ownerPage`, `setSibuyasKiloPrice` (Task 2).
- Produces: nothing new for later tasks — Task 5 only needs `orderUrl` and `baselineBalance`, both already available.

**Step 1: Add the price-change and re-verification steps**

Insert after the Task 3 steps, before `ownerContext.close()`:

```ts
  await test.step("staff changes today's price again", async () => {
    await setSibuyasKiloPrice(staffPage, "179.00");
  });

  await test.step("order detail still shows the locked price, not the new one", async () => {
    await ownerPage.goto(orderUrl);
    await expect(ownerPage.getByText("1 × ₱161.00", { exact: true })).toBeVisible();
    await expect(ownerPage.getByText("1 × ₱179.00", { exact: true })).toHaveCount(0);
  });

  await test.step("catalog now shows the new price going forward", async () => {
    await ownerPage.goto("/home");
    await ownerPage.getByPlaceholder(/Hanapin/i).fill("sibuyas");
    await expect(ownerPage.getByRole("button", { name: /^1 kilo/ })).toContainText("₱179.00");
  });
```

**Step 2: Run it**

Run: `pnpm test:e2e tests/e2e/money-path.spec.ts`
Expected: PASS (1 passed).

**Step 3: Commit**

```bash
git add tests/e2e/money-path.spec.ts
git commit -m "$(cat <<'EOF'
test: verify price lock survives a same-day price change

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Owner cancels the order; suki balance returns to baseline

**Files:**
- Modify: `tests/e2e/money-path.spec.ts`

**Interfaces:**
- Consumes: `ownerPage`, `orderUrl`, `baselineBalance`, `readSukiBalance`.
- Produces: nothing (final task).

**Step 1: Add the cancel + final-balance steps**

Insert after the Task 4 steps, immediately before `ownerContext.close()`:

```ts
  await test.step("owner cancels the order (cleanup) and balance reverts", async () => {
    await ownerPage.goto(orderUrl);
    await ownerPage.getByRole("button", { name: "Kanselahin ang order" }).click();
    await ownerPage.getByRole("button", { name: "Oo, ikansela" }).click();
    await expect(ownerPage.getByText("Kanselado na po ang order na ito.")).toBeVisible();

    await ownerPage.goto("/home");
    const finalBalance = await readSukiBalance(ownerPage);
    expect(finalBalance).toBeCloseTo(baselineBalance, 2);
  });
```

**Step 2: Run the complete spec end to end**

Run: `pnpm test:e2e tests/e2e/money-path.spec.ts`
Expected: PASS (1 passed) — all six `test.step()` blocks green, confirming price-lock survival and a clean ledger round trip.

**Step 3: Run the full e2e suite once to confirm no regression on `login.spec.ts`**

Run: `pnpm test:e2e`
Expected: PASS (2 passed).

**Step 4: Update the roadmap**

Modify `AGENTS.md` line matching:
```
- [ ] Playwright e2e for the money path: login → order → price lock survives a next-day price change (needs the live project)
```
to:
```
- [x] Playwright e2e for the money path: login → order → price lock survives a next-day price change (needs the live project)
```

**Step 5: Commit**

```bash
git add tests/e2e/money-path.spec.ts AGENTS.md
git commit -m "$(cat <<'EOF'
test: cancel order in cleanup, verify suki balance round trip

Full money-path e2e now covers price lock survival and the suki
ledger moving correctly on place + cancel. Checks off the roadmap
item in AGENTS.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

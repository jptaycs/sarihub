import { expect, test, type Page } from "@playwright/test";

import { OWNER_STATE, STAFF_STATE } from "./auth.paths";

/**
 * Crew POS money path: a suki-tab sale rung up on the truck lands on the
 * store owner's tab, shows up in their tab activity, and comes off the
 * truck's stock. Needs the live project (same precondition as money-path).
 */

function pesoTextToNumber(text: string): number {
  const match = /₱([\d,]+\.\d{2})/.exec(text);
  if (!match) throw new Error(`no peso amount found in "${text}"`);
  return Number((match[1] ?? "").replace(/,/g, ""));
}

async function readSukiBalance(page: Page): Promise<number> {
  const card = page.getByRole("link").filter({ hasText: "Suki tab" });
  const priceText = await card.locator(".price").first().textContent();
  return pesoTextToNumber(priceText ?? "");
}

test("crew POS: suki sale charges the owner's tab and reduces truck stock", async ({ browser }) => {
  // Sessions come from auth.setup.ts — no OTP sends here.
  const ownerContext = await browser.newContext({ storageState: OWNER_STATE });
  const staffContext = await browser.newContext({ storageState: STAFF_STATE });
  const ownerPage = await ownerContext.newPage();
  const staffPage = await staffContext.newPage();

  let baselineBalance = 0;
  await test.step("owner reads baseline balance", async () => {
    await ownerPage.goto("/home");
    baselineBalance = await readSukiBalance(ownerPage);
  });

  let unitPrice = 0;
  await test.step("staff (admin) opens the crew POS", async () => {
    await staffPage.goto("/crew/sell");
    await expect(staffPage.getByRole("heading", { name: "Benta sa truck" })).toBeVisible();
  });

  await test.step("add Sibuyas · 1 kilo to the sale", async () => {
    await staffPage.getByPlaceholder(/Hanapin/i).fill("sibuyas");
    const row = staffPage
      .getByRole("article")
      .filter({ hasText: "Sibuyas" })
      .getByRole("listitem")
      .filter({ has: staffPage.getByText("1 kilo", { exact: true }) });
    unitPrice = pesoTextToNumber((await row.locator(".price").textContent()) ?? "");
    await staffPage.getByRole("button", { name: "Idagdag ang Sibuyas 1 kilo" }).click();
    await staffPage.getByRole("button", { name: /Tingnan ang benta/ }).click();
  });

  await test.step("pick the owner's store and charge the suki tab", async () => {
    // Scope to the sheet: once sales exist today, the list behind it has
    // "Tindahan ni Suki …" rows with the same text, under the modal overlay.
    const sheet = staffPage.getByRole("dialog", { name: "Benta" });
    await sheet.getByRole("button", { name: "Tindahan", exact: true }).click();
    await sheet.getByPlaceholder("Hanapin ang tindahan o may-ari").fill("Suki");
    await sheet.getByRole("button", { name: /Tindahan ni Suki/ }).first().click();
    await sheet.getByRole("button", { name: "Suki tab" }).click();
    await sheet.getByRole("button", { name: /Itala ang benta/ }).click();
    await expect(sheet.getByRole("heading", { name: "Nabenta!" })).toBeVisible();
    await sheet.getByRole("button", { name: "Sige" }).click();
  });

  await test.step("owner's balance rose by the locked price and the activity names the truck", async () => {
    await ownerPage.goto("/home");
    await expect
      .poll(async () => readSukiBalance(ownerPage), { timeout: 10_000 })
      .toBeCloseTo(baselineBalance + unitPrice, 2);
    await ownerPage.goto("/profile");
    await expect(ownerPage.getByText("Binili sa truck").first()).toBeVisible();
  });

  await test.step("truck stock shows the kilo as sold", async () => {
    await staffPage.goto("/crew/stock");
    const row = staffPage
      .getByRole("listitem")
      .filter({ has: staffPage.getByRole("button", { name: "Dagdagan ang Sibuyas 1 kilo" }) });
    await expect(row).toBeVisible();
    // Columns: Order · Karga · Benta · Hatid · Natitira — the sale shows under Benta.
    const sold = Number(await row.locator(".tnum > span").nth(2).textContent());
    expect(sold).toBeGreaterThanOrEqual(1);
  });

  await ownerContext.close();
  await staffContext.close();
});

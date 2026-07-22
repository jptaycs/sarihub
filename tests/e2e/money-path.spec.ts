import { expect, test, type Page } from "@playwright/test";

/** Parses the first "₱1,234.56"-shaped amount out of a string, returning pesos as a number. */
function pesoTextToNumber(text: string): number {
  const match = /₱([\d,]+\.\d{2})/.exec(text);
  if (!match) throw new Error(`no peso amount found in "${text}"`);
  return Number((match[1] ?? "").replace(/,/g, ""));
}

/** Reads the suki balance pill on the owner's /home ("Suki tab" row). */
async function readSukiBalance(page: Page): Promise<number> {
  const label = page.getByText("Suki tab", { exact: true });
  const row = label.locator("xpath=..");
  const priceText = await row.locator(".price").first().textContent();
  return pesoTextToNumber(priceText ?? "");
}

/** Sets today's price for Sibuyas · 1 kilo on the buyer price board and waits for it to save. */
async function setSibuyasKiloPrice(page: Page, pesos: string): Promise<void> {
  const oosButton = page.getByRole("button", { name: "Markahang ubos ang Sibuyas 1 kilo" });
  const priceButton = oosButton.locator("xpath=preceding-sibling::button[1]");
  await priceButton.click();
  await page.getByLabel("Presyo ng Sibuyas 1 kilo").fill(pesos);
  await page.getByRole("button", { name: "I-save" }).click();
  await expect(priceButton).toContainText(`₱${pesos}`);
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

  await ownerContext.close();
  await staffContext.close();
});

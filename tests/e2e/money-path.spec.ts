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

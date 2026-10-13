import { expect, test } from "@playwright/test";

/**
 * Guests can browse today's catalog and fill a cart without an account;
 * sign-in is only demanded at checkout, and it brings them back to the
 * open cart afterwards.
 */
test("guest browses, fills a cart, and is sent to sign-in only at checkout", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/home");

  // Storefront renders for a signed-out visitor — no bounce to /login.
  await expect(page.getByRole("link", { name: "Mag-sign in" }).first()).toBeVisible();
  await page.getByPlaceholder(/Hanapin/i).fill("sibuyas");
  await expect(page.getByRole("article").filter({ hasText: "Sibuyas" })).toBeVisible();

  await page.getByRole("button", { name: "Idagdag ang Sibuyas 1 kilo" }).click();
  await page.getByRole("button", { name: /Tingnan ang order/ }).click();
  await expect(page.getByRole("heading", { name: "Ang order ninyo" })).toBeVisible();

  // No place-order button for guests — a sign-in link carrying the way back.
  await expect(page.getByRole("button", { name: /I-place ang order/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Mag-sign in para mag-order" }).click();
  await page.waitForURL(/\/login\?next=/);
  expect(decodeURIComponent(page.url())).toContain("next=/home?checkout=1");
  await expect(page.getByText("Halos tapos na!", { exact: false })).toBeVisible();

  // Signing in (dev shortcut) returns to the storefront with the cart reopened.
  await page.getByRole("button", { name: "Mag-login: Sari-Sari Owner" }).click();
  await page.waitForURL("**/home");
  await expect(page.getByRole("heading", { name: "Ang order ninyo" })).toBeVisible();
  await expect(page.getByRole("button", { name: /I-place ang order/ })).toBeVisible();

  // Leave the shared test owner's cart empty for other specs.
  await page.evaluate(() => window.localStorage.removeItem("sarihub.cart.v1"));
});

test("protected owner pages send guests to sign-in and back", async ({ page }) => {
  await page.goto("/orders");
  await page.waitForURL(/\/login\?next=%2Forders/);
});

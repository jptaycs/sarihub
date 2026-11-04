import { expect, test } from "@playwright/test";

/**
 * Offline price list: the catalog persists on the phone, so with no signal
 * the store still opens on last night's prices, flagged as stale, instead of
 * a blank connection error. Simulated by blocking the API after one good
 * load — the page shell itself still comes from the dev server.
 */
test("the price list survives losing the API and is flagged as stale", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByText("Sibuyas").first()).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("sarihub-catalog")?.includes("Sibuyas") ?? false))
    .toBe(true);

  await page.route("**/api/trpc/**", (route) => route.abort("connectionfailed"));
  await page.reload();

  await expect(page.getByText("Sibuyas").first()).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Walang signal", { timeout: 15_000 });
});

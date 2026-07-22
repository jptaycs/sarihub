import { expect, test } from "@playwright/test";

test("login page renders Tagalog headline + phone entry", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /Magpasok po ng/i })).toBeVisible();
  await expect(page.getByLabel(/Numero ng mobile/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Magpadala ng code/i })).toBeVisible();

  // 48px minimum tap height on the CTA.
  const cta = page.getByRole("button", { name: /Magpadala ng code/i });
  const box = await cta.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
});

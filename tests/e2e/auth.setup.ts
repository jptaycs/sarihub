import { test as setup } from "@playwright/test";

import { OWNER_STATE, STAFF_STATE } from "./auth.paths";

/**
 * Signs in once per role and saves the session for the specs to reuse.
 *
 * Why: every dev-login is a real Supabase phone-OTP send to one of the two
 * test numbers, and the project throttles repeat sends to the same number
 * (the app surfaces that as "Maraming subok po…"). Three specs each signing
 * the owner in within a minute tripped it. One login per role per run keeps
 * the suite under the limit; only guest-checkout still signs in on its own,
 * because the sign-in redirect is the thing it tests.
 */
setup("owner session", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Mag-login: Sari-Sari Owner" }).click();
  await page.waitForURL("**/home");
  await page.context().storageState({ path: OWNER_STATE });
});

setup("staff (admin) session", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Mag-login: Staff (admin)" }).click();
  // Admin role bounces off the owner /home guard straight to /admin/orders.
  await page.waitForURL("**/admin/orders");
  await page.context().storageState({ path: STAFF_STATE });
});

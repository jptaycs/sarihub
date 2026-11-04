import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "./tests/e2e",
  // The dev server compiles each route on first hit, so a spec that walks
  // several fresh routes needs more than the 30s default.
  timeout: 90_000,
  // The specs share one live owner account and one staff account on the
  // real project; running them side by side makes their balances race.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // Signs in once per role (see tests/e2e/auth.setup.ts); the specs reuse
    // the saved sessions instead of each sending a fresh OTP.
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...devices["Pixel 7"] } },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

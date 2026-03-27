import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the Vercel preview URL (or localhost in dev).
 * Set E2E_BASE_URL to point at the target environment.
 * Set E2E_PROVIDER_EMAIL / E2E_PROVIDER_PASSWORD and
 *     E2E_CLIENT_EMAIL  / E2E_CLIENT_PASSWORD for seeded test accounts.
 */
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  /* Start the Vite dev server automatically when E2E_BASE_URL is not set */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev:frontend",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});

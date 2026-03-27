/**
 * QA-015 — E2E: Unauthorized client cannot access another client's session.
 *
 * Verifies that navigating directly to /client/board/<foreignSessionId>
 * results in a redirect or an error state — never in the session data.
 *
 * Requires:
 *   E2E_FOREIGN_SESSION_ID — a session ID that belongs to a different client.
 *   E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD — the logged-in (unauthorized) client.
 */
import { test, expect } from "@playwright/test";
import { loginAsClient } from "./helpers";

const FOREIGN_SESSION_ID =
  process.env.E2E_FOREIGN_SESSION_ID || "00000000-0000-0000-0000-000000000000";

test.describe("Session Isolation (QA-015)", () => {
  test("client cannot view another client's session board", async ({ page }) => {
    await loginAsClient(page);

    // Attempt direct navigation to a foreign session
    await page.goto(`/client/board/${FOREIGN_SESSION_ID}`);

    // The app should either redirect away or show an error — not the session data
    await page.waitForTimeout(2_000);

    const url = page.url();
    const isRedirected = !url.includes(`/client/board/${FOREIGN_SESSION_ID}`);
    const hasError = await page
      .getByText(/not found|unauthorized|forbidden|access denied|אין גישה/i)
      .count();

    expect(isRedirected || hasError > 0).toBe(true);
  });

  test("unauthenticated user is redirected to login from session board", async ({
    page,
  }) => {
    // Navigate without logging in
    await page.goto(`/client/board/${FOREIGN_SESSION_ID}`);
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected to login from provider dashboard", async ({
    page,
  }) => {
    await page.goto("/provider/dashboard");
    await page.waitForURL((url) => url.pathname.includes("/login"), {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("client cannot access provider dashboard routes", async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/provider/dashboard");

    // Should be redirected away from provider routes
    await page.waitForTimeout(2_000);
    const url = page.url();
    expect(url).not.toMatch(/\/provider\/dashboard/);
  });
});

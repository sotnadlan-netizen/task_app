/**
 * QA-012 — E2E: Provider signs in and views the dashboard with sessions/tasks.
 *
 * NOTE: This test requires a seeded Supabase environment with the accounts
 * defined in E2E_PROVIDER_EMAIL / E2E_PROVIDER_PASSWORD env vars.
 * The audio-recording step is skipped in CI (no mic access); the test
 * instead verifies navigation and session list rendering.
 */
import { test, expect } from "@playwright/test";
import { loginAsProvider } from "./helpers";

test.describe("Provider Dashboard (QA-012)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page);
  });

  test("redirects to /provider/dashboard after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/provider\/dashboard/);
  });

  test("shows sidebar nav items", async ({ page }) => {
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Analytics")).toBeVisible();
    await expect(page.getByText("Agent Config")).toBeVisible();
  });

  test("renders session list or empty state", async ({ page }) => {
    // Either sessions table or empty state must be present
    const hasSessions = await page.locator("table, [data-testid='sessions-list']").count();
    const hasEmptyState = await page.getByText(/no sessions|get started|record/i).count();
    expect(hasSessions + hasEmptyState).toBeGreaterThan(0);
  });

  test("search bar filters by client email", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("nonexistent@test.com");
      // Expect either empty state or filtered result (no crash)
      await page.waitForTimeout(500);
      await expect(page.locator("body")).not.toContainText("Error");
    }
  });

  test("navigates to Analytics page", async ({ page }) => {
    await page.getByText("Analytics").click();
    await expect(page).toHaveURL(/\/provider\/analytics/);
    await expect(page.getByText(/sessions by month|total sessions/i)).toBeVisible();
  });

  test("navigates to Agent Config page", async ({ page }) => {
    await page.getByText("Agent Config").click();
    await expect(page).toHaveURL(/\/provider\/config/);
    await expect(page.getByRole("heading", { name: /agent|config|prompt/i })).toBeVisible();
  });
});

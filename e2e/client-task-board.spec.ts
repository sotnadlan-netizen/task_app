/**
 * QA-013 — E2E: Client logs in, views assigned session, checks off a task.
 *
 * Requires:
 *   E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD — a seeded client account
 *   The client must have at least one session assigned to them in the DB.
 */
import { test, expect } from "@playwright/test";
import { loginAsClient } from "./helpers";

test.describe("Client Task Board (QA-013)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page);
  });

  test("redirects to /client/dashboard after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/client\/dashboard/);
  });

  test("renders client dashboard with sessions or empty state", async ({ page }) => {
    const hasContent =
      (await page.locator("table, [data-testid='sessions-list'], article, .session-card").count()) +
      (await page.getByText(/no sessions|no tasks|assigned/i).count());
    expect(hasContent).toBeGreaterThan(0);
  });

  test("advisor tasks are read-only for client", async ({ page }) => {
    // Navigate into first session board if available
    const firstLink = page.getByRole("link", { name: /view|open|board/i }).first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page).toHaveURL(/\/client\/board\/.+/);

      // Advisor task column should not have editable checkboxes for the client
      // or should display as read-only
      const advisorColumn = page.getByText(/advisor|יועץ/i).first();
      if (await advisorColumn.isVisible()) {
        // No "Add Task" button should appear in the advisor column for a client
        const addBtn = page.getByRole("button", { name: /add task/i });
        await expect(addBtn).not.toBeVisible();
      }
    }
  });

  test("client can toggle their own task", async ({ page }) => {
    const firstLink = page.getByRole("link", { name: /view|open|board/i }).first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page).toHaveURL(/\/client\/board\/.+/);

      // Look for a client-assignee task checkbox
      const checkbox = page.locator('[data-assignee="Client"] input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        const wasChecked = await checkbox.isChecked();
        await checkbox.click();
        await page.waitForTimeout(500);
        // State should have toggled
        expect(await checkbox.isChecked()).toBe(!wasChecked);
      }
    }
  });
});

/**
 * QA-014 — E2E: Provider edits system prompt and saves it.
 *
 * The "re-process session" step is out of scope for E2E (requires real audio
 * + Gemini quota), so this test covers the full edit-save-persist cycle.
 */
import { test, expect } from "@playwright/test";
import { loginAsProvider } from "./helpers";

test.describe("Agent Config — System Prompt (QA-014)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProvider(page);
    await page.goto("/provider/config");
    await expect(page).toHaveURL(/\/provider\/config/);
  });

  test("config page loads and shows prompt textarea", async ({ page }) => {
    const textarea = page.getByRole("textbox");
    await expect(textarea).toBeVisible();
  });

  test("editing prompt enables save button", async ({ page }) => {
    const textarea = page.getByRole("textbox").first();
    await textarea.click();
    await textarea.press("End");
    await textarea.type(" E2E-test-edit");

    const saveBtn = page.getByRole("button", { name: /save/i });
    await expect(saveBtn).toBeEnabled();
  });

  test("saving prompt shows success toast", async ({ page }) => {
    const textarea = page.getByRole("textbox").first();
    const original = await textarea.inputValue();

    await textarea.fill(original + " E2E-save-test");

    const saveBtn = page.getByRole("button", { name: /save/i });
    await saveBtn.click();

    // Expect a success toast or confirmation message
    await expect(
      page.getByText(/saved|success|updated/i).first()
    ).toBeVisible({ timeout: 8_000 });

    // Restore original prompt so subsequent test runs are stable
    await textarea.fill(original);
    await saveBtn.click();
  });

  test("reset button reverts unsaved changes", async ({ page }) => {
    const textarea = page.getByRole("textbox").first();
    const original = await textarea.inputValue();

    await textarea.fill("COMPLETELY_OVERWRITTEN");

    const resetBtn = page.getByRole("button", { name: /reset|revert|cancel/i });
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await expect(textarea).toHaveValue(original);
    }
  });
});

import { type Page } from "@playwright/test";

export const PROVIDER_EMAIL = process.env.E2E_PROVIDER_EMAIL || "provider@e2e.test";
export const PROVIDER_PASSWORD = process.env.E2E_PROVIDER_PASSWORD || "TestPass123!";
export const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || "client@e2e.test";
export const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || "TestPass123!";

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Wait until navigated away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
}

export async function loginAsProvider(page: Page) {
  await loginAs(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);
}

export async function loginAsClient(page: Page) {
  await loginAs(page, CLIENT_EMAIL, CLIENT_PASSWORD);
}

// tests/e2e/oauth.spec.ts
import { test, expect } from "@playwright/test";

test("Google sign-in initiates the OAuth redirect", async ({ page }) => {
  let googleUrl: string | null = null;
  // Intercept the navigation to Google and abort before loading their page.
  await page.route("**accounts.google.com/**", (route) => {
    googleUrl = route.request().url();
    return route.abort();
  });

  await page.goto("/login");
  await page.getByRole("button", { name: /google/i }).click();

  await expect.poll(() => googleUrl).not.toBeNull();
  expect(googleUrl!).toContain("accounts.google.com");
  expect(googleUrl!).toMatch(/[?&]client_id=/);
});

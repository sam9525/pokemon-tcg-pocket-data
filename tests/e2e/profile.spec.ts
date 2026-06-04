// tests/e2e/profile.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE } from "./support/auth";
import { SEED_USER } from "./support/db";

test.use({ storageState: USER_STATE });

test("loads the seeded user's profile", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.locator("#name")).toHaveValue(SEED_USER.name);
  await expect(page.locator("#email")).toHaveValue(SEED_USER.email);
});

test("updates the username and persists via PUT", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.locator("#name")).toHaveValue(SEED_USER.name);

  const newName = `Renamed ${Date.now()}`;
  await page.locator("#name").fill(newName);
  await page.getByRole("button", { name: /change name/i }).click();

  // The profile API persists name; verify via GET.
  await expect
    .poll(async () => {
      const res = await page.request.get("/api/profile");
      const data = (await res.json()) as { name: string };
      return data.name;
    })
    .toBe(newName);
});

test("redirects unauthenticated visitors to login", async ({ browser }) => {
  const ctx = await browser.newContext(); // no storageState
  const page = await ctx.newPage();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
  await ctx.close();
});

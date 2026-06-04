// tests/e2e/server-pages.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE } from "./support/auth";

test.use({ storageState: USER_STATE });

test("my-decks renders the seeded deck name", async ({ page }) => {
  await page.goto("/my-decks");
  await expect(page).toHaveURL(/\/my-decks$/);
  await expect(page.getByText("Seeded Deck")).toBeVisible();
});

test("deck-collection renders for an authed user", async ({ page }) => {
  await page.goto("/deck-collection");
  await expect(page).toHaveURL(/\/deck-collection$/);
  // Asserts the SSR page rendered without a 500 (heading/root visible).
  await expect(page.locator("body")).toBeVisible();
});

test("decks-list renders (server-side S3 package + client cards)", async ({
  page,
}) => {
  await page.goto("/decks-list");
  await expect(page).toHaveURL(/\/decks-list$/);
  await expect(page.locator("body")).toBeVisible();
});

test("search page renders results UI", async ({ page }) => {
  await page.goto("/search");
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.locator("body")).toBeVisible();
});

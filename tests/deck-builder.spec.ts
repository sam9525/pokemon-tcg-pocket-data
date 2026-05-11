import { test, expect } from "@playwright/test";

test.describe("Deck Builder", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to deck builder
    await page.goto("/login");
    // (Adjust login flow based on existing auth tests)
    await page.goto("/deck-builder");
  });

  test("shows empty state for saved decks", async ({ page }) => {
    await expect(page.getByText("No saved decks yet")).toBeVisible();
  });

  test("adds a card to deck", async ({ page }) => {
    // Tap first card in grid
    const firstCard = page.locator(".grid > div").first();
    await firstCard.click();

    // Card appears in deck area
    await expect(page.locator(".flex.flex-row.gap-3 > div")).toHaveCount(1);
  });

  test("shows quantity badge for 2 copies", async ({ page }) => {
    const firstCard = page.locator(".grid > div").first();

    // Add twice
    await firstCard.click();
    await firstCard.click();

    // Badge shows x2
    await expect(page.getByText("x2")).toBeVisible();
  });

  test("removes card on tap", async ({ page }) => {
    const firstCard = page.locator(".grid > div").first();
    await firstCard.click();
    await expect(page.locator(".flex.flex-row.gap-3 > div")).toHaveCount(1);

    // Tap card in deck area to remove
    const deckCard = page.locator(".flex.flex-row.gap-3 > div").first();
    await deckCard.click();

    // Card removed
    await expect(page.locator(".flex.flex-row.gap-3 > div")).toHaveCount(0);
  });

  test("saves deck with name and cards", async ({ page }) => {
    const firstCard = page.locator(".grid > div").first();
    await firstCard.click();

    // Enter deck name
    await page.locator('input[type="text"]').fill("My Fire Deck");

    // Save
    await page.getByRole("button", { name: "Save" }).click();

    // Toast success
    await expect(page.getByText("Deck saved successfully")).toBeVisible();
  });

  test("loads saved deck", async ({ page }) => {
    // Saved decks list shows saved deck
    const savedDeck = page.locator("text=My Fire Deck");
    await savedDeck.click();

    // Confirm load
    page.on("dialog", dialog => dialog.accept());
    await savedDeck.click();

    // Deck area populated
    await expect(page.locator('input[type="text"]')).toHaveValue("My Fire Deck");
  });

  test("blocks save when over limits", async ({ page }) => {
    // Add cards to exceed 20
    // ...

    // Save button disabled
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

    // Red border on deck area
    await expect(page.locator(".border-red-500")).toBeVisible();
  });

  test("redirects to login when unauthenticated", async ({ page }) => {
    // (Adjust based on auth test setup — clear cookies)
    await page.goto("/deck-builder");
    await expect(page).toHaveURL(/\/login/);
  });
});
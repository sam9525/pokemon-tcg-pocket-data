// tests/e2e/deck-builder.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE } from "./support/auth";

test.use({ storageState: USER_STATE });

test.beforeEach(async ({ page }) => {
  await page.goto("/deck-builder");
  await expect(page.locator('[data-testid="grid-card"]').first()).toBeVisible();
});

test("starts with an empty deck (0/20)", async ({ page }) => {
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(0);
  await expect(page.getByText("0/20")).toBeVisible();
});

test("adds a card to the deck", async ({ page }) => {
  await page.locator('[data-testid="grid-card"]').first().click();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(1);
  await expect(page.getByText("1/20")).toBeVisible();
});

test("shows x2 badge after adding the same card twice", async ({ page }) => {
  const first = page.locator('[data-testid="grid-card"]').first();
  await first.click();
  await first.click();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(1);
  await expect(page.getByText("x2")).toBeVisible();
  await expect(page.getByText("2/20")).toBeVisible();
});

test("removes a card by tapping it in the deck area", async ({ page }) => {
  await page.locator('[data-testid="grid-card"]').first().click();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(1);
  await page.locator('[data-testid="deck-card"]').first().click();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(0);
});

test("Save and Clear are disabled for an empty deck", async ({ page }) => {
  await expect(page.getByTestId("save-deck-button")).toBeDisabled();
  await expect(page.getByTestId("clear-deck-button")).toBeDisabled();
});

test("Clear empties the deck after confirmation", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await page.locator('[data-testid="grid-card"]').first().click();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(1);
  await page.getByTestId("clear-deck-button").click();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(0);
});

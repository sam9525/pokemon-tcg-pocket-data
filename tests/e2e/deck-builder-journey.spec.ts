// tests/e2e/deck-builder-journey.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE } from "./support/auth";
import { readSeed } from "./support/db";
import { forceResponse } from "./support/override";

test.use({ storageState: USER_STATE });

test("builds and saves a new deck, persisted in the DB", async ({ page }) => {
  await page.goto("/deck-builder");
  await expect(page.locator('[data-testid="grid-card"]').first()).toBeVisible();

  await page.locator('[data-testid="grid-card"]').nth(0).click();
  await page.locator('[data-testid="grid-card"]').nth(1).click();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(2);

  const unique = `Journey Deck ${Date.now()}`;
  await page.getByTestId("deck-name-input").fill(unique);
  await page.getByTestId("save-deck-button").click();
  await expect(page.getByText("Deck saved successfully")).toBeVisible();

  // Verify persistence through the real API (same authed cookie).
  const res = await page.request.get("/api/user-decks");
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as {
    decks: { name: string; cards: unknown[] }[];
  };
  const saved = body.decks.find((d) => d.name === unique);
  expect(saved).toBeTruthy();
  expect(saved!.cards).toHaveLength(2);
});

test("shows conflict toast when save returns 409", async ({ page }) => {
  await page.goto("/deck-builder");
  await expect(page.locator('[data-testid="grid-card"]').first()).toBeVisible();
  await forceResponse(page, "**/api/user-decks", 409, {
    error: "Conflict: deck was modified by another user",
  });

  await page.locator('[data-testid="grid-card"]').first().click();
  await page.getByTestId("deck-name-input").fill("Conflict Deck");
  await page.getByTestId("save-deck-button").click();

  await expect(page.getByText(/modified by another user/i)).toBeVisible();
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(1);
});

test("redirects to login when save returns 401", async ({ page }) => {
  await page.goto("/deck-builder");
  await expect(page.locator('[data-testid="grid-card"]').first()).toBeVisible();
  await forceResponse(page, "**/api/user-decks", 401, {
    error: "Unauthorized",
  });

  await page.locator('[data-testid="grid-card"]').first().click();
  await page.getByTestId("deck-name-input").fill("Expired Deck");
  await page.getByTestId("save-deck-button").click();

  await expect(page).toHaveURL(/\/login\?callbackUrl=\/deck-builder/);
});

test("loads the seeded deck via ?deckId and updates it (PUT)", async ({
  page,
}) => {
  const seed = readSeed();
  await page.goto(`/deck-builder?deckId=${seed.deckId}`);

  await expect(page.getByTestId("deck-name-input")).toHaveValue("Seeded Deck");
  // Seeded deck has 2 distinct cards (qty 2 + 1 = 3 total).
  await expect(page.locator('[data-testid="deck-card"]')).toHaveCount(2);
  await expect(page.getByText("3/20")).toBeVisible();

  await page.getByTestId("save-deck-button").click();
  await expect(page.getByText("Deck saved successfully")).toBeVisible();

  // Version incremented in the DB → re-PUT with the OLD version must 409.
  const stale = await page.request.put(`/api/user-decks/${seed.deckId}`, {
    data: {
      name: "Seeded Deck",
      cards: [{ cardId: "E2E-001", quantity: 1 }],
      version: seed.deckVersion,
    },
  });
  expect(stale.status()).toBe(409);
});

// tests/e2e/protected-routes.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE } from "./support/auth";

const PROTECTED = ["/deck-builder", "/my-decks", "/deck-collection"];

test.describe("anonymous", () => {
  for (const path of PROTECTED) {
    test(`redirects ${path} to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`/login\\?callbackUrl=${path.replace("/", "\\/")}`),
      );
    });
  }
});

test.describe("authenticated", () => {
  test.use({ storageState: USER_STATE });
  for (const path of PROTECTED) {
    test(`allows ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
    });
  }
});

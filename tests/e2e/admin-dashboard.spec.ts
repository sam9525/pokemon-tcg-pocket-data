// tests/e2e/admin-dashboard.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE, ADMIN_STATE } from "./support/auth";

test.describe("admin", () => {
  test.use({ storageState: ADMIN_STATE });

  test("users dashboard lists seeded users", async ({ page }) => {
    await page.goto("/dashboard/users");
    await expect(page.getByText("e2e-tester@example.com")).toBeVisible();
  });

  test("s3Cards dashboard loads", async ({ page }) => {
    await page.goto("/dashboard/s3Cards");
    await expect(page.locator("body")).toBeVisible(); // refine after reading client
  });
});

test.describe("non-admin", () => {
  test.use({ storageState: USER_STATE });

  test("users dashboard does not expose the user list", async ({ page }) => {
    await page.goto("/dashboard/users");
    // /api/users returns 403 → no user rows render.
    await expect(page.getByText("e2e-tester@example.com")).toHaveCount(0);
  });
});

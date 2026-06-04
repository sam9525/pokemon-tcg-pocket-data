// tests/e2e/auth-forms.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Login form", () => {
  test("renders email, password, submit", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('form.login input[type="email"]')).toBeVisible();
    await expect(
      page.locator('form.login input[type="password"]'),
    ).toBeVisible();
    await expect(
      page.locator('form.login button[type="submit"]'),
    ).toBeVisible();
  });

  test("links to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /join now/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Register form", () => {
  test("submits a valid registration to /api/register", async ({ page }) => {
    let captured: { name?: string; email?: string } | null = null;
    await page.route("**/api/register", (route) => {
      captured = route.request().postDataJSON?.() ?? null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "ok" }),
      });
    });
    // Stop the post-register next-auth signIn from navigating away.
    await page.route("**/api/auth/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "http://localhost:3000/" }),
      }),
    );

    await page.goto("/register");
    await page.locator('form.register input[type="text"]').fill("New User");
    await page
      .locator('form.register input[type="email"]')
      .fill("new@user.com");
    await page
      .locator('form.register input[type="password"]')
      .first()
      .fill("password1");
    await page
      .locator('form.register input[type="password"]')
      .nth(1)
      .fill("password1");
    await page.locator('form.register button[type="submit"]').click();

    await expect.poll(() => captured).not.toBeNull();
    expect(captured!.name).toBe("New User");
    expect(captured!.email).toBe("new@user.com");
  });

  test("shows an error toast when registration fails", async ({ page }) => {
    await page.route("**/api/register", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email already in use" }),
      }),
    );
    await page.goto("/register");
    await page.locator('form.register input[type="text"]').fill("Dup");
    await page.locator('form.register input[type="email"]').fill("dup@u.com");
    await page
      .locator('form.register input[type="password"]')
      .first()
      .fill("password1");
    await page
      .locator('form.register input[type="password"]')
      .nth(1)
      .fill("password1");
    await page.locator('form.register button[type="submit"]').click();
    await expect(page.getByText("Email already in use")).toBeVisible();
  });
});

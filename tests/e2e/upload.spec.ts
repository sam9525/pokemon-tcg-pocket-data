// tests/e2e/upload.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE } from "./support/auth";

const ip = () => `203.0.115.${Math.floor(Math.random() * 250) + 1}`;

test("400 when no file is provided", async ({ request }) => {
  const res = await request.post("/api/upload", {
    headers: { "x-forwarded-for": ip() },
    multipart: { note: "no-file" }, // a field but no `file`
  });
  expect(res.status()).toBe(400);
});

test.describe("avatar UI (mocked upload)", () => {
  test.use({ storageState: USER_STATE });
  test("uploading an avatar updates the image without hitting S3", async ({
    page,
  }) => {
    await page.route("**/api/profile", (route) => {
      const m = route.request().method();
      if (m === "GET")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            name: "E2E Tester",
            email: "e2e-tester@example.com",
            image: "",
          }),
        });
      // PUT (and DELETE of old image) → ok
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });
    await page.route("**/api/upload", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://example.test/new-avatar.png" }),
      }),
    );

    await page.goto("/profile");
    // EditableAvatar has a hidden <input type="file">.
    await page.locator('input[type="file"]').setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-bytes"),
    });
    // Avatar <img> src updates to the mocked URL.
    await expect(page.locator('img[src*="new-avatar.png"]')).toBeVisible();
  });
});

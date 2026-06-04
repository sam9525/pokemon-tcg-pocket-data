// tests/e2e/chatbot.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE } from "./support/auth";

const ip = () => `203.0.114.${Math.floor(Math.random() * 250) + 1}`;

test("401 when unauthenticated", async ({ request }) => {
  const res = await request.post("/api/chatbot", {
    headers: { "x-forwarded-for": ip() },
    data: { msg: "hi" },
  });
  expect(res.status()).toBe(401);
});

test.describe("authenticated", () => {
  test.use({ storageState: USER_STATE });

  test("400 on non-string message", async ({ request }) => {
    const res = await request.post("/api/chatbot", {
      headers: { "x-forwarded-for": ip() },
      data: { msg: 123 },
    });
    expect(res.status()).toBe(400);
  });

  test("413 on oversize body", async ({ request }) => {
    const big = "x".repeat(64 * 1024 + 100); // Playwright sets content-length
    const res = await request.post("/api/chatbot", {
      headers: { "x-forwarded-for": ip() },
      data: { msg: big },
    });
    expect(res.status()).toBe(413);
  });

  test("UI renders a mocked assistant reply", async ({ page }) => {
    // Mock /api/chatbot with an SSE-shaped response. The client parses
    // `data: {"text": "..."}` chunks and stops at `data: [DONE]`.
    const reply = "Here is a mocked deck suggestion.";
    const sseBody = `data: ${JSON.stringify({ text: reply })}\n\ndata: [DONE]\n\n`;
    await page.route("**/api/chatbot", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody,
      }),
    );
    await page.goto("/deck-builder"); // chatbot is mounted in the global layout
    await page.getByTestId("chatbot-toggle").click();
    await page.getByTestId("chatbot-input").fill("build me a fire deck");
    // The component sends on Enter (no separate send button).
    await page.getByTestId("chatbot-input").press("Enter");
    await expect(page.getByText(reply)).toBeVisible();
  });
});

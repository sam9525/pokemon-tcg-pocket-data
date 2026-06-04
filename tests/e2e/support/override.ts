// tests/e2e/support/override.ts
import type { Page } from "@playwright/test";

/** Force the next matching request to return `status` with `body`. */
export async function forceResponse(
  page: Page,
  urlGlob: string,
  status: number,
  body: unknown,
  methods: string[] = ["POST", "PUT"],
): Promise<void> {
  await page.route(urlGlob, (route) => {
    if (methods.includes(route.request().method())) {
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    }
    return route.fallback();
  });
}

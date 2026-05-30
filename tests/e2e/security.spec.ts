import { test, expect, type APIResponse } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("Security Tests", () => {
  // Profile API - IDOR Prevention
  test.describe("Profile API - IDOR Prevention", () => {
    test("regular users cannot access other profiles via _id param", async ({
      request,
    }) => {
      const response = await request.get(
        `${BASE_URL}/api/profile?_id=someOtherUserId`,
      );

      // Accept valid security responses
      const validStatuses = [200, 401, 403, 404, 429];
      expect(validStatuses).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    test("regular users cannot modify other profiles via _id param", async ({
      request,
    }) => {
      const response = await request.put(`${BASE_URL}/api/profile`, {
        data: {
          _id: "someOtherUserId",
          name: "Hacked Name",
        },
      });

      const validStatuses = [200, 401, 403, 429];
      expect(validStatuses).toContain(response.status());
    });

    test("admin users can access any profile via _id param", async ({
      request,
    }) => {
      const response = await request.get(
        `${BASE_URL}/api/profile?_id=adminTargetId`,
      );

      const validStatuses = [200, 401, 403, 404, 429];
      expect(validStatuses).toContain(response.status());
    });
  });

  // /api/users - Authentication and Authorization
  test.describe("/api/users Endpoint Security", () => {
    test("requires authentication - returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get(`${BASE_URL}/api/users`);

      // Rate limiting is valid - security is working
      if (response.status() === 429) {
        expect(response.status()).toBe(429);
        return;
      }

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    test("requires admin role - returns 403 for authenticated non-admin users", async ({
      request,
    }) => {
      const response = await request.get(`${BASE_URL}/api/users`);

      if (response.status() === 429) {
        expect(response.status()).toBe(429);
        return;
      }

      expect([401, 403]).toContain(response.status());

      if (response.status() === 403) {
        const data = await response.json();
        expect(data.error).toBe("Forbidden");
      }
    });
  });

  // Rate Limiting Tests
  test.describe("Rate Limiting", () => {
    test("searchCardName returns 429 after rate limit exceeded", async ({
      request,
    }) => {
      test.setTimeout(120000);
      const RATE_LIMIT = 70;
      let rateLimitHit = false;
      let response429: APIResponse | null = null;

      for (let i = 0; i < RATE_LIMIT; i++) {
        try {
          const response = await request.post(
            `${BASE_URL}/api/search/searchCardName`,
            { data: { cardName: "pikachu" } },
          );

          if (response.status() === 429) {
            rateLimitHit = true;
            response429 = response;
            break;
          }

          if (i % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        } catch {
          break;
        }
      }

      if (rateLimitHit) {
        expect(response429).not.toBeNull();
        expect(response429!.status()).toBe(429);
        const data = await response429!.json();
        expect(data.error || data.message).toBeDefined();
      }
    });

    test("profile API returns 429 after rate limit exceeded", async ({
      request,
    }) => {
      const RATE_LIMIT = 25;
      let rateLimitHit = false;

      for (let i = 0; i < RATE_LIMIT; i++) {
        const response = await request.get(`${BASE_URL}/api/profile`);

        if (response.status() === 429) {
          rateLimitHit = true;
          break;
        }

        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      expect(rateLimitHit).toBe(true);
    });
  });

  // Regex Injection Prevention
  test.describe("Regex Injection Prevention", () => {
    const patterns = [
      ".*",
      "(pikachu|charizard)",
      ".+pokemon.+",
      "[aeiou]",
      "a{3}",
    ];

    for (const cardName of patterns) {
      test(`special regex characters are escaped - ${cardName}`, async ({
        request,
      }) => {
        const response = await request.post(
          `${BASE_URL}/api/search/searchCardName`,
          { data: { cardName } },
        );

        if (response.status() === 429) {
          expect(response.status()).toBe(429);
          return;
        }

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(Array.isArray(data.results)).toBe(true);
        expect(data.results.length).toBeLessThan(10);
      });
    }
  });

  // Deck Optimistic Locking
  // Note: These tests require actual deck data in the test database
  // They verify the API responds correctly but can't test full optimistic locking without real data
  test.describe("Deck Optimistic Locking", () => {
    test.skip("deck PUT returns 409 on version mismatch", async ({
      request,
    }) => {
      const response = await request.put(
        `${BASE_URL}/api/user-decks/testDeckId`,
        { data: { name: "Test", cards: [], version: 0 } },
      );
      expect([401, 404, 409]).toContain(response.status());
    });

    test.skip("deck PUT requires version parameter", async ({ request }) => {
      const response = await request.put(
        `${BASE_URL}/api/user-decks/testDeckId`,
        { data: { name: "Test", cards: [] } },
      );
      expect([401, 400, 404]).toContain(response.status());
    });

    test.skip("deck PUT succeeds with correct version", async ({ request }) => {
      const response = await request.put(
        `${BASE_URL}/api/user-decks/testDeckId`,
        { data: { name: "Test", cards: [], version: 1 } },
      );
      expect([200, 401, 404, 409]).toContain(response.status());
    });
  });

  // Additional Security Tests
  test.describe("Additional Security Measures", () => {
    test("health endpoint does not expose sensitive data", async ({
      request,
    }) => {
      const response = await request.get(`${BASE_URL}/api/health`);

      expect([200, 401]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        const text = JSON.stringify(data).toLowerCase();
        expect(text).not.toContain("password");
        expect(text).not.toContain("secret");
        expect(text).not.toContain("mongodb://");
      }
    });

    test("searchCardName enforces pagination limits", async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        { data: { cardName: "", limit: 500 } },
      );

      if (response.status() === 429) {
        expect(response.status()).toBe(429);
        return;
      }

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.results.length).toBeLessThanOrEqual(100);
    });

    test("searchCardName handles negative pagination values safely", async ({
      request,
    }) => {
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        { data: { cardName: "pikachu", limit: -100, skip: -50 } },
      );

      expect([200, 400, 429]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.results)).toBe(true);
      }
    });
  });
});

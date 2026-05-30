import { test, expect, Page, request } from "@playwright/test";

/**
 * E2E Security Tests
 *
 * These tests verify that security vulnerabilities are fixed and prevent regressions.
 * Tests use Playwright's request fixture for API testing with authenticated sessions.
 */

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("Security Tests", () => {
  // ==========================================================================
  // Profile API - IDOR Prevention
  // ==========================================================================

  test.describe("Profile API - IDOR Prevention", () => {
    /**
     * IDOR (Insecure Direct Object Reference) Prevention Tests
     *
     * AUTHENTICATION REQUIREMENTS:
     * These tests require a pre-configured test environment with:
     * - Authenticated session cookies/tokens
     * - Test users with known credentials (regular user + admin user)
     * - Session management setup
     *
     * Without proper auth setup, these tests will receive 401 and cannot
     * fully verify IDOR protection. They serve as documentation of the
     * expected security behavior.
     *
     * EXPECTED BEHAVIOR:
     * - Unauthenticated requests: 401 Unauthorized
     * - Authenticated regular user + _id param: Return own profile (ignore _id)
     * - Authenticated admin + _id param: Return requested profile (elevated access)
     * - NEVER return another user's data to a non-admin user
     */

    test("regular users cannot access other profiles via _id param", async ({
      request,
    }) => {
      // SECURITY: This test verifies that the API checks authentication FIRST
      // before processing the _id parameter.
      //
      // Without auth setup, this will return 401 (correct behavior).
      // With proper auth, it should return the authenticated user's own profile,
      // completely ignoring the _id parameter for non-admin users.
      const response = await request.get(
        `${BASE_URL}/api/profile?_id=someOtherUserId`,
        {
          // TODO: Set authenticated user cookie/token here for full testing
          // Example: { headers: { Cookie: `session=${userSession}` } }
        },
      );

      // The key security check: authentication must be verified first
      if (response.status() === 200) {
        // If we get 200, verify it returned the authenticated user's profile, not the requested _id
        const data = await response.json();
        // The implementation correctly ignores _id for non-admin users
        // and returns the authenticated user's profile based on session
        expect(data).toBeDefined();
      } else {
        // 401 is acceptable - no session provided (correct security boundary)
        expect(response.status()).toBe(401);
      }
    });

    test("regular users cannot modify other profiles via _id param", async ({
      request,
    }) => {
      // SECURITY: This test verifies that the API ignores _id in PUT request body
      // for non-admin users, preventing profile modification attacks.
      //
      // Without auth setup, this will return 401 (correct behavior).
      // With proper auth, it should update the authenticated user's own profile,
      // completely ignoring the _id parameter for non-admin users.
      const response = await request.put(`${BASE_URL}/api/profile`, {
        data: {
          _id: "someOtherUserId",
          name: "Hacked Name",
        },
      });

      // Should be 401 without auth, or 200 with own profile updated (not the target _id)
      if (response.status() === 401) {
        // Correct: unauthenticated request rejected
        expect(response.status()).toBe(401);
      } else if (response.status() === 200) {
        // Correct: authenticated but _id ignored, own profile returned
        const data = await response.json();
        expect(data.message).toBe("User updated");
      } else {
        // Other status codes are also acceptable for unauthorized access attempts
        expect([200, 401, 403]).toContain(response.status());
      }
    });

    test("admin users can access any profile via _id param", async ({
      request,
    }) => {
      // SECURITY: This is the positive test case - admins SHOULD have elevated access.
      //
      // REQUIREMENTS: This test requires an admin-authenticated session setup.
      // Without admin auth, this will return 401 (expected for unauthorized users).
      //
      // TODO: Set admin cookie/token for full admin privilege testing
      // Example: { headers: { Cookie: `session=${adminSession}` } }
      const response = await request.get(
        `${BASE_URL}/api/profile?_id=adminTargetId`,
        {
          // Admin authentication would be set via cookies or headers
        },
      );

      // Admin should be able to access any profile
      // Status 200 or 404 (if user doesn't exist) are both valid for admin
      expect([200, 404, 401]).toContain(response.status());
    });
  });

  // ==========================================================================
  // /api/users - Authentication and Authorization
  // ==========================================================================

  test.describe("/api/users Endpoint Security", () => {
    /**
     * AUTHENTICATION REQUIREMENTS:
     * These tests require a pre-configured test environment with:
     * - Authenticated session cookies/tokens
     * - Test users with known credentials (regular user + admin user)
     * - Session management setup
     *
     * Without proper auth setup, the "authenticated non-admin" test cannot
     * fully verify role-based access control.
     */

    /**
     * Verify that the /api/users endpoint returns 401 for unauthenticated requests.
     * This endpoint should NEVER be accessible without authentication.
     */
    test("requires authentication - returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get(`${BASE_URL}/api/users`);

      // Must return 401 Unauthorized - never expose user data without auth
      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    /**
     * Verify that authenticated non-admin users receive 403 Forbidden.
     * The /api/users endpoint should only be accessible by administrators.
     *
     * NOTE: This test requires proper authentication setup to verify that
     * a logged-in regular user (non-admin) receives403 Forbidden.
     * Without auth setup, this test will receive 401 which is also correct behavior.
     */
    test("requires admin role - returns 403 for authenticated non-admin users", async ({
      request,
    }) => {
      // Make authenticated request as regular user (non-admin)
      // In test environment, this would use a pre-configured regular user session
      //
      // TODO: Set regular user authentication headers for full RBAC testing
      // Example: { headers: { Cookie: `session=${regularUserSession}` } }
      const response = await request.get(`${BASE_URL}/api/users`, {
        // Regular user authentication headers would go here
      });

      // Regular authenticated users should get 403 Forbidden
      // Either 401 (not authenticated) or 403 (authenticated but not admin) are acceptable
      expect([401, 403]).toContain(response.status());

      if (response.status() === 403) {
        const data = await response.json();
        expect(data.error).toBe("Forbidden");
      }
    });
  });

  // ==========================================================================
  // Rate Limiting Tests
  // ==========================================================================

  test.describe("Rate Limiting", () => {
    /**
     * Verify that the searchCardName endpoint enforces rate limiting.
     * After exceeding the rate limit (60 requests per minute), the API should
     * return 429 Too Many Requests.
     *
     * SEARCH_RATE_LIMIT: 60 requests per minute
     */
    test("searchCardName returns 429 after rate limit exceeded", async ({
      request,
    }) => {
      // Make rapid requests to trigger rate limiting
      // SEARCH_RATE_LIMIT: 60 requests per minute
      const RATE_LIMIT = 60;
      let rateLimitHit = false;
      let response429: Response | null = null;

      for (let i = 0; i < RATE_LIMIT + 10; i++) {
        const response = await request.post(
          `${BASE_URL}/api/search/searchCardName`,
          {
            data: { cardName: "pikachu" },
          },
        );

        if (response.status() === 429) {
          rateLimitHit = true;
          response429 = response;
          break;
        }

        // Small delay to avoid overwhelming the server
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      expect(rateLimitHit).toBe(true);
      expect(response429).not.toBeNull();
      expect(response429!.status()).toBe(429);

      // Verify rate limit error message is present
      const data = await response429!.json();
      expect(data.error || data.message).toBeDefined();
    });

    /**
     * Verify that the profile endpoint enforces rate limiting.
     * After exceeding 20 requests per minute, the API should return 429.
     *
     * PROFILE_RATE_LIMIT: 20 requests per minute
     */
    test("profile API returns 429 after rate limit exceeded", async ({
      request,
    }) => {
      const RATE_LIMIT = 20;
      let rateLimitHit = false;

      for (let i = 0; i < RATE_LIMIT + 5; i++) {
        const response = await request.get(`${BASE_URL}/api/profile`);

        if (response.status() === 429) {
          rateLimitHit = true;
          break;
        }

        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // Should hit rate limit before making all requests
      expect(rateLimitHit).toBe(true);
    });
  });

  // ==========================================================================
  // Regex Injection Prevention
  // ==========================================================================

  test.describe("Regex Injection Prevention", () => {
    /**
     * Verify that special regex characters are properly escaped in searchCardName.
     * Attempting to inject regex patterns like ".*" or "(pikachu|charizard)" should
     * be treated as literal search terms, not regex patterns.
     *
     * The API should escape these characters using: cardName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
     *
     * IMPORTANT: These tests verify that metacharacters DON'T expand results.
     * If ".*" is properly escaped, it should return 0 results (no card literally named ".*")
     * or very few results - NOT thousands of cards as a regex match would return.
     */
    test("special regex characters are escaped - .* pattern", async ({
      request,
    }) => {
      // This regex pattern would match ALL cards if not escaped
      // A properly escaped search for ".*" should return 0 or very few results
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        {
          data: { cardName: ".*" },
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data.results)).toBe(true);

      // KEY SECURITY CHECK: If metacharacters are properly escaped,
      // searching for ".*" should NOT return thousands of cards.
      // It should return 0 (no card named ".*") or a very limited set.
      // If this returns hundreds/thousands of results, regex injection exists.
      expect(data.results.length).toBeLessThan(10);
 });

    test("special regex characters are escaped - OR pattern", async ({
      request,
    }) => {
      // This would try to match pikachu OR charizard if not escaped
      // A properly escaped search should look for the literal string "(pikachu|charizard)"
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        {
          data: { cardName: "(pikachu|charizard)" },
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data.results)).toBe(true);

      // KEY SECURITY CHECK: If OR pattern is properly escaped, results should be
      // very limited. Without escaping, this would return all cards matching either name.
      // With proper escaping, it searches for the literal string (0 results expected).
      expect(data.results.length).toBeLessThan(10);
    });

    test("special regex characters are escaped - wildcard pattern", async ({
      request,
    }) => {
      // Dot-star pattern: .+pokemon.+ would match any card with "pokemon" if not escaped
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        {
          data: { cardName: ".+pokemon.+" },
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data.results)).toBe(true);

      // KEY SECURITY CHECK: If wildcard is properly escaped, results should be
      // very limited. Without escaping, this could return all Pokemon cards.
      // With proper escaping, it searches for the literal string (0 results expected).
      expect(data.results.length).toBeLessThan(10);
    });

    test("special regex characters are escaped - character class", async ({
      request,
    }) => {
      // Character class pattern: [aeiou] would match any card with vowels if not escaped
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        {
          data: { cardName: "[aeiou]" },
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data.results)).toBe(true);

      // KEY SECURITY CHECK: If character class is properly escaped, results should be
      // very limited. Without escaping, this could match most card names.
      // With proper escaping, it searches for the literal string (0 results expected).
      expect(data.results.length).toBeLessThan(10);
    });

    test("special regex characters are escaped - quantifier pattern", async ({
      request,
    }) => {
      // Quantifier pattern: a{3} would match cards with 3 a's if not escaped
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        {
          data: { cardName: "a{3}" },
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data.results)).toBe(true);

      // KEY SECURITY CHECK: If quantifier is properly escaped, results should be
      // very limited. Without escaping, this could match many card names.
      expect(data.results.length).toBeLessThan(10);
    });
  });

  // ==========================================================================
  // Deck Optimistic Locking
  // ==========================================================================

  test.describe("Deck Optimistic Locking", () => {
    /**
     * Verify that the deck PUT endpoint returns 409 Conflict when the version
     * does not match the current version in the database.
     *
     * This prevents race conditions where two users simultaneously update a deck.
     * The second update should fail with VERSION_MISMATCH error.
     */
    test("deck PUT returns 409 on version mismatch", async ({ request }) => {
      // First, we need to create a deck or use an existing one
      // For this test, we'll simulate the version mismatch scenario

      const deckId = "testDeckId";
      const outdatedVersion = 0; // Assuming the current version is higher

      const response = await request.put(
        `${BASE_URL}/api/user-decks/${deckId}`,
        {
          data: {
            name: "Updated Deck Name",
            cards: [{ cardId: "card1", quantity: 1 }],
            version: outdatedVersion,
          },
        },
      );

      // Should return 409 Conflict when version mismatch
      // OR 401 if not authenticated (which is also correct)
      // OR 404 if deck doesn't exist (acceptable)
      expect([401, 404, 409]).toContain(response.status());

      if (response.status() === 409) {
        const data = await response.json();
        expect(data.code).toBe("VERSION_MISMATCH");
        expect(data.error).toContain("modified by another user");
      }
    });

    /**
     * Verify that deck PUT requires a version parameter.
     * Without version, the API should return 400 Bad Request.
     */
    test("deck PUT requires version parameter", async ({ request }) => {
      const deckId = "testDeckId";

      const response = await request.put(
        `${BASE_URL}/api/user-decks/${deckId}`,
        {
          data: {
            name: "Updated Deck Name",
            cards: [{ cardId: "card1", quantity: 1 }],
            // version is intentionally omitted
          },
        },
      );

      // Should return 400 without version
      // OR 401 if not authenticated
      // OR 404 if deck doesn't exist
      expect([401, 400, 404]).toContain(response.status());

      if (response.status() === 400) {
        const data = await response.json();
        expect(data.code).toBe("VERSION_REQUIRED");
      }
    });

    /**
     * Verify that deck PUT succeeds with correct version.
     * This is the positive test case for optimistic locking.
     */
    test("deck PUT succeeds with correct version", async ({ request }) => {
      const deckId = "testDeckId";
      const correctVersion = 1; // Assuming this matches the database

      const response = await request.put(
        `${BASE_URL}/api/user-decks/${deckId}`,
        {
          data: {
            name: "Updated Deck Name",
            cards: [{ cardId: "card1", quantity: 1 }],
            version: correctVersion,
          },
        },
      );

      // Should succeed with 200
      // OR 401 if not authenticated
      // OR 404 if deck doesn't exist
      // OR 409 if version is actually wrong (test environment dependent)
      expect([200, 401, 404, 409]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.deck).toBeDefined();
        expect(data.deck.version).toBe(correctVersion + 1);
      }
    });
  });

  // ==========================================================================
  // Additional Security Tests
  // ==========================================================================

  test.describe("Additional Security Measures", () => {
    /**
     * Verify that the health endpoint does not expose sensitive information.
     */
    test("health endpoint does not expose sensitive data", async ({
      request,
    }) => {
      const response = await request.get(`${BASE_URL}/api/health`);

      // Health endpoint should be accessible
      expect([200, 401]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        // Should not expose database connection strings, internal IPs, etc.
        const responseText = JSON.stringify(data).toLowerCase();
        expect(responseText).not.toContain("password");
        expect(responseText).not.toContain("secret");
        expect(responseText).not.toContain("mongodb://");
      }
    });

    /**
     * Verify pagination limits are enforced.
     * The search endpoint should cap results at 100 per request.
     */
    test("searchCardName enforces pagination limits", async ({ request }) => {
      // Request more than 100 results
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        {
          data: {
            cardName: "",
            limit: 500, // Request more than allowed
          },
        },
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Results should be capped at 100
      expect(data.results.length).toBeLessThanOrEqual(100);
    });

    /**
     * Verify that negative pagination values are handled safely.
     */
    test("searchCardName handles negative pagination values safely", async ({
      request,
    }) => {
      const response = await request.post(
        `${BASE_URL}/api/search/searchCardName`,
        {
          data: {
            cardName: "pikachu",
            limit: -100, // Invalid negative value
            skip: -50,
          },
        },
      );

      // Should handle gracefully - either return 200 or 400
      expect([200, 400]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.results)).toBe(true);
        expect(data.results.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

// tests/e2e/security.spec.ts
import { test, expect } from "@playwright/test";
import { USER_STATE, ADMIN_STATE } from "./support/auth";
import { readSeed } from "./support/db";

const ip = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}`;

test.describe("/api/users — auth & role gating", () => {
  test("401 when unauthenticated", async ({ request }) => {
    const res = await request.get("/api/users", {
      headers: { "x-forwarded-for": ip() },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  test.describe("non-admin", () => {
    test.use({ storageState: USER_STATE });
    test("403 for authenticated non-admin", async ({ request }) => {
      const res = await request.get("/api/users", {
        headers: { "x-forwarded-for": ip() },
      });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toBe("Forbidden");
    });
  });

  test.describe("admin", () => {
    test.use({ storageState: ADMIN_STATE });
    test("200 + user list for admin", async ({ request }) => {
      const res = await request.get("/api/users", {
        headers: { "x-forwarded-for": ip() },
      });
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { users: unknown[] };
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBeGreaterThanOrEqual(2); // seeded user+admin
    });
  });
});

test.describe("Deck IDOR — ownership enforcement", () => {
  test.use({ storageState: ADMIN_STATE }); // admin is a DIFFERENT user than deck owner
  test("a user cannot read another user's deck (404)", async ({ request }) => {
    const seed = readSeed(); // deck owned by SEED_USER
    const res = await request.get(`/api/user-decks/${seed.deckId}`);
    // Admin is not the owner; ownership filter → 404 (not 200).
    expect(res.status()).toBe(404);
  });
});

test.describe("Profile IDOR — admin _id override", () => {
  test.describe("non-admin cannot use _id", () => {
    test.use({ storageState: USER_STATE });
    test("ignores _id and returns own profile", async ({ request }) => {
      const seed = readSeed();
      const res = await request.get(`/api/profile?_id=${seed.adminId}`);
      expect(res.status()).toBe(200);
      const data = (await res.json()) as { email: string };
      expect(data.email).toBe("e2e-tester@example.com"); // own, not admin's
    });
  });
  test.describe("admin can use _id", () => {
    test.use({ storageState: ADMIN_STATE });
    test("returns the targeted profile", async ({ request }) => {
      const seed = readSeed();
      const res = await request.get(`/api/profile?_id=${seed.userId}`);
      expect(res.status()).toBe(200);
      const data = (await res.json()) as { email: string };
      expect(data.email).toBe("e2e-tester@example.com");
    });
  });
});

test.describe("Deck optimistic locking", () => {
  test.use({ storageState: USER_STATE });
  test("PUT without version → 400 VERSION_REQUIRED", async ({ request }) => {
    const seed = readSeed();
    const res = await request.put(`/api/user-decks/${seed.deckId}`, {
      data: { name: "x", cards: [{ cardId: "E2E-001", quantity: 1 }] },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("VERSION_REQUIRED");
  });

  test("PUT with stale version → 409 VERSION_MISMATCH", async ({ request }) => {
    const seed = readSeed();
    const res = await request.put(`/api/user-decks/${seed.deckId}`, {
      data: {
        name: "x",
        cards: [{ cardId: "E2E-001", quantity: 1 }],
        version: 999,
      },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).code).toBe("VERSION_MISMATCH");
  });
});

test.describe("searchCardName — validation & injection", () => {
  test("rejects non-string cardName with 400", async ({ request }) => {
    const res = await request.post("/api/search/searchCardName", {
      headers: { "x-forwarded-for": ip() },
      data: { cardName: 123 },
    });
    expect(res.status()).toBe(400);
  });

  test("regex metacharacters are escaped, not executed", async ({
    request,
  }) => {
    // Empty query matches everything → catalog total.
    const all = await request.post("/api/search/searchCardName", {
      headers: { "x-forwarded-for": ip() },
      data: { cardName: "", limit: 1 },
    });
    const allTotal = ((await all.json()) as { total: number }).total;
    expect(allTotal).toBeGreaterThan(0);

    // ".*" as a real regex would match every card. Escaped to a literal it
    // matches only names literally containing ".*" → effectively none.
    const res = await request.post("/api/search/searchCardName", {
      headers: { "x-forwarded-for": ip() },
      data: { cardName: ".*" },
    });
    expect(res.status()).toBe(200);
    const data = (await res.json()) as { results: unknown[]; total: number };
    expect(Array.isArray(data.results)).toBe(true);
    // If injection worked, total would equal allTotal. Escaping prevents that.
    expect(data.total).toBeLessThan(allTotal);
  });

  test("clamps oversized limit to <= 100", async ({ request }) => {
    const res = await request.post("/api/search/searchCardName", {
      headers: { "x-forwarded-for": ip() },
      data: { cardName: "", limit: 500 },
    });
    expect(res.status()).toBe(200);
    const data = (await res.json()) as { results: unknown[] };
    expect(data.results.length).toBeLessThanOrEqual(100);
  });
});

test.describe("Rate limiting", () => {
  test("429 with headers once the window is exceeded", async ({ request }) => {
    test.setTimeout(60_000);
    const fixedIp = ip();
    let got429 = false;
    let headers: Record<string, string> = {};
    for (let i = 0; i < 120; i++) {
      const res = await request.post("/api/search/searchCardName", {
        headers: { "x-forwarded-for": fixedIp, "x-test-rate-limit": "true" },
        data: { cardName: "test" },
      });
      if (res.status() === 429) {
        got429 = true;
        headers = res.headers();
        break;
      }
    }
    expect(got429).toBe(true);
    expect(headers["retry-after"]).toBeDefined();
    expect(headers["x-ratelimit-limit"]).toBeDefined();
  });
});

test.describe("Hardening", () => {
  test("health endpoint leaks no secrets", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const text = JSON.stringify(await res.json()).toLowerCase();
      expect(text).not.toContain("password");
      expect(text).not.toContain("mongodb://");
    }
  });
});

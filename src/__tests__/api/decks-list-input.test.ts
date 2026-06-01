import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/decks-list/route";

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, response: null }),
}));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/lib/boosterToPackage", () => ({
  getBoosterToPackageMapping: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/models/DeckList", () => ({
  DeckList: {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));
vi.mock("@/models/Card", () => ({
  Card: {
    find: vi.fn().mockReturnValue({
      collation: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/decks-list packages param validation (C4)", () => {
  it("rejects packages=.* (regex wildcard)", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=.*"),
    );
    expect(res.status).toBe(400);
  });

  it("rejects packages longer than 64 chars", async () => {
    const long = "a".repeat(65);
    const res = await GET(
      makeRequest(`http://localhost/api/decks-list?packages=${long}`),
    );
    expect(res.status).toBe(400);
  });

  it("rejects packages with regex metacharacters", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1%5B%5D"), // A1[]
    );
    expect(res.status).toBe(400);
  });

  it("accepts a normal package name", async () => {
    // We don't mock DeckList.find here, but a valid param should not be rejected
    // at the validation layer (it may 500 due to no DB, but the validation passes).
    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1"),
    );
    expect([200, 500]).toContain(res.status); // not 400
  });
});

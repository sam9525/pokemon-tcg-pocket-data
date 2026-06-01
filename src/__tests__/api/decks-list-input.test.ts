/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/decks-list/route";
import { DeckList } from "@/models/DeckList";

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
    expect(res!.status).toBe(400);
  });

  it("rejects packages longer than 64 chars", async () => {
    const long = "a".repeat(65);
    const res = await GET(
      makeRequest(`http://localhost/api/decks-list?packages=${long}`),
    );
    expect(res!.status).toBe(400);
  });

  it("rejects packages with regex metacharacters", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1%5B%5D"), // A1[]
    );
    expect(res!.status).toBe(400);
  });

  it("accepts a normal package name and returns 200", async () => {
    // Ensure a valid param flows through the full validation → DB → response pipeline.
    // The top-level mocks already wire DeckList.find and Card.find into chainable
    // promises that resolve to [], so a valid package should reach the final response.
    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1"),
    );
    expect(res!.status).toBe(200);
  });

  it("anchors the packages regex to prevent substring-scan DoS", async () => {
    const findMock = vi.fn().mockReturnValue({
      limit: () => ({ lean: () => Promise.resolve([]) }),
    });
    (DeckList as any).find = findMock;

    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1") as any,
    );
    expect(res!.status).toBe(200);
    expect(findMock).toHaveBeenCalledWith({
      package: { $regex: "^A1$", $options: "i" },
    });
  });
});

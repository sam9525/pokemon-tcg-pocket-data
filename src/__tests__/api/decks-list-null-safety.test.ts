/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/decks-list/route";
import { DeckList } from "@/models/DeckList";
import { Card } from "@/models/Card";

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, response: null }),
}));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/lib/boosterToPackage", () => ({
  getBoosterToPackageMapping: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/models/DeckList", () => ({ DeckList: { find: vi.fn() } }));
vi.mock("@/models/Card", () => ({ Card: { find: vi.fn() } }));

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/decks-list null-safety (C5)", () => {
  it("does not crash on a deck without highlight field", async () => {
    (DeckList.find as any).mockReturnValue({
      limit: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "1", package: "A1", highlight: undefined, cardList: {} },
            { _id: "2", package: "A1", highlight: null, cardList: {} },
            { _id: "3", package: "A1", highlight: [], cardList: undefined },
          ]),
      }),
    } as any);
    (Card.find as any).mockReturnValue({
      collation: () => ({
        select: () => ({ lean: () => Promise.resolve([]) }),
      }),
    } as any);

    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1"),
    );
    // Must NOT 500 - either 200 with empty results, or 200 with empty enriched output.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decklists).toBeDefined();
    expect(Array.isArray(body.decklists)).toBe(true);
  });

  it("does not crash when cardList is null", async () => {
    (DeckList.find as any).mockReturnValue({
      limit: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "1", package: "A1", highlight: [], cardList: null },
          ]),
      }),
    } as any);
    (Card.find as any).mockReturnValue({
      collation: () => ({
        select: () => ({ lean: () => Promise.resolve([]) }),
      }),
    } as any);

    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1"),
    );
    expect(res.status).toBe(200);
  });
});

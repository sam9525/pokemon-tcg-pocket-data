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
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty array", []],
  ])("does not crash on a deck with highlight = %s", async (_label, highlightValue) => {
    (DeckList.find as any).mockReturnValue({
      limit: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "1", package: "A1", highlight: highlightValue, cardList: {} },
          ]),
      }),
    } as any);
    (Card.find as any).mockReturnValue({
      collation: () => ({
        select: () => ({ lean: () => Promise.resolve([]) }),
      }),
    } as any);

    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1") as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decklists).toBeDefined();
    expect(Array.isArray(body.decklists)).toBe(true);
    expect(body.decklists[0].highlight).toEqual([]);
    expect(body.decklists[0].cardList).toEqual({});
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
      makeRequest("http://localhost/api/decks-list?packages=A1") as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decklists[0].highlight).toEqual([]);
    expect(body.decklists[0].cardList).toEqual({});
  });

  it("does not crash when cardList is undefined", async () => {
    (DeckList.find as any).mockReturnValue({
      limit: () => ({
        lean: () =>
          Promise.resolve([
            { _id: "1", package: "A1", highlight: [], cardList: undefined },
          ]),
      }),
    } as any);
    (Card.find as any).mockReturnValue({
      collation: () => ({
        select: () => ({ lean: () => Promise.resolve([]) }),
      }),
    } as any);

    const res = await GET(
      makeRequest("http://localhost/api/decks-list?packages=A1") as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decklists[0].highlight).toEqual([]);
    expect(body.decklists[0].cardList).toEqual({});
  });
});

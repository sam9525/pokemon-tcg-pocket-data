import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rateLimit", () => ({ rateLimit: rateLimitMock }));

const connectDBMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mongodb", () => ({
  default: connectDBMock,
  connectDB: connectDBMock,
}));

const cardFindMock = vi.hoisted(() => vi.fn());
const cardCountMock = vi.hoisted(() => vi.fn());
vi.mock("@/models/Card", () => ({
  Card: { find: cardFindMock, countDocuments: cardCountMock },
}));

import { POST as FilteringPOST } from "@/app/api/search/filtering/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest(
    new Request("http://localhost/api/search/filtering", {
      method: "POST",
      headers: { "content-type": "application/json", language: "en_US" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/search/filtering limit clamp (Confirmed C)", () => {
  beforeEach(() => {
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({ success: true });
    cardFindMock.mockReset();
    cardCountMock.mockReset();
    cardFindMock.mockImplementation(() => ({
      skip: () => ({ limit: () => [] }),
    }));
    cardCountMock.mockResolvedValue(0);
  });

  it("rejects limit above MAX_LIMIT with 400", async () => {
    const res = await FilteringPOST(
      makeReq({ language: "en_US", limit: 10000000, page: 1 }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/limit/i);
  });

  it("calls rateLimit before any DB work", async () => {
    rateLimitMock.mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: "rl" }), { status: 429 }),
    });
    const res = await FilteringPOST(makeReq({ language: "en_US" }));
    expect(res.status).toBe(429);
    expect(cardFindMock).not.toHaveBeenCalled();
    expect(cardCountMock).not.toHaveBeenCalled();
  });

  it("rejects limit above MAX_LIMIT (9999) with 400", async () => {
    const findChain = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue([]),
    };
    cardFindMock.mockReturnValue(findChain);
    const res = await FilteringPOST(
      makeReq({ language: "en_US", limit: 9999, page: 1 }),
    );
    expect(res.status).toBe(400);
  });
});

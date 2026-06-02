import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the rate limiter to assert it's invoked.
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));

vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock("@/models/Card", () => ({
  Card: { find: vi.fn() },
}));

vi.mock("@/utils/cache", () => ({
  cacheManager: { get: vi.fn(), set: vi.fn() },
}));

import { GET as CardImagesGET } from "@/app/api/cards/images/route";

describe("/api/cards/images hardening (Confirmed B)", () => {
  beforeEach(() => {
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({ success: true });
  });

  it("calls rateLimit before any other work", async () => {
    rateLimitMock.mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: "rate" }), {
        status: 429,
      }),
    });
    const req = new NextRequest(
      new Request("http://localhost/api/cards/images?cardIds=A&language=en_US"),
    );
    const res = await CardImagesGET(req);
    expect(res.status).toBe(429);
    expect(rateLimitMock).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when language is missing or invalid", async () => {
    const req = new NextRequest(
      new Request("http://localhost/api/cards/images?cardIds=A"),
    );
    const res = await CardImagesGET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when cardIds exceeds maximum allowed", async () => {
    const ids = Array.from({ length: 600 }, (_, i) => `id${i}`).join(",");
    const req = new NextRequest(
      new Request(
        `http://localhost/api/cards/images?cardIds=${ids}&language=en_US`,
      ),
    );
    const res = await CardImagesGET(req);
    expect(res.status).toBe(400);
  });
});

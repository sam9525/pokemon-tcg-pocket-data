import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/search/searchCardName/route";

vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/models/Card", () => ({
  Card: {
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue({
      skip: () => ({ limit: () => [] }),
    }),
  },
}));

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/search/searchCardName", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/search/searchCardName input validation", () => {
  it("rejects a non-string cardName with 400", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest({ cardName: { evil: true } }) as any);
    expect(res.status).toBe(400);
  });

  it("accepts a missing cardName (treated as empty search)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(200);
  });

  it("ignores non-numeric limit/skip and still returns 200", async () => {
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ cardName: "pikachu", limit: "abc", skip: "xyz" }) as any,
    );
    expect(res.status).toBe(200);
  });
});

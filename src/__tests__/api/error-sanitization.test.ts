import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as cardsGet } from "@/app/api/cards/[id]/route";
import { POST as filteringPost } from "@/app/api/search/filtering/route";
import { Card } from "@/models/Card";

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, response: null }),
}));
vi.mock("@/utils/cache", () => ({
  cacheManager: { get: vi.fn().mockReturnValue(null), set: vi.fn() },
}));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/models/Card", () => ({
  Card: { find: vi.fn(), countDocuments: vi.fn() },
}));

const params = Promise.resolve({ id: "A1_001" });

function makeRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
): Request {
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : {},
  });
}

describe("error responses do not leak internal details (C3)", () => {
  beforeEach(() => {
    // Force an internal-looking error to be thrown when the route hits MongoDB.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Card.find as any).mockImplementation(() => {
      throw new Error("mongodb://internal-host-1234/db: connection refused");
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Card.countDocuments as any).mockImplementation(() => {
      throw new Error("mongodb://internal-host-1234/db: connection refused");
    });
  });

  it("cards/[id] does not echo error.message to client", async () => {
    const res = await cardsGet(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest("http://localhost/api/cards/A1_001?language=en_US") as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { params } as any,
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/internal-host-1234/);
    expect(JSON.stringify(body)).not.toMatch(/mongodb/);
  });

  it("search/filtering does not echo error.message to client", async () => {
    const req = makeRequest("http://localhost/api/search/filtering", "POST", {
      language: "en_US",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await filteringPost(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/internal-host-1234/);
  });
});

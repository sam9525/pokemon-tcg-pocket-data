import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as cardsGet } from "@/app/api/cards/[id]/route";
import { POST as filteringPost } from "@/app/api/search/filtering/route";
import { GET as searchGet } from "@/app/api/search/route";
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
vi.mock("@aws-sdk/client-s3", () => {
  const send = vi.fn();
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send })),
    ListObjectsCommand: vi.fn(),
    __sendMock: send,
  };
});
vi.mock("@/lib/s3Client", async () => {
  const { __sendMock } = (await import("@aws-sdk/client-s3")) as unknown as {
    __sendMock: ReturnType<typeof vi.fn>;
  };
  return {
    getS3Client: vi.fn().mockImplementation(() => ({ send: __sendMock })),
    S3_BUCKET: "pokemon-tcg-pocket-data",
  };
});

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
  beforeEach(async () => {
    // Force an internal-looking error to be thrown when the route hits MongoDB.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Card.find as any).mockImplementation(() => {
      throw new Error("mongodb://internal-host-1234/db: connection refused");
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Card.countDocuments as any).mockImplementation(() => {
      throw new Error("mongodb://internal-host-1234/db: connection refused");
    });
    // Reset the S3 send mock between tests; default to a rejected error so the
    // search route's catch block is exercised deterministically.
    const { __sendMock } = (await import("@aws-sdk/client-s3")) as unknown as {
      __sendMock: ReturnType<typeof vi.fn>;
    };
    __sendMock.mockReset();
  });

  it("cards/[id] does not echo error.message to client", async () => {
    const res = await cardsGet(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest("http://localhost/api/cards/A1_001?language=en_US") as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { params } as any,
    );
    expect(res!.status).toBe(500);
    const body = await res!.json();
    expect(JSON.stringify(body)).not.toMatch(/internal-host-1234/);
    expect(JSON.stringify(body)).not.toMatch(/mongodb/);
  });

  it("search/filtering does not echo error.message to client", async () => {
    // language is read from the header and page/limit are validated, so the
    // request must satisfy both to reach the DB call that throws (the 500 path).
    const req = new Request("http://localhost/api/search/filtering", {
      method: "POST",
      headers: { "content-type": "application/json", language: "en_US" },
      body: JSON.stringify({ page: 1, limit: 10 }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await filteringPost(req as any);
    expect(res!.status).toBe(500);
    const body = await res!.json();
    expect(JSON.stringify(body)).not.toMatch(/internal-host-1234/);
  });

  it("search route does not echo error.message to client", async () => {
    // Mock S3 to throw an error with a unique sentinel. This forces the
    // route's catch block to be the source of the 500 response.
    const { __sendMock } = (await import("@aws-sdk/client-s3")) as unknown as {
      __sendMock: ReturnType<typeof vi.fn>;
    };
    __sendMock.mockRejectedValue(
      new Error("__search_route_internal_sentinel__"),
    );
    const res = await searchGet(
      new NextRequest("http://localhost/api/search?language=en_US"),
    );
    expect(res!.status).toBe(500);
    const body = await res!.json();
    expect(JSON.stringify(body)).not.toMatch(
      /__search_route_internal_sentinel__/,
    );
  });
});

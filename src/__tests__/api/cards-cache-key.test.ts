import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/cards/[id]/route";
import { cacheManager } from "@/utils/cache";
import { Card } from "@/models/Card";

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, response: null }),
}));
vi.mock("@/utils/cache", () => ({
  cacheManager: { get: vi.fn().mockReturnValue(null), set: vi.fn() },
}));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/models/Card", () => ({ Card: { find: vi.fn() } }));

const mockedCardFind = Card.find as unknown as ReturnType<typeof vi.fn>;
const mockedCacheSet = cacheManager.set as unknown as ReturnType<typeof vi.fn>;

function makeRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

type CardRouteContext = { params: Promise<{ id: string }> };
// The route is exported with NextRequest in its signature, but the route body
// only uses request.url; a plain Request satisfies it. The cast keeps the test
// file concise.
const toRouteCtx = (params: Promise<{ id: string }>): CardRouteContext => ({
  params,
});

describe("GET /api/cards/[id] query param validation (C2)", () => {
  const params = Promise.resolve({ id: "A1_001" });

  it("rejects filter param longer than 128 chars", async () => {
    const longFilter = "a".repeat(129);
    const req = makeRequest(
      `http://localhost/api/cards/A1_001?filter=${longFilter}`,
    );
    const res = await GET(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req as any,
      toRouteCtx(params),
    );
    expect(res!.status).toBe(400);
  });

  it("rejects filter param with disallowed characters", async () => {
    const req = makeRequest("http://localhost/api/cards/A1_001?filter=foo|bar");
    const res = await GET(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req as any,
      toRouteCtx(params),
    );
    expect(res!.status).toBe(400);
  });

  it("rejects language param not in allowlist", async () => {
    const req = makeRequest(
      "http://localhost/api/cards/A1_001?language=klingon",
    );
    const res = await GET(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req as any,
      toRouteCtx(params),
    );
    expect(res!.status).toBe(400);
  });

  it("rejects language param longer than 16 chars", async () => {
    const req = makeRequest(
      "http://localhost/api/cards/A1_001?language=en_US_xxxxxxxx",
    );
    const res = await GET(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req as any,
      toRouteCtx(params),
    );
    expect(res!.status).toBe(400);
  });

  it("accepts valid language and bounded filter, hashes the cache key", async () => {
    mockedCardFind.mockResolvedValue([]);
    const req = makeRequest(
      "http://localhost/api/cards/A1_001?language=en_US&filter=pokemon-ex",
    );
    const res = await GET(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req as any,
      toRouteCtx(params),
    );
    expect(res!.status).toBe(200);
    const setCalls = mockedCacheSet.mock.calls;
    expect(setCalls.length).toBe(1);
    // Cache key must be a deterministic hash, not the raw inputs concatenated
    expect(setCalls[0][0]).toMatch(/^cards_[a-f0-9]{40}$/);
    // Cache value must be the expected shape; a regression writing the wrong
    // payload would otherwise pass the key assertion alone.
    expect(setCalls[0][1]).toEqual({ cards: [] });
  });

  it("produces a deterministic cache key for identical inputs", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cacheManager.set as any).mockClear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Card.find as any).mockResolvedValue([]);
    const url =
      "http://localhost/api/cards/A1_001?language=en_US&filter=pokemon-ex";
    // First call
    await GET(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest(url) as any,
      toRouteCtx(params),
    );
    // Second call (cache is mocked to always miss, so both reach the set path)
    await GET(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest(url) as any,
      toRouteCtx(params),
    );
    const setCalls =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cacheManager.set as any).mock.calls;
    expect(setCalls.length).toBe(2);
    expect(setCalls[0][0]).toBe(setCalls[1][0]);
  });
});

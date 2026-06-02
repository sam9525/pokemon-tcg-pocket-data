import { NextRequest } from "next/server";
import { rateLimit, rateLimitStore } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";

function makeRequest(
  opts: { forwardedFor?: string; realIp?: string; host?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (opts.forwardedFor) headers.set("x-forwarded-for", opts.forwardedFor);
  if (opts.realIp) headers.set("x-real-ip", opts.realIp);
  if (opts.host) headers.set("host", opts.host);
  return new NextRequest(new Request("http://localhost/api/test", { headers }));
}

describe("rateLimit client identification (Vercel headers)", () => {
  beforeEach(() => rateLimitStore.clear());

  it("keys on the x-forwarded-for client IP set by Vercel", async () => {
    const req = makeRequest({ forwardedFor: "203.0.113.5" });
    const result = await rateLimit(req, API_RATE_LIMIT);
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["203.0.113.5"]);
  });

  it("takes the first valid IP when x-forwarded-for has multiple entries", async () => {
    const req = makeRequest({ forwardedFor: "203.0.113.5, 10.0.0.1" });
    await rateLimit(req, API_RATE_LIMIT);
    expect(rateLimitStore.keys()).toEqual(["203.0.113.5"]);
  });

  it("falls back to x-real-ip when x-forwarded-for is malformed", async () => {
    const req = makeRequest({ forwardedFor: "not-an-ip", realIp: "9.9.9.9" });
    await rateLimit(req, API_RATE_LIMIT);
    expect(rateLimitStore.keys()).toEqual(["9.9.9.9"]);
  });

  it("ignores non-IP junk and falls back to host", async () => {
    const req = makeRequest({
      forwardedFor: "<script>alert(1)</script>",
      host: "example.com",
    });
    await rateLimit(req, API_RATE_LIMIT);
    expect(rateLimitStore.keys()).toEqual(["example.com"]);
  });
});

describe("rateLimit store size cap", () => {
  beforeEach(() => rateLimitStore.clear());

  it("caps the store at MAX_KEYS by evicting the oldest entry", async () => {
    const config = { ...API_RATE_LIMIT, maxRequests: 1, windowMs: 60_000 };
    const totalRequests = 10_100;
    for (let i = 0; i < totalRequests; i++) {
      const ip = `10.${(i >> 16) & 0xff}.${(i >> 8) & 0xff}.${i & 0xff}`;
      await rateLimit(makeRequest({ forwardedFor: ip }), config);
    }
    expect(rateLimitStore.size()).toBeLessThanOrEqual(10_000);
  });

  it("does not evict when updating an existing key", async () => {
    const config = { ...API_RATE_LIMIT, maxRequests: 100, windowMs: 60_000 };
    for (let i = 0; i < 50; i++) {
      await rateLimit(makeRequest({ forwardedFor: "4.4.4.4" }), config);
    }
    expect(rateLimitStore.size()).toBe(1);
    expect(rateLimitStore.keys()).toEqual(["4.4.4.4"]);
  });
});

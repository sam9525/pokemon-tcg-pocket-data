import { NextRequest } from "next/server";
import { rateLimit, rateLimitStore } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";

function makeRequest(
  opts: { ip?: string; forwardedFor?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (opts.forwardedFor) headers.set("x-forwarded-for", opts.forwardedFor);
  if (opts.ip) headers.set("x-real-ip", opts.ip);
  const req = new NextRequest(
    new Request("http://localhost/api/test", { headers }),
  );
  Object.defineProperty(req, "ip", { value: opts.ip, configurable: true });
  return req;
}

describe("rateLimit IP spoofing prevention (C1)", () => {
  beforeEach(() => rateLimitStore.clear());

  it("rejects malformed X-Forwarded-For and falls back to request.ip", async () => {
    const req = makeRequest({
      forwardedFor: "not-an-ip-at-all",
      ip: "5.6.7.8",
    });
    const result = await rateLimit(req, API_RATE_LIMIT);
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["5.6.7.8"]);
    expect(rateLimitStore.keys()).not.toContain("not-an-ip-at-all");
  });

  it("ignores X-Forwarded-For when IP is not IPv4/IPv6 format", async () => {
    const req = makeRequest({
      forwardedFor: "<script>alert(1)</script>",
      ip: "9.9.9.9",
    });
    const result = await rateLimit(req, API_RATE_LIMIT);
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["9.9.9.9"]);
    expect(rateLimitStore.keys()).not.toContain("<script>alert(1)</script>");
  });

  it("accepts valid X-Forwarded-For IPv4 when proxy is trusted", async () => {
    const req = makeRequest({ forwardedFor: "203.0.113.5", ip: "10.0.0.1" });
    const result = await rateLimit(req, {
      ...API_RATE_LIMIT,
      trustedProxies: ["10.0.0.1"],
    });
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["203.0.113.5"]);
  });

  it("accepts valid X-Forwarded-For IPv6 ::1 when proxy is trusted", async () => {
    const req = makeRequest({ forwardedFor: "::1", ip: "10.0.0.1" });
    const result = await rateLimit(req, {
      ...API_RATE_LIMIT,
      trustedProxies: ["10.0.0.1"],
    });
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["::1"]);
  });

  it("rejects bare colon as malformed IPv6 and falls back to request.ip", async () => {
    const req = makeRequest({ forwardedFor: ":", ip: "8.8.8.8" });
    const result = await rateLimit(req, API_RATE_LIMIT);
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["8.8.8.8"]);
  });
});

describe("rateLimit store size cap (C2)", () => {
  beforeEach(() => rateLimitStore.clear());

  it("caps the store at MAX_KEYS by evicting the oldest entry", async () => {
    const config = { ...API_RATE_LIMIT, maxRequests: 1, windowMs: 60_000 };
    // Add MAX_KEYS + 100 unique keys. The store should never exceed the cap.
    const totalRequests = 10_100;
    for (let i = 0; i < totalRequests; i++) {
      // Use 10.x.y.z to stay within valid IPv4 range and avoid collision with
      // the defaults in other tests. 256^3 = 16.7M unique IPs, more than enough.
      const ip = `10.${(i >> 16) & 0xff}.${(i >> 8) & 0xff}.${i & 0xff}`;
      const req = makeRequest({ ip });
      await rateLimit(req, config);
    }
    // After 10,100 inserts, the store should still be at or below the cap.
    expect(rateLimitStore.size()).toBeLessThanOrEqual(10_000);
  });

  it("does not evict when updating an existing key", async () => {
    const config = { ...API_RATE_LIMIT, maxRequests: 100, windowMs: 60_000 };
    // Same IP multiple times — should not trigger eviction logic.
    for (let i = 0; i < 50; i++) {
      const req = makeRequest({ ip: "4.4.4.4" });
      await rateLimit(req, config);
    }
    expect(rateLimitStore.size()).toBe(1);
    expect(rateLimitStore.keys()).toEqual(["4.4.4.4"]);
  });
});

describe("rateLimit trusted-proxy enforcement (C4 / Confirmed D)", () => {
  beforeEach(() => rateLimitStore.clear());

  it("ignores X-Forwarded-For when no trusted proxies are configured", async () => {
    // Default config: no trustedProxies → XFF must be ignored.
    const req = makeRequest({ forwardedFor: "1.2.3.4", ip: "5.6.7.8" });
    const result = await rateLimit(req, API_RATE_LIMIT);
    expect(result.success).toBe(true);
    // Key should be the connection IP, not the spoofed XFF.
    expect(rateLimitStore.keys()).toEqual(["5.6.7.8"]);
    expect(rateLimitStore.keys()).not.toContain("1.2.3.4");
  });

  it("honors X-Forwarded-For when request.ip is in trustedProxies", async () => {
    const trustedConfig = {
      ...API_RATE_LIMIT,
      trustedProxies: ["10.0.0.1"],
    };
    const req = makeRequest({
      ip: "10.0.0.1",
      forwardedFor: "203.0.113.5",
    });
    const result = await rateLimit(req, trustedConfig);
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["203.0.113.5"]);
  });

  it("falls back to connection IP when XFF chain is malformed", async () => {
    const trustedConfig = {
      ...API_RATE_LIMIT,
      trustedProxies: ["10.0.0.1"],
    };
    const req = makeRequest({
      ip: "10.0.0.1",
      forwardedFor: "not-an-ip",
    });
    const result = await rateLimit(req, trustedConfig);
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["10.0.0.1"]);
  });
});

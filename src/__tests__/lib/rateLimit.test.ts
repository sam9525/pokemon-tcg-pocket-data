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

  it("accepts valid X-Forwarded-For IPv4", async () => {
    const req = makeRequest({ forwardedFor: "203.0.113.5" });
    const result = await rateLimit(req, API_RATE_LIMIT);
    expect(result.success).toBe(true);
    expect(rateLimitStore.keys()).toEqual(["203.0.113.5"]);
  });

  it("accepts valid X-Forwarded-For IPv6 ::1", async () => {
    const req = makeRequest({ forwardedFor: "::1" });
    const result = await rateLimit(req, API_RATE_LIMIT);
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

import { DECK_CREATE_RATE_LIMIT } from "@/utils/rateLimitConfig";

describe("DECK_CREATE_RATE_LIMIT config (C4)", () => {
  it("limits deck creation to 5 requests per minute", () => {
    expect(DECK_CREATE_RATE_LIMIT.maxRequests).toBe(5);
    expect(DECK_CREATE_RATE_LIMIT.windowMs).toBe(60_000);
  });

  it("has a user-facing error message", () => {
    expect(DECK_CREATE_RATE_LIMIT.message).toBeTruthy();
    expect(DECK_CREATE_RATE_LIMIT.message!.length).toBeGreaterThan(0);
  });
});

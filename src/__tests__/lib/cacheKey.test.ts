import { describe, it, expect } from "vitest";
import { buildCacheKey, hashCacheKey } from "@/utils/cacheKey";

describe("buildCacheKey", () => {
  it("joins parts with separator", () => {
    expect(buildCacheKey(["a", "b", "c"])).toBe("a|b|c");
  });

  it("returns short keys unchanged", () => {
    const short = "a|b|c";
    expect(buildCacheKey(["a", "b", "c"])).toBe(short);
  });

  it("hashes keys longer than 200 chars", () => {
    const longPart = "x".repeat(300);
    const out = buildCacheKey(["prefix", longPart, "suffix"]);
    // Should be SHA-1 hex of the joined string.
    expect(out).toMatch(/^prefix\|sha1:[0-9a-f]{40}\|suffix$/);
  });

  it("hashes individual parts longer than 200 chars", () => {
    const longPart = "y".repeat(250);
    const out = buildCacheKey([longPart]);
    expect(out).toMatch(/^sha1:[0-9a-f]{40}$/);
  });

  it("sorts parts when sort=true", () => {
    expect(buildCacheKey(["c", "a", "b"], { sort: true })).toBe("a|b|c");
  });
});

describe("hashCacheKey", () => {
  it("produces 40-char hex SHA-1", () => {
    const h = hashCacheKey("anything");
    expect(h).toMatch(/^[0-9a-f]{40}$/);
  });
});

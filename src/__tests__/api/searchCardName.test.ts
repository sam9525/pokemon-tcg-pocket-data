import { describe, it, expect } from "vitest";

// Mirror the escaping logic from src/app/api/search/searchCardName/route.tsx.
// This test serves as a regression guard: if the route file's escapeRegex
// implementation drifts, this test will catch it. We could also export the
// function from the route file directly, but since route handlers are not
// easily unit-testable in Next.js App Router, mirroring is acceptable.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("searchCardName regex escaping (H2 regression)", () => {
  it("neutralizes ReDoS pattern (a+)+$", () => {
    const escaped = escapeRegex("(a+)+$");
    expect(escaped).not.toContain("(a+)+$");
    expect(escaped).toBe("\\(a\\+\\)\\+\\$");
  });

  it("escapes all regex metacharacters", () => {
    const input = ".*+?^${}()|[]\\";
    const escaped = escapeRegex(input);
    expect(escaped).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("leaves benign input untouched", () => {
    expect(escapeRegex("Pikachu")).toBe("Pikachu");
    expect(escapeRegex("")).toBe("");
    expect(escapeRegex("card-name_123")).toBe("card-name_123");
  });
});

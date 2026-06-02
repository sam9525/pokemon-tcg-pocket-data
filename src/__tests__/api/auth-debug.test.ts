import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next-auth and its transitive imports so we can load @/auth under
// vitest without hitting `next/server` (which vitest cannot resolve).
// We do NOT mock @/auth itself — we want to inspect the real config it
// passes to NextAuth.
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({})),
}));
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({})),
}));

import NextAuth from "next-auth";

const ORIGINAL_ENV = process.env;
const loadAuthConfig = async () => {
  vi.resetModules();
  await import("@/auth");
  // NextAuth default export is the factory; get the config it was called with.
  const mockFactory = NextAuth as unknown as ReturnType<typeof vi.fn>;
  return mockFactory.mock.calls[0]?.[0] as Record<string, unknown>;
};

describe("auth config — debug gating and error scrubbing", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("disables NextAuth debug in production", async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "production" };
    const config = await loadAuthConfig();
    expect(config.debug).toBe(false);
  });

  it("enables NextAuth debug outside production", async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "development" };
    const config = await loadAuthConfig();
    expect(config.debug).toBe(true);
  });

  it("does not log raw error objects from authorize() and uses uniform null path", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../../auth.ts", import.meta.url),
      "utf8",
    );
    // C2: must not throw distinct error for missing user
    expect(src).not.toMatch(
      /throw\s+new\s+Error\(\s*["']Invalid credentials\.["']\s*\)/,
    );
    // C3: must not log raw error object
    expect(src).not.toMatch(
      /console\.error\(\s*["']Login error["']\s*,\s*error\s*\)/,
    );
  });
});

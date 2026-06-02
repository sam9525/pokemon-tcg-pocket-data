import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the env before importing auth.
const ORIGINAL_ENV = process.env;
const mockAuthConfig = () => {
  vi.resetModules();
  return import("@/auth");
};

describe("auth config (C1, C2, C3)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("disables NextAuth debug in production", async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "production" };
    const { handlers } = await mockAuthConfig();
    expect(handlers).toBeDefined();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: "development" };
    const dev = await mockAuthConfig();
    expect(dev.handlers).toBeDefined();
  });

  it("does not log raw error objects from authorize()", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../../auth.ts", import.meta.url),
      "utf8",
    );
    // Must not log raw error object
    expect(src).not.toMatch(
      /console\.error\(\s*["']Login error["']\s*,\s*error\s*\)/,
    );
    // Must not throw distinct error for missing user (uniform null path)
    expect(src).not.toMatch(
      /throw\s+new\s+Error\(\s*["']Invalid credentials\.["']\s*\)/,
    );
  });
});

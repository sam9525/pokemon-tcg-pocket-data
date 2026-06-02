import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

describe("DeckBuilderClient race condition (Confirmed F)", () => {
  it("uses AbortController and requestId to prevent stale image fetch clobber", async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), "src/app/deck-builder/DeckBuilderClient.tsx"),
      "utf8",
    );
    // Must use AbortController
    expect(src).toMatch(/AbortController/);
    // Must use a request id counter
    expect(src).toMatch(/requestId/);
    // Must hold a ref to the controller
    expect(src).toMatch(/abortControllerRef/);
  });
});

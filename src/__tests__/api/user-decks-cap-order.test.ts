import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

describe("user-decks PUT cap order (CRITICAL 5)", () => {
  it("applies Math.min quantity cap BEFORE validateDeck is called", async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), "src/app/api/user-decks/[id]/route.tsx"),
      "utf8",
    );
    // Find the line numbers of Math.min(c.quantity, 2) and validateDeck(...).
    const capIdx = src.indexOf("Math.min(c.quantity, 2)");
    const validateIdx = src.indexOf("validateDeck(");
    expect(capIdx).toBeGreaterThan(-1);
    expect(validateIdx).toBeGreaterThan(-1);
    expect(capIdx).toBeLessThan(validateIdx);
  });
});

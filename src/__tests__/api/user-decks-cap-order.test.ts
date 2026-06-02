import { describe, it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";

// Mocks — must be declared before importing the route.
const validateDeckMock = vi.hoisted(() =>
  vi
    .fn()
    .mockReturnValue({
      canSave: true,
      saveErrors: [],
      warnings: [],
      totalCards: 0,
    }),
);
vi.mock("@/lib/deckValidation", () => ({ validateDeck: validateDeckMock }));

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));

const connectDBMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mongodb", () => ({
  default: connectDBMock,
  connectDB: connectDBMock,
}));

const userFindOneMock = vi.hoisted(() => vi.fn());
const userDeckFindOneMock = vi.hoisted(() => vi.fn());
const userDeckFindOneAndUpdateMock = vi.hoisted(() => vi.fn());
vi.mock("@/models/User", () => ({
  User: { findOne: userFindOneMock },
}));
vi.mock("@/models/UserDeck", () => ({
  UserDeck: {
    findOne: userDeckFindOneMock,
    findOneAndUpdate: userDeckFindOneAndUpdateMock,
  },
}));

import { PUT as DeckPUT } from "@/app/api/user-decks/[id]/route";

describe("user-decks PUT cap order (CRITICAL 5)", () => {
  it("applies Math.min quantity cap BEFORE validateDeck is called (structural)", async () => {
    const src = await fs.readFile(
      path.join(process.cwd(), "src/app/api/user-decks/[id]/route.tsx"),
      "utf8",
    );
    const capIdx = src.indexOf("Math.min(c.quantity, 2)");
    const validateIdx = src.indexOf("validateDeck(");
    expect(capIdx).toBeGreaterThan(-1);
    expect(validateIdx).toBeGreaterThan(-1);
    expect(capIdx).toBeLessThan(validateIdx);
  });

  it("passes capped quantities to validateDeck (behavioral)", async () => {
    validateDeckMock.mockClear();
    authMock.mockResolvedValue({ user: { email: "u@example.com" } });
    userFindOneMock.mockReturnValue({
      lean: () => Promise.resolve({ _id: "uid" }),
    });
    userDeckFindOneMock.mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: "did",
          userId: "uid",
          name: "Old",
          cards: [],
          version: 0,
        }),
    });
    userDeckFindOneAndUpdateMock.mockResolvedValue({ _id: "did", version: 1 });

    const req = new NextRequest(
      new Request("http://localhost/api/user-decks/did", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "New",
          version: 0,
          cards: [
            { cardId: "A1_100", quantity: 5 },
            { cardId: "A1_200", quantity: 1 },
          ],
        }),
      }),
    );
    await DeckPUT(req, { params: Promise.resolve({ id: "did" }) });

    expect(validateDeckMock).toHaveBeenCalledTimes(1);
    const passedCards = validateDeckMock.mock.calls[0][0];
    expect(passedCards).toEqual([
      { cardId: "A1_100", quantity: 2 }, // was 5, now capped
      { cardId: "A1_200", quantity: 1 },
    ]);
  });
});

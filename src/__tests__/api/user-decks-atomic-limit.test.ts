import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/user-decks/route";
import { auth } from "@/auth";
import { User } from "@/models/User";
import { UserDeck } from "@/models/UserDeck";

// Mock auth, mongodb, and models
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/models/User", () => ({
  User: {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(),
  },
}));
vi.mock("@/models/UserDeck", () => ({
  UserDeck: {
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

// Jest-compat aliases per task spec (rebound to vitest's vi.fn under the hood).
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedUser = User as unknown as {
  findOneAndUpdate: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
};
const mockedUserDeck = UserDeck as unknown as {
  create: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
};

const VALID_BODY = {
  name: "Test Deck",
  cards: [{ cardId: "A1_001", quantity: 1 }],
  source: "builder",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/user-decks", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/user-decks atomic deck limit (C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue({
      user: { email: "user@test.com" },
      expires: "2099-01-01",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("uses findOneAndUpdate with $lt condition to atomically check & increment deckCount", async () => {
    mockedUser.findOneAndUpdate.mockResolvedValue({
      _id: "userId123",
      deckCount: 5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedUserDeck.create.mockResolvedValue({ _id: "deck1" } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest(VALID_BODY) as any);
    expect(res.status).toBe(201);

    // Must call findOneAndUpdate with a conditional update that increments atomically
    expect(mockedUser.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const args = mockedUser.findOneAndUpdate.mock.calls[0];
    // Filter: { email, deckCount: { $lt: 30 } }
    expect(args[0]).toMatchObject({
      email: "user@test.com",
      deckCount: { $lt: 30 },
    });
    // Update: { $inc: { deckCount: 1 } }
    expect(args[1]).toEqual({ $inc: { deckCount: 1 } });
  });

  it("returns 400 when atomic increment fails (user at limit)", async () => {
    // findOneAndUpdate returns null when the filter does not match
    mockedUser.findOneAndUpdate.mockResolvedValue(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest(VALID_BODY) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Maximum deck limit/);
    // Must NOT have created a deck
    expect(mockedUserDeck.create).not.toHaveBeenCalled();
  });

  it("decrements deckCount if deck create fails (compensating rollback)", async () => {
    mockedUser.findOneAndUpdate.mockResolvedValue({
      _id: "userId123",
      deckCount: 5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockedUserDeck.create.mockRejectedValue(new Error("DB error"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest(VALID_BODY) as any);
    expect(res.status).toBe(500);

    // The compensating decrement must have been called
    expect(mockedUser.findOneAndUpdate).toHaveBeenCalledTimes(2);
    const rollbackArgs = mockedUser.findOneAndUpdate.mock.calls[1];
    expect(rollbackArgs[0]).toMatchObject({ _id: "userId123" });
    expect(rollbackArgs[1]).toEqual({ $inc: { deckCount: -1 } });
  });

  it("logs rollback failure and still returns 500 when create + rollback both fail", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedUser.findOneAndUpdate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ _id: "userId123", deckCount: 5 } as any) // first call: increment
      .mockRejectedValueOnce(new Error("rollback connection lost"));    // second call: rollback fails
    mockedUserDeck.create.mockRejectedValue(new Error("DB error"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest(VALID_BODY) as any);
    expect(res.status).toBe(500);

    // The outer catch should have logged the rollback failure
    const rollbackLog = consoleErrorSpy.mock.calls.find((call) =>
      String(call[0] ?? "").includes("rollback failed"),
    );
    expect(rollbackLog).toBeDefined();
    consoleErrorSpy.mockRestore();
  });
});

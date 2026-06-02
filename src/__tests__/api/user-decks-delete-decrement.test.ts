import { describe, it, expect, beforeEach, vi } from "vitest";
import { DELETE } from "@/app/api/user-decks/[id]/route";
import { auth } from "@/auth";
import { User } from "@/models/User";
import { UserDeck } from "@/models/UserDeck";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ default: vi.fn() }));
vi.mock("@/models/User", () => ({
  User: { findOne: vi.fn(), updateOne: vi.fn() },
}));
vi.mock("@/models/UserDeck", () => ({
  UserDeck: { deleteOne: vi.fn() },
}));

const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockedUser = User as unknown as {
  findOne: ReturnType<typeof vi.fn>;
  updateOne: ReturnType<typeof vi.fn>;
};
const mockedUserDeck = UserDeck as unknown as {
  deleteOne: ReturnType<typeof vi.fn>;
};

function makeRequest(): Request {
  return new Request("http://localhost/api/user-decks/deck1", {
    method: "DELETE",
  });
}

const params = Promise.resolve({ id: "deck1" });

describe("DELETE /api/user-decks/[id] keeps deckCount in sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue({
      user: { email: "user@test.com" },
      expires: "2099-01-01",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // findOne(...).lean() chain
    mockedUser.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "userId123" }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("decrements deckCount after a successful delete", async () => {
    mockedUserDeck.deleteOne.mockResolvedValue({ deletedCount: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE(makeRequest() as any, { params });
    expect(res.status).toBe(200);

    expect(mockedUser.updateOne).toHaveBeenCalledTimes(1);
    const args = mockedUser.updateOne.mock.calls[0];
    // Guard against negative counts: only decrement when > 0
    expect(args[0]).toMatchObject({ _id: "userId123", deckCount: { $gt: 0 } });
    expect(args[1]).toEqual({ $inc: { deckCount: -1 } });
  });

  it("does NOT decrement when the deck was not found", async () => {
    mockedUserDeck.deleteOne.mockResolvedValue({ deletedCount: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE(makeRequest() as any, { params });
    expect(res.status).toBe(404);
    expect(mockedUser.updateOne).not.toHaveBeenCalled();
  });
});

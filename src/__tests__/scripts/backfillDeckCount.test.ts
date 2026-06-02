import { describe, it, expect } from "vitest";
import { buildDeckCountUpdates } from "../../../scripts/backfillDeckCount";

describe("buildDeckCountUpdates", () => {
  it("maps each user to their actual deck count", () => {
    const userIds = ["u1", "u2", "u3"];
    const deckCounts = [
      { _id: "u1", count: 5 },
      { _id: "u2", count: 12 },
    ];
    expect(buildDeckCountUpdates(userIds, deckCounts)).toEqual([
      { userId: "u1", deckCount: 5 },
      { userId: "u2", deckCount: 12 },
      { userId: "u3", deckCount: 0 },
    ]);
  });

  it("defaults users with no decks to 0", () => {
    expect(buildDeckCountUpdates(["only"], [])).toEqual([
      { userId: "only", deckCount: 0 },
    ]);
  });

  it("returns an empty list when there are no users", () => {
    expect(buildDeckCountUpdates([], [{ _id: "ghost", count: 3 }])).toEqual([]);
  });
});

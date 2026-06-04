import { describe, it, expect } from "vitest";
import { buildBulkOperations } from "../../../scripts/deckCrawler";

const deck = {
  package: "A1_Genetic-Apex",
  deckName: "Pikachu ex",
  count: 42,
  highlight: [{ cardName: "Pikachu ex", cardCount: 2, boosterPack: "A1" }],
  cardList: {
    Ash: [{ cardName: "Pikachu ex", cardCount: 2, boosterPack: "A1" }],
  },
  deckListHash: "hash-abc",
};

describe("buildBulkOperations", () => {
  it("filters on deckListHash alone so a duplicate updates instead of insert-failing", () => {
    const [op] = buildBulkOperations([deck]);
    expect(op.updateOne.filter).toEqual({ deckListHash: "hash-abc" });
  });

  it("moves package and deckName into $set so upserted docs satisfy required fields", () => {
    const [op] = buildBulkOperations([deck]);
    expect(op.updateOne.update.$set).toMatchObject({
      package: "A1_Genetic-Apex",
      deckName: "Pikachu ex",
      count: 42,
      highlight: deck.highlight,
      cardList: deck.cardList,
    });
    expect(op.updateOne.upsert).toBe(true);
  });

  it("produces one operation per deck", () => {
    const ops = buildBulkOperations([
      deck,
      { ...deck, deckListHash: "hash-def" },
    ]);
    expect(ops).toHaveLength(2);
  });
});

import {
  validateDeck,
  DECK_MAX_CARDS,
  MAX_COPIES_PER_CARD,
} from "@/lib/deckValidation";

describe("user-decks server-side validation (C3)", () => {
  it("blocks a 25-card deck payload", () => {
    const cards = Array.from({ length: 25 }, (_, i) => ({
      cardId: `A1_${String(i).padStart(3, "0")}`,
      quantity: 1,
    }));
    const result = validateDeck(cards, "Big Deck");
    expect(result.canSave).toBe(false);
    expect(result.totalCards).toBeGreaterThan(DECK_MAX_CARDS);
    expect(result.saveErrors.some((e) => e.includes("20 cards"))).toBe(true);
  });

  it("blocks a single card with quantity 5", () => {
    const result = validateDeck([{ cardId: "A1_001", quantity: 5 }], "Bad");
    expect(result.canSave).toBe(false);
    expect(
      result.saveErrors.some((e) => e.includes(String(MAX_COPIES_PER_CARD))),
    ).toBe(true);
  });

  it("accepts a valid 20-card deck with 2 copies each", () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      cardId: `A1_${String(i).padStart(3, "0")}`,
      quantity: 2,
    }));
    const result = validateDeck(cards, "Valid");
    expect(result.canSave).toBe(true);
    expect(result.totalCards).toBe(20);
  });
});

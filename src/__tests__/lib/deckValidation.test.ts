import { validateDeck } from "@/lib/deckValidation";

describe("deckValidation", () => {
  describe("validateDeck", () => {
    it("returns canSave=false when deck is empty", () => {
      const result = validateDeck([], "My Deck");
      expect(result.canSave).toBe(false);
      expect(result.saveErrors).toContain("Add at least one card");
    });

    it("returns canSave=false when name is empty", () => {
      const result = validateDeck([{ cardId: "A1_001", quantity: 1 }], "");
      expect(result.canSave).toBe(false);
      expect(result.saveErrors).toContain("Enter a deck name");
    });

    it("returns canSave=false when over 20 cards", () => {
      const cards = Array(21).fill({ cardId: "A1_001", quantity: 1 });
      const result = validateDeck(cards, "My Deck");
      expect(result.canSave).toBe(false);
      expect(result.saveErrors.some((e) => e.includes("20 cards"))).toBe(true);
    });

    it("returns canSave=false when card has 3 copies", () => {
      const cards = [{ cardId: "A1_001", quantity: 3 }];
      const result = validateDeck(cards, "My Deck");
      expect(result.canSave).toBe(false);
      expect(result.saveErrors.some((e) => e.includes("2 copies"))).toBe(true);
    });

    it("returns canSave=true when valid", () => {
      const cards = [
        { cardId: "A1_001", quantity: 1 },
        { cardId: "A1_002", quantity: 2 },
      ];
      const result = validateDeck(cards, "My Deck");
      expect(result.canSave).toBe(true);
      expect(result.totalCards).toBe(3);
    });

    it("calculates totalCards correctly", () => {
      const cards = [
        { cardId: "A1_001", quantity: 2 },
        { cardId: "A1_002", quantity: 1 },
      ];
      const result = validateDeck(cards, "My Deck");
      expect(result.totalCards).toBe(3);
    });
  });
});

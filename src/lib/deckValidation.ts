export const DECK_MAX_CARDS = 20;
export const MAX_COPIES_PER_CARD = 2;
export const MIN_CARDS_TO_SAVE = 1;

export interface DeckCard {
  cardId: string;
  quantity: number;
}

export interface ValidationResult {
  totalCards: number;
  warnings: string[]; // Soft warnings (non-blocking)
  canSave: boolean; // True if deck can be saved
  saveErrors: string[]; // Errors that block saving
}

export function validateDeck(
  cards: DeckCard[],
  name: string,
): ValidationResult {
  const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);
  const warnings: string[] = [];
  const saveErrors: string[] = [];

  // Hard validation: block saving when over limits
  if (totalCards > DECK_MAX_CARDS) {
    saveErrors.push(`Deck exceeds ${DECK_MAX_CARDS} cards`);
  }

  cards.forEach((card) => {
    if (card.quantity > MAX_COPIES_PER_CARD) {
      saveErrors.push(`"${card.cardId}" exceeds ${MAX_COPIES_PER_CARD} copies`);
    }
  });

  // Hard validation: block saving on missing data
  if (cards.length === 0) {
    saveErrors.push("Add at least one card");
  }
  if (!name?.trim()) {
    saveErrors.push("Enter a deck name");
  }

  return {
    totalCards,
    warnings,
    canSave: saveErrors.length === 0,
    saveErrors,
  };
}

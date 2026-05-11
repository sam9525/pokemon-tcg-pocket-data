"use client";

import { useState, useCallback } from "react";
import {
  DeckCard,
  validateDeck,
  ValidationResult,
  MAX_COPIES_PER_CARD,
  DECK_MAX_CARDS,
} from "@/lib/deckValidation";

export interface DeckState {
  name: string;
  cards: DeckCard[];
  id?: string; // Set when editing an existing deck
}

interface UseDeckBuilderReturn {
  deck: DeckState;
  validation: ValidationResult;
  setDeckName: (name: string) => void;
  addCard: (cardId: string) => { success: boolean; reason?: string };
  removeCard: (cardId: string) => void;
  removeAllCopies: (cardId: string) => void;
  clearDeck: () => void;
  loadDeck: (savedDeck: DeckState) => void;
}

const initialValidation: ValidationResult = {
  totalCards: 0,
  warnings: [],
  canSave: false,
  saveErrors: ["Add cards to your deck"],
};

export function useDeckBuilder(): UseDeckBuilderReturn {
  const [deck, setDeck] = useState<DeckState>({ name: "", cards: [] });
  const [validation, setValidation] = useState<ValidationResult>(initialValidation);

  const updateValidation = useCallback((cards: DeckCard[], name: string) => {
    setValidation(validateDeck(cards, name));
  }, []);

  const setDeckName = useCallback((name: string) => {
    setDeck(prev => {
      const newDeck = { ...prev, name };
      updateValidation(newDeck.cards, name);
      return newDeck;
    });
  }, [updateValidation]);

  const addCard = useCallback((cardId: string): { success: boolean; reason?: string } => {
    const result = { success: false, reason: "" as string };

    setDeck(prev => {
      const existingIndex = prev.cards.findIndex(c => c.cardId === cardId);
      const existingCard = existingIndex >= 0 ? prev.cards[existingIndex] : null;
      const currentTotal = prev.cards.reduce((sum, c) => sum + c.quantity, 0);

      // Check hard limits — block add
      if (existingCard && existingCard.quantity >= MAX_COPIES_PER_CARD) {
        result.reason = "Maximum 2 copies allowed";
        return prev;
      }
      if (currentTotal >= DECK_MAX_CARDS && !existingCard) {
        result.reason = "Deck exceeds 20 cards";
        return prev;
      }

      // Allow adding (even if at soft limit — validation handles save blocking)
      let newCards: DeckCard[];
      if (existingIndex >= 0) {
        newCards = prev.cards.map((c, i) =>
          i === existingIndex ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        newCards = [...prev.cards, { cardId, quantity: 1 }];
      }

      result.success = true;
      const newDeck = { ...prev, cards: newCards };
      updateValidation(newDeck.cards, newDeck.name);
      return newDeck;
    });

    return result;
  }, [updateValidation]);

  const removeCard = useCallback((cardId: string) => {
    setDeck(prev => {
      const newCards = prev.cards
        .map(c => c.cardId === cardId ? { ...c, quantity: c.quantity - 1 } : c)
        .filter(c => c.quantity > 0);

      const newDeck = { ...prev, cards: newCards };
      updateValidation(newDeck.cards, newDeck.name);
      return newDeck;
    });
  }, [updateValidation]);

  const removeAllCopies = useCallback((cardId: string) => {
    setDeck(prev => {
      const newCards = prev.cards.filter(c => c.cardId !== cardId);
      const newDeck = { ...prev, cards: newCards };
      updateValidation(newDeck.cards, newDeck.name);
      return newDeck;
    });
  }, [updateValidation]);

  const clearDeck = useCallback(() => {
    setDeck({ name: "", cards: [] });
    setValidation(initialValidation);
  }, []);

  const loadDeck = useCallback((savedDeck: DeckState) => {
    setDeck(savedDeck);
    updateValidation(savedDeck.cards, savedDeck.name);
  }, [updateValidation]);

  return {
    deck,
    validation,
    setDeckName,
    addCard,
    removeCard,
    removeAllCopies,
    clearDeck,
    loadDeck,
  };
}
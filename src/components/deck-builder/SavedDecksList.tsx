"use client";

import { useLanguage } from "@/components/provider/LanguageProvider";

interface SavedDeck {
  _id: string;
  name: string;
  cards: { cardId: string; quantity: number }[];
}

interface SavedDecksListProps {
  decks: SavedDeck[];
  currentDeckId?: string;
  onLoad: (deck: SavedDeck) => void;
  onDelete: (deckId: string) => void;
}

export default function SavedDecksList({
  decks,
  currentDeckId,
  onLoad,
  onDelete,
}: SavedDecksListProps) {
  const { currentLanguageLookup } = useLanguage();

  if (decks.length === 0) {
    return (
      <div className="w-full mb-4 text-center text-gray-500 text-sm py-2">
        {currentLanguageLookup?.DECK_BUILDER?.noSavedDecks as string || "No saved decks yet"}
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-3 overflow-x-auto pb-2 mb-4">
      {decks.map((deck) => (
        <div
          key={deck._id}
          className={`relative group flex-shrink-0 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
            currentDeckId === deck._id
              ? "border-primary bg-primary/10"
              : "border-gray-300 hover:border-primary"
          }`}
          onClick={() => onLoad(deck)}
        >
          <div className="text-sm font-bold truncate max-w-24">
            {deck.name}
          </div>
          <div className="text-xs text-gray-500">
            {deck.cards.reduce((sum, c) => sum + c.quantity, 0)} cards
          </div>
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(deck._id);
            }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            title="Delete deck"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
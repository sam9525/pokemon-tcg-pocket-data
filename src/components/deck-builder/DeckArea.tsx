"use client";

import { useLanguage } from "@/components/provider/LanguageProvider";
import DeckCard from "./DeckCard";
import { DeckCard as DeckCardType, ValidationResult, DECK_MAX_CARDS } from "@/lib/deckValidation";

interface DeckAreaProps {
  name: string;
  cards: DeckCardType[];
  validation: ValidationResult;
  cardImages: Record<string, string>; // cardId → imageUrl
  onNameChange: (name: string) => void;
  onRemoveOne: (cardId: string) => void;
  onRemoveAll: (cardId: string) => void;
  onClear: () => void;
  onSave: () => void;
  isSaving?: boolean;
  currentDeckId?: string;
}

export default function DeckArea({
  name,
  cards,
  validation,
  cardImages,
  onNameChange,
  onRemoveOne,
  onRemoveAll,
  onClear,
  onSave,
  isSaving = false,
  currentDeckId,
}: DeckAreaProps) {
  const { currentLanguageLookup } = useLanguage();

  const totalCards = validation.totalCards;
  const progressPercent = Math.min((totalCards / DECK_MAX_CARDS) * 100, 100);
  const isOverLimit = !validation.canSave && validation.saveErrors.length > 0;

  const t = currentLanguageLookup?.DECK_BUILDER || {};

  return (
    <div className={`w-full bg-search-background border-2 rounded-xl p-4 mb-4 ${
      isOverLimit ? "border-red-500" : "border-primary"
    }`}>
      {/* Header: Name input and buttons */}
      <div className="flex flex-row flex-wrap justify-between items-center gap-2 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t.deckName as string || "Deck Name"}
          className="flex-1 min-w-32 max-w-48 px-3 py-2 bg-foreground rounded-lg border border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={!validation.canSave || isSaving}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              validation.canSave && !isSaving
                ? "bg-primary text-foreground hover:bg-primary/80"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? "..." : (currentDeckId ? (t.update as string || "Update") : (t.save as string || "Save"))}
          </button>
          <button
            onClick={onClear}
            disabled={cards.length === 0}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              cards.length > 0
                ? "bg-foreground text-primary border-2 border-primary hover:bg-primary hover:text-foreground"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {t.clear as string || "Clear"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${isOverLimit ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className={`text-sm font-bold whitespace-nowrap ${isOverLimit ? "text-red-500" : "text-primary"}`}>
          {totalCards}/{DECK_MAX_CARDS}
        </span>
      </div>

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          {t.noCards as string || "Add cards to your deck"}
        </div>
      ) : (
        <div className="flex flex-row gap-3 overflow-x-auto pb-2">
          {cards.map((card) => (
            <DeckCard
              key={card.cardId}
              cardId={card.cardId}
              imageUrl={cardImages[card.cardId] || ""}
              quantity={card.quantity}
              onRemoveOne={onRemoveOne}
              onRemoveAll={onRemoveAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
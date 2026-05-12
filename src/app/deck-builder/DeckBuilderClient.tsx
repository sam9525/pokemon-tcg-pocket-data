"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";
import { useDeckBuilder } from "@/hooks/useDeckBuilder";
import DeckArea from "@/components/deck-builder/DeckArea";
import CardGrid from "@/components/deck-builder/CardGrid";

export default function DeckBuilderClient() {
  const { currentLanguageLookup } = useLanguage();
  const {
    deck,
    validation,
    setDeckName,
    addCard,
    removeCard,
    removeAllCopies,
    clearDeck,
  } = useDeckBuilder();

  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleCardsLoaded = (cards: { cardId: string; imageUrl: string }[]) => {
    const images: Record<string, string> = {};
    cards.forEach((c) => {
      images[c.cardId] = c.imageUrl;
    });
    setCardImages((prev) => ({ ...prev, ...images }));
  };

  const handleClear = () => {
    if (deck.cards.length === 0) return;
    const t =
      (currentLanguageLookup?.DECK_BUILDER as Record<string, string>) || {};
    const confirmed = window.confirm(
      t.clearConfirm || "Clear all cards from deck?",
    );
    if (confirmed) {
      clearDeck();
    }
  };

  const handleSave = async () => {
    if (!validation.canSave) return;

    setIsSaving(true);
    const t =
      (currentLanguageLookup?.DECK_BUILDER as Record<string, string>) || {};

    try {
      const toastId = toast.loading((t.saving as string) || "Saving...");

      const isUpdate = !!deck.id;
      const url = isUpdate ? `/api/user-decks/${deck.id}` : "/api/user-decks";
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deck.name,
          cards: deck.cards,
        }),
      });

      if (res.status === 401) {
        toast.error("Session expired, please login again", { id: toastId });
        window.location.href = "/login?callbackUrl=/deck-builder";
        return;
      }

      const data = await res.json();

      if (res.ok) {
        toast.success(t.savedSuccess || "Deck saved successfully", {
          id: toastId,
        });
        clearDeck();
      } else {
        toast.error(data.error || t.saveFailed || "Failed to save deck", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("[DeckBuilder] Save failed:", error);
      toast.error("Failed to save deck");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 max-w-6xl mx-auto">
      {/* Deck Area */}
      <DeckArea
        name={deck.name}
        cards={deck.cards}
        validation={validation}
        cardImages={cardImages}
        onNameChange={setDeckName}
        onRemoveOne={removeCard}
        onRemoveAll={removeAllCopies}
        onClear={handleClear}
        onSave={handleSave}
        isSaving={isSaving}
        currentDeckId={deck.id}
      />

      {/* Card Grid */}
      <CardGrid
        onAddCard={addCard}
        onRemoveOne={removeCard}
        onRemoveAll={removeAllCopies}
        currentDeckCards={deck.cards}
        onCardsLoaded={handleCardsLoaded}
      />
    </div>
  );
}

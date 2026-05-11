"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";
import { useDeckBuilder } from "@/hooks/useDeckBuilder";
import DeckArea from "@/components/deck-builder/DeckArea";
import CardGrid from "@/components/deck-builder/CardGrid";
import SavedDecksList from "@/components/deck-builder/SavedDecksList";

interface SavedDeck {
  _id: string;
  name: string;
  cards: { cardId: string; quantity: number }[];
}

export default function DeckBuilderClient() {
  const { language, currentLanguageLookup } = useLanguage();
  const {
    deck,
    validation,
    setDeckName,
    addCard,
    removeCard,
    removeAllCopies,
    clearDeck,
    loadDeck,
  } = useDeckBuilder();

  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Build cardId → imageUrl map from all saved decks' cards (for DeckArea display)
  useEffect(() => {
    const images: Record<string, string> = {};
    savedDecks.forEach(d => {
      d.cards.forEach(c => {
        if (!images[c.cardId]) {
          // Placeholder — actual URL will be set when cards are fetched in CardGrid
          images[c.cardId] = "";
        }
      });
    });
    setCardImages(images);
  }, [savedDecks]);

  // Fetch saved decks on mount
  useEffect(() => {
    if (!language) return;

    fetch("/api/user-decks")
      .then(res => {
        if (res.status === 401) {
          toast.error("Session expired, please login again");
          window.location.href = "/login?callbackUrl=/deck-builder";
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.decks) setSavedDecks(data.decks);
      })
      .catch(err => console.error("[DeckBuilder] Failed to load decks:", err));
  }, [language]);

  const handleClear = () => {
    if (deck.cards.length === 0) return;
    const t = currentLanguageLookup?.DECK_BUILDER as Record<string, string> || {};
    const confirmed = window.confirm(t.clearConfirm || "Clear all cards from deck?");
    if (confirmed) {
      clearDeck();
    }
  };

  const handleSave = async () => {
    if (!validation.canSave) return;

    setIsSaving(true);
    const t = currentLanguageLookup?.DECK_BUILDER as Record<string, string> || {};

    try {
      const toastId = toast.loading(t.saving as string || "Saving...");

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
        toast.success(t.savedSuccess || "Deck saved successfully", { id: toastId });
        clearDeck();
        // Refresh saved decks list
        const decksRes = await fetch("/api/user-decks");
        const decksData = await decksRes.json();
        if (decksData?.decks) setSavedDecks(decksData.decks);
      } else {
        toast.error(data.error || t.saveFailed || "Failed to save deck", { id: toastId });
      }
    } catch (error) {
      console.error("[DeckBuilder] Save failed:", error);
      toast.error("Failed to save deck");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (savedDeck: SavedDeck) => {
    if (deck.cards.length > 0) {
      const t = currentLanguageLookup?.DECK_BUILDER as Record<string, string> || {};
      const confirmed = window.confirm(t.loadConfirm || "Load deck? Current unsaved changes will be lost.");
      if (!confirmed) return;
    }
    loadDeck({
      id: savedDeck._id,
      name: savedDeck.name,
      cards: savedDeck.cards,
    });
  };

  const handleDelete = (deckId: string) => {
    const t = currentLanguageLookup?.DECK_BUILDER as Record<string, string> || {};
    const confirmed = window.confirm(t.deleteConfirm || "Delete this deck? This cannot be undone.");
    if (!confirmed) return;

    fetch(`/api/user-decks/${deckId}`, { method: "DELETE" })
      .then(res => {
        if (res.status === 401) {
          toast.error("Session expired, please login again");
          window.location.href = "/login?callbackUrl=/deck-builder";
          return;
        }
        if (res.ok) {
          setSavedDecks(prev => prev.filter(d => d._id !== deckId));
          toast.success(t.deletedSuccess || "Deck deleted");
        } else {
          toast.error("Failed to delete deck");
        }
      })
      .catch(() => toast.error("Failed to delete deck"));
  };

  return (
    <div className="flex flex-col items-center p-4 max-w-6xl mx-auto">
      {/* Saved decks list */}
      <SavedDecksList
        decks={savedDecks}
        currentDeckId={deck.id}
        onLoad={handleLoad}
        onDelete={handleDelete}
      />

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
        currentDeckCards={deck.cards}
      />
    </div>
  );
}
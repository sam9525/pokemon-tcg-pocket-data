"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";
import { useDeckBuilder } from "@/hooks/useDeckBuilder";
import { useAnimation } from "@/hooks/useAnimation";
import DeckArea from "@/components/deck-builder/DeckArea";
import CardGrid from "@/components/deck-builder/CardGrid";
import CardImage from "@/components/CardImage";

export default function DeckBuilderClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentLanguageLookup } = useLanguage();
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

  const { animatingCards, triggerCardAnimation } = useAnimation();

  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  const [cardData, setCardData] = useState<
    Record<string, { boosterPack?: string; rarity?: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Track dynamic deck area position for card animation destination
  const [deckAreaPosition, setDeckAreaPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 300,
    y: 200,
  });

  useEffect(() => {
    const updatePosition = () => {
      // Get the deck area element (first .flex-col container with bg-search-background)
      const deckArea = document.querySelector(".bg-search-background");
      if (deckArea) {
        const rect = deckArea.getBoundingClientRect();
        setDeckAreaPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    // Also update on scroll since deck area position may change
    window.addEventListener("scroll", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, []);

  // Load deck from URL param on mount
  useEffect(() => {
    const deckId = searchParams.get("deckId");
    if (!deckId) return;

    const fetchAndLoadDeck = async () => {
      try {
        const toastId = toast.loading("Loading deck...");

        const res = await fetch(`/api/user-decks/${deckId}`);
        const data = await res.json();

        if (res.status === 401) {
          toast.error("Session expired", { id: toastId });
          router.push("/login?callbackUrl=/deck-builder");
          return;
        }

        if (!res.ok || !data.deck) {
          toast.error(data.error || "Deck not found", { id: toastId });
          router.push("/my-decks");
          return;
        }

        loadDeck({
          id: data.deck._id,
          name: data.deck.name,
          cards: data.deck.cards,
        });
        toast.success("Deck loaded", { id: toastId });
      } catch (error) {
        console.error("[DeckBuilder] Failed to load deck:", error);
        toast.error("Failed to load deck");
        router.push("/my-decks");
      }
    };

    fetchAndLoadDeck();
  }, [searchParams, loadDeck, router]);

  const handleCardsLoaded = (cards: { cardId: string; imageUrl: string }[]) => {
    const images: Record<string, string> = {};
    cards.forEach((c) => {
      images[c.cardId] = c.imageUrl;
    });
    setCardImages((prev) => ({ ...prev, ...images }));

    // Fetch card metadata (boosterPack, rarity) for these cards
    if (cards.length > 0) {
      const cardIds = cards.map((c) => c.cardId);
      const lang = currentLanguageLookup?.LANGUAGE || "en_US";
      fetch(`/api/cards/images?cardIds=${cardIds.join(",")}&language=${lang}`)
        .then((res) => res.json())
        .then((data) => {
          setCardData((prev) => ({ ...prev, ...(data.cardData || {}) }));
        })
        .catch((err) => {
          console.error("[DeckBuilder] Failed to load card metadata:", err);
        });
    }
  };

  const handleCardClickWithPosition = (
    card: { cardId: string; imageUrl: string },
    startX: number,
    startY: number,
  ) => {
    triggerCardAnimation(
      card.cardId,
      card.imageUrl,
      startX,
      startY,
      deckAreaPosition.x,
      deckAreaPosition.y,
    );
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
        cardData={cardData}
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
        onCardClickWithPosition={handleCardClickWithPosition}
      />

      {/* Flying card clones */}
      {animatingCards.map((card) => (
        <div
          key={card.id}
          className="card-fly-animation"
          style={
            {
              left: card.startX,
              top: card.startY,
              "--fly-x": `${card.endX - card.startX}px`,
              "--fly-y": `${card.endY - card.startY}px`,
            } as React.CSSProperties
          }
        >
          <CardImage
            src={card.imageUrl}
            variant="card"
            alt=""
            width={80}
            height={112}
            style={{
              borderRadius: 8,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

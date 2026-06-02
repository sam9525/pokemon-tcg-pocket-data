"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  const { animatingCards, triggerCardAnimation } = useAnimation();

  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  const [cardData, setCardData] = useState<
    Record<string, { boosterPack?: string; rarity?: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Abort controller for in-flight /api/cards/images requests, plus a
  // monotonically increasing requestId used to discard stale responses
  // (Confirmed F: race condition clobbering state on rapid deck/language
  // switches).
  const abortControllerRef = useRef<AbortController | null>(null);
  const imageRequestIdRef = useRef(0);

  // Track dynamic deck area position for card animation destination
  const [deckAreaPosition, setDeckAreaPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 300,
    y: 200,
  });

  // Reset card images/data maps. Used at deck transition points (clear, load,
  // language change) to prevent stale entries from prior decks leaking into
  // the current deck's image and metadata caches.
  const resetCardMaps = useCallback(() => {
    setCardImages({});
    setCardData({});
  }, []);

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

  // Pre-fetch images for card IDs
  const fetchImagesForCardIds = useCallback(
    async (cardIds: string[]) => {
      if (cardIds.length === 0) return;
      const lang = language || "en_US";

      // Abort any in-flight request and bump the request id so any
      // older pending response is ignored.
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const myRequestId = ++imageRequestIdRef.current;

      try {
        const res = await fetch(
          `/api/cards/images?cardIds=${encodeURIComponent(
            cardIds.join(","),
          )}&language=${encodeURIComponent(lang)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        // Guard: only apply state if this is still the most recent request.
        if (myRequestId !== imageRequestIdRef.current) return;
        if (data.images) {
          setCardImages((prev) => ({ ...prev, ...data.images }));
        }
        if (data.cardData) {
          setCardData((prev) => ({ ...prev, ...data.cardData }));
        }
      } catch (err) {
        // Aborted requests are expected on rapid navigation/language switches.
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[DeckBuilder] Failed to fetch deck card images:", err);
      }
    },
    [language],
  );

  // Load deck from URL param on mount
  useEffect(() => {
    const deckId = searchParams.get("deckId");
    if (!deckId) return;

    // Abort any in-flight image fetch and bump the request id, then
    // clear state before loading a new deck.
    abortControllerRef.current?.abort();
    imageRequestIdRef.current++;
    resetCardMaps();

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
          version: data.deck.version,
        });
        // Pre-fetch images for all deck cards so they render immediately
        const deckCardIds = data.deck.cards.map(
          (c: { cardId: string }) => c.cardId,
        );
        await fetchImagesForCardIds(deckCardIds);
        toast.success("Deck loaded", { id: toastId });
      } catch (error) {
        console.error("[DeckBuilder] Failed to load deck:", error);
        toast.error("Failed to load deck");
        router.push("/my-decks");
      }
    };

    fetchAndLoadDeck();
  }, [searchParams, loadDeck, router, fetchImagesForCardIds, resetCardMaps]);

  // Refetch card images/metadata when the user switches language so any
  // cached entries from the prior language are replaced.
  useEffect(() => {
    if (deck.cards.length === 0) return;
    abortControllerRef.current?.abort();
    imageRequestIdRef.current++;
    resetCardMaps();
    const deckCardIds = deck.cards.map((c) => c.cardId);
    fetchImagesForCardIds(deckCardIds);
    // Intentionally only run on language change. deck.cards is read from the
    // current closure to avoid re-running the effect on every deck edit;
    // fetchImagesForCardIds and resetCardMaps are stable references from useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handleCardsLoaded = (cards: { cardId: string; imageUrl: string }[]) => {
    const images: Record<string, string> = {};
    cards.forEach((c) => {
      images[c.cardId] = c.imageUrl;
    });
    setCardImages((prev) => ({ ...prev, ...images }));

    if (cards.length > 0) {
      const cardIds = cards.map((c) => c.cardId);
      const lang = language || "en_US";
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const myRequestId = ++imageRequestIdRef.current;
      fetch(
        `/api/cards/images?cardIds=${encodeURIComponent(
          cardIds.join(","),
        )}&language=${encodeURIComponent(lang)}`,
        { signal: controller.signal },
      )
        .then((res) => res.json())
        .then((data) => {
          if (myRequestId !== imageRequestIdRef.current) return;
          setCardData((prev) => ({ ...prev, ...(data.cardData || {}) }));
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
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
    abortControllerRef.current?.abort();
    imageRequestIdRef.current++;
    if (deck.cards.length === 0) return;
    const t =
      (currentLanguageLookup?.DECK_BUILDER as Record<string, string>) || {};
    const confirmed = window.confirm(
      t.clearConfirm || "Clear all cards from deck?",
    );
    if (confirmed) {
      resetCardMaps();
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
          source: "builder",
          ...(isUpdate && { version: deck.version }),
        }),
      });

      if (res.status === 401) {
        toast.error("Session expired, please login again", { id: toastId });
        window.location.href = "/login?callbackUrl=/deck-builder";
        return;
      }

      const data = await res.json();

      if (res.status === 409) {
        toast.error(
          data.error ||
            "Deck was modified by another user. Please reload and try again.",
          { id: toastId },
        );
        return;
      }

      if (res.ok) {
        toast.success(t.savedSuccess || "Deck saved successfully", {
          id: toastId,
        });
        resetCardMaps();
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

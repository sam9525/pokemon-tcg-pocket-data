"use client";

import { useEffect, useState, useRef } from "react";
import CardImage from "@/components/CardImage";
import FilteringTabs from "@/components/layouts/FilteringTabs";
import toast from "react-hot-toast";
import { DeckCard } from "@/lib/deckValidation";
import { useLanguage } from "@/components/provider/LanguageProvider";

interface CardGridProps {
  onAddCard: (cardId: string) => { success: boolean; reason?: string };
  currentDeckCards: DeckCard[];
  onCardsLoaded?: (cards: CardItem[]) => void;
  onRemoveOne: (cardId: string) => void;
  onRemoveAll: (cardId: string) => void;
  onCardClickWithPosition?: (
    card: CardItem,
    startX: number,
    startY: number,
  ) => void;
}

interface CardApiResponse {
  id: string;
  url: string;
}

interface CardItem {
  cardId: string;
  imageUrl: string;
}

export default function CardGrid({
  onAddCard,
  currentDeckCards,
  onCardsLoaded,
  onRemoveOne,
  onRemoveAll,
  onCardClickWithPosition,
}: CardGridProps) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string[]>([]);
  const [packageId, setPackageId] = useState<string>("");
  const [packagesList, setPackagesList] = useState<
    { id: string; name: string }[]
  >([]);
  const onCardsLoadedRef = useRef(onCardsLoaded);
  const { language, currentLanguageLookup } = useLanguage();

  // Keep ref updated
  useEffect(() => {
    onCardsLoadedRef.current = onCardsLoaded;
  }, [onCardsLoaded]);

  // Fetch packages for dropdown
  useEffect(() => {
    if (!language) return;

    fetch(`/api/packages-metadata?language=${language}`)
      .then((res) => res.json())
      .then((data) => {
        setPackagesList(data.packages || []);
        if (data.packages?.length > 0) {
          setPackageId(data.packages[0].id);
        }
      })
      .catch((err) =>
        console.error("[CardGrid] Failed to load packages:", err),
      );
  }, [language]);

  // Get current quantity for a card in deck
  const getCardQuantity = (cardId: string): number => {
    const deckCard = currentDeckCards.find((c) => c.cardId === cardId);
    return deckCard?.quantity || 0;
  };

  // Fetch cards when package or filter changes
  useEffect(() => {
    if (!packageId) return;

    const fetchCards = async () => {
      setIsLoading(true);
      try {
        const url = `/api/cards/${packageId}?language=${language}${filter.length > 0 ? `&filter=${filter.join(",")}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        // Transform API response to internal names (reversed)
        const mappedCards = (data.cards || [])
          .map((card: CardApiResponse) => ({
            cardId: card.id,
            imageUrl: card.url,
          }))
          .reverse();
        setCards(mappedCards);
        if (onCardsLoadedRef.current) {
          onCardsLoadedRef.current(mappedCards);
        }
      } catch (error) {
        console.error("[CardGrid] Failed to load cards:", error);
        toast.error("Failed to load cards");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCards();
  }, [packageId, language, filter]);

  const handleCardClick = (card: CardItem, event: React.MouseEvent) => {
    // Capture position before any state changes
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    // Trigger animation if callback provided
    if (onCardClickWithPosition) {
      onCardClickWithPosition(card, startX, startY);
    }

    const result = onAddCard(card.cardId);
    if (!result.success && result.reason) {
      toast.error(result.reason);
    }
  };

  if (!packageId) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Package selector */}
      <select
        className="dropdown mb-4 w-full max-w-xs"
        value={packageId}
        onChange={(e) => setPackageId(e.target.value)}
      >
        {packagesList.map((pkg) => (
          <option key={pkg.id} value={pkg.id}>
            {pkg.name}
          </option>
        ))}
      </select>

      {/* Filter buttons — reuses existing FilteringTabs */}
      <FilteringTabs
        filter={filter}
        setFilter={setFilter}
        currentLanguageLookup={currentLanguageLookup}
      />

      {/* Card grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4">
          {cards.map((card) => {
            const qty = getCardQuantity(card.cardId);
            return (
              <div
                key={card.cardId}
                data-testid="grid-card"
                className="relative group cursor-pointer"
                onClick={(e) => handleCardClick(card, e)}
                title={
                  qty > 0
                    ? `${card.cardId} (tap grey area to remove)`
                    : `Add ${card.cardId}`
                }
              >
                <CardImage
                  src={card.imageUrl}
                  variant="card"
                  alt={card.cardId}
                  className={`w-full transition-transform hover:scale-105 ${
                    qty > 0
                      ? "ring-4 ring-primary shadow-xl shadow-primary/50 rounded-lg scale-105"
                      : "border-2 border-transparent"
                  }`}
                />
                {/* Quantity badge — only show when qty > 1 */}
                {qty > 1 && (
                  <div className="absolute -top-2 -right-2 bg-primary text-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full z-10">
                    {qty}
                  </div>
                )}

                {/* Remove one overlay on hover - only show if card is in deck */}
                {qty > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveOne(card.cardId);
                    }}
                    className="absolute inset-x-0 bottom-0 h-8 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg flex items-end justify-center pb-1 cursor-pointer"
                  >
                    <span className="text-white text-sm font-bold">− 1</span>
                  </div>
                )}

                {/* Remove all button - only show if card is in deck */}
                {qty > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAll(card.cardId);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Remove all copies"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

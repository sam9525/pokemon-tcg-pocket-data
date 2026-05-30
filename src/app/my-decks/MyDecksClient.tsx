"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";
import AnimatedCard from "@/components/AnimatedCard";
import { getRarityPriority } from "@/lib/rarity";

interface DeckCard {
  cardId: string;
  quantity: number;
}

interface UserDeck {
  _id: string;
  name: string;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
}

interface MyDecksClientProps {
  initialDecks: UserDeck[];
}

export default function MyDecksClient({ initialDecks }: MyDecksClientProps) {
  const router = useRouter();
  const { currentLanguageLookup, language } = useLanguage();
  const [decks, setDecks] = useState<UserDeck[]>(initialDecks);
  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  const [cardData, setCardData] = useState<
    Record<string, { boosterPack?: string; rarity?: string }>
  >({});

  useEffect(() => {
    if (decks.length === 0) return;

    const allCardIds = [
      ...new Set(decks.flatMap((d) => d.cards.map((c) => c.cardId))),
    ];
    if (allCardIds.length === 0) return;

    fetch(
      `/api/cards/images?cardIds=${allCardIds.join(",")}&language=${language}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setCardImages(data.images || {});
        setCardData(data.cardData || {});
      })
      .catch((err) => {
        console.error("[MyDecks] Failed to load card data:", err);
        setCardImages({});
        setCardData({});
      });
  }, [decks, language]);

  const handleEdit = (deckId: string) => {
    router.push(`/deck-builder?deckId=${deckId}`);
  };

  const handleDelete = async (deckId: string) => {
    const t =
      (currentLanguageLookup?.DECK_BUILDER as Record<string, string>) || {};
    const confirmed = window.confirm(
      t.deleteConfirm || "Are you sure you want to delete this deck?",
    );
    if (!confirmed) return;

    try {
      const toastId = toast.loading((t.deleting as string) || "Deleting...");

      const res = await fetch(`/api/user-decks/${deckId}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        toast.error("Session expired", { id: toastId });
        router.push("/login?callbackUrl=/my-decks");
        return;
      }

      if (res.ok) {
        toast.success(t.deletedSuccess || "Deck deleted", { id: toastId });
        setDecks((prev) => prev.filter((d) => d._id !== deckId));
      } else {
        const data = await res.json();
        toast.error(data.error || t.deleteFailed || "Failed to delete", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("[MyDecks] Delete failed:", error);
      toast.error(t.deleteFailed || "Failed to delete deck");
    }
  };

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            {currentLanguageLookup?.DECK_BUILDER?.noSavedDecks ||
              "No decks yet"}
          </h2>
          <p className="text-gray-500">
            {currentLanguageLookup?.DECK_BUILDER?.createFirstDeck ||
              "Create your first deck to get started"}
          </p>
        </div>
        <button
          onClick={() => router.push("/deck-builder")}
          className="px-6 py-3 bg-primary text-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          {currentLanguageLookup?.DECK_BUILDER?.createDeck || "Create Deck"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-6">
      <div className="w-full max-w-5xl">
        {decks.map((deck) => (
          <div key={deck._id} className="flex flex-col gap-6 items-end m-4">
            <DeckCardComponent
              deck={deck}
              cardImages={cardImages}
              cardData={cardData}
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentLanguageLookup={currentLanguageLookup}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DeckCardComponent({
  deck,
  cardImages,
  cardData,
  onEdit,
  onDelete,
  currentLanguageLookup,
}: {
  deck: UserDeck;
  cardImages: Record<string, string>;
  cardData: Record<string, { boosterPack?: string; rarity?: string }>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  currentLanguageLookup: Record<string, unknown> | null;
}) {
  const t = (currentLanguageLookup?.MY_DECKS as Record<string, string>) || {};
  const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
  const [currentPage, setCurrentPage] = useState(0);
  const cardsPerPage = 10;
  const totalPages = Math.ceil(totalCards / cardsPerPage);

  // Reset page when deck changes
  useEffect(() => {
    setCurrentPage(0);
  }, [deck._id]);

  // Sort cards by rarity: Crown first, then Ultra Rare, etc.
  const sortedCards = [...deck.cards].sort((a, b) => {
    const rarityA = cardData[a.cardId]?.rarity || "Common";
    const rarityB = cardData[b.cardId]?.rarity || "Common";
    return getRarityPriority(rarityA) - getRarityPriority(rarityB);
  });

  const visibleCards = sortedCards.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage,
  );

  const handlePrev = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  return (
    <div className="w-full flex flex-col gap-4 p-4 md:p-6 sm:p-5 border-2 border-primary rounded-2xl bg-search-background shadow-lg">
      <div className="flex flex-row justify-between items-center">
        <div className="text-xl font-bold">{deck.name}</div>
        <div className="text-sm text-gray-500">{totalCards} cards</div>
      </div>
      <div className="flex flex-row gap-2 md:gap-4 items-center">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          disabled={totalPages <= 1}
          className="px-3 py-6 border-2 border-primary rounded-lg font-bold bg-foreground text-primary hover:bg-primary hover:text-background transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &lt;
        </button>

        {/* Cards Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {visibleCards.map((card, idx) => (
              <div key={`${card.cardId}-${idx}`} className="relative group">
                {cardImages[card.cardId] ? (
                  <AnimatedCard
                    cardId={card.cardId}
                    imageUrl={cardImages[card.cardId]}
                    boosterPack={cardData[card.cardId]?.boosterPack}
                    cardCount={card.quantity}
                  />
                ) : (
                  <div className="w-full aspect-[5/7] bg-gray-600/40 border-2 border-dashed border-gray-300 rounded-lg" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={totalPages <= 1}
          className="px-3 py-6 border-2 border-primary rounded-lg font-bold bg-foreground text-primary hover:bg-primary hover:text-background transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt;
        </button>
      </div>

      {/* Page Indicator */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 text-sm text-gray-500">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === currentPage ? "bg-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Edit/Delete Buttons */}
      <div className="flex flex-row gap-2">
        <button
          onClick={() => onEdit(deck._id)}
          className="flex-1 py-2 bg-primary text-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          {t.edit || "Edit"}
        </button>
        <button
          onClick={() => onDelete(deck._id)}
          className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          {t.delete || "Delete"}
        </button>
      </div>
    </div>
  );
}

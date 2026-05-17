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

interface DeckCollectionClientProps {
  initialDecks: UserDeck[];
}

export default function DeckCollectionClient({
  initialDecks,
}: DeckCollectionClientProps) {
  const router = useRouter();
  const { currentLanguageLookup, language } = useLanguage();
  const [decks, setDecks] = useState<UserDeck[]>(initialDecks);
  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  const [cardData, setCardData] = useState<
    Record<string, { boosterPack?: string; rarity?: string }>
  >({});
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

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
        console.error("[DeckCollection] Failed to load card data:", err);
      });
  }, [decks, language]);

  const handleEditInBuilder = async (deck: UserDeck) => {
    const t =
      (currentLanguageLookup?.DECK_COLLECTION as Record<string, string>) || {};

    // Prompt for new deck name
    const newName = window.prompt(
      t.editInBuilderPrompt || "Enter a name for the new deck:",
      deck.name + " (Copy)",
    );

    if (!newName?.trim()) return;

    setEditingDeckId(deck._id);

    try {
      const toastId = toast.loading(t.copying || "Copying...");

      // Create new deck via POST
      const res = await fetch("/api/user-decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          cards: deck.cards,
          source: "builder",
        }),
      });

      if (res.status === 401) {
        toast.error("Session expired", { id: toastId });
        router.push("/login?callbackUrl=/deck-collection");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        toast.success(t.copiedSuccess || "Deck copied!", { id: toastId });
        // Navigate to builder with the new deck ID
        router.push(`/deck-builder?deckId=${data.deck._id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || t.copyFailed || "Failed to copy", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("[DeckCollection] Copy failed:", error);
      toast.error(t.copyFailed || "Failed to copy deck");
    } finally {
      setEditingDeckId(null);
    }
  };

  const handleDelete = async (deckId: string) => {
    const t =
      (currentLanguageLookup?.DECK_COLLECTION as Record<string, string>) || {};
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
        router.push("/login?callbackUrl=/deck-collection");
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
      console.error("[DeckCollection] Delete failed:", error);
      toast.error(t.deleteFailed || "Failed to delete deck");
    }
  };

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            {currentLanguageLookup?.DECK_COLLECTION?.noDecks ||
              "No saved decks"}
          </h2>
          <p className="text-gray-500">
            {currentLanguageLookup?.DECK_COLLECTION?.visitDeckList ||
              "Visit the deck list to save decks"}
          </p>
        </div>
        <button
          onClick={() => router.push("/decks-list")}
          className="px-6 py-3 bg-primary text-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          {currentLanguageLookup?.DECK_COLLECTION?.browseDecks ||
            "Browse Decks"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-3 md:p-5">
      <div className="w-full max-w-5xl">
        {decks.map((deck) => (
          <DeckCardComponent
            key={deck._id}
            deck={deck}
            cardImages={cardImages}
            cardData={cardData}
            onEditInBuilder={handleEditInBuilder}
            onDelete={handleDelete}
            isEditing={editingDeckId === deck._id}
            currentLanguageLookup={currentLanguageLookup}
          />
        ))}
      </div>
    </div>
  );
}

function DeckCardComponent({
  deck,
  cardImages,
  cardData,
  onEditInBuilder,
  onDelete,
  isEditing,
  currentLanguageLookup,
}: {
  deck: UserDeck;
  cardImages: Record<string, string>;
  cardData: Record<string, { boosterPack?: string; rarity?: string }>;
  onEditInBuilder: (deck: UserDeck) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  currentLanguageLookup: Record<string, unknown> | null;
}) {
  // Sort cards by rarity: Crown first, then Ultra Rare, etc.
  const sortedCards = [...deck.cards].sort((a, b) => {
    const rarityA = cardData[a.cardId]?.rarity || "Common";
    const rarityB = cardData[b.cardId]?.rarity || "Common";
    return getRarityPriority(rarityA) - getRarityPriority(rarityB);
  });

  // Featured card is the first one (highest rarity)
  const featuredCard = sortedCards[0];
  const gridCards = sortedCards.slice(1);

  return (
    <div className="flex flex-col gap-6 items-end m-4">
      <div className="w-full flex flex-col gap-4 p-4 md:p-6 sm:p-5 border-2 border-primary rounded-2xl bg-search-background shadow-lg">
        <div className="flex flex-row justify-between items-center">
          <div className="text-xl font-bold">{deck.name}</div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center md:items-stretch">
          {/* Featured Image section */}
          <div className="hidden md:flex md:flex-col justify-center md:justify-start">
            {featuredCard && (
              <AnimatedCard
                cardId={featuredCard.cardId}
                imageUrl={cardImages[featuredCard.cardId]}
                boosterPack={cardData[featuredCard.cardId]?.boosterPack}
                cardCount={featuredCard.quantity}
              />
            )}
            <div className="flex-grow h-4" />
            <div className="flex flex-col gap-2">
              {/* Edit in Builder Button */}
              <button
                className="px-6 py-2 bg-primary text-foreground font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={() => onEditInBuilder(deck)}
                disabled={isEditing}
              >
                {isEditing
                  ? "..."
                  : (
                      currentLanguageLookup?.DECK_COLLECTION as Record<
                        string,
                        string
                      >
                    )?.editInBuilder || "Edit in Builder"}
              </button>
              {/* Delete Button */}
              <button
                className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                onClick={() => onDelete(deck._id)}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Grid of Cards */}
          <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 pb-4 sm:pb-0">
            {/* Featured Card (Mobile) */}
            <div className="relative group md:hidden">
              {featuredCard && (
                <AnimatedCard
                  cardId={featuredCard.cardId}
                  imageUrl={cardImages[featuredCard.cardId]}
                  boosterPack={cardData[featuredCard.cardId]?.boosterPack}
                  cardCount={featuredCard.quantity}
                />
              )}
            </div>
            {gridCards.map((card, cardIndex) => (
              <div
                key={`${card.cardId}-${cardIndex}`}
                className="relative group"
              >
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

          <div className="md:hidden flex flex-col w-full gap-4">
            <div className="flex flex-row gap-4">
              {/* Edit in Builder Button (Mobile) */}
              <button
                className="flex-1 py-2 bg-primary text-foreground font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={() => onEditInBuilder(deck)}
                disabled={isEditing}
              >
                {isEditing
                  ? "..."
                  : (
                      currentLanguageLookup?.DECK_COLLECTION as Record<
                        string,
                        string
                      >
                    )?.editInBuilder || "Edit in Builder"}
              </button>
              {/* Delete Button (Mobile) */}
              <button
                className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                onClick={() => onDelete(deck._id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

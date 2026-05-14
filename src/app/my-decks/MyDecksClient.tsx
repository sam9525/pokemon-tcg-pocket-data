"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";
import CardImage from "@/components/CardImage";
import * as interactiveCard from "@/utils/interactiveCard";
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
      <h1 className="text-2xl font-bold mb-6">
        {currentLanguageLookup?.MY_DECKS?.title || "My Decks"}
      </h1>
      <div className="w-full max-w-5xl">
        {decks.map((deck) => (
          <div key={deck._id} className="flex flex-col gap-6 items-end m-4">
            <DeckCardComponent
              deck={deck}
              cardImages={cardImages}
              cardData={cardData}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
}: {
  deck: UserDeck;
  cardImages: Record<string, string>;
  cardData: Record<string, { boosterPack?: string; rarity?: string }>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);

  // Sort cards by rarity: Crown first, then Ultra Rare, etc.
  const sortedCards = [...deck.cards].sort((a, b) => {
    const rarityA = cardData[a.cardId]?.rarity || "Common";
    const rarityB = cardData[b.cardId]?.rarity || "Common";
    return getRarityPriority(rarityA) - getRarityPriority(rarityB);
  });

  return (
    <div className="w-full flex flex-col gap-4 p-4 md:p-6 sm:p-5 border-2 border-primary rounded-2xl bg-search-background shadow-lg">
      <div className="flex flex-row justify-between items-center">
        <div className="text-xl font-bold">{deck.name}</div>
        <div className="text-sm text-gray-500">{totalCards} cards</div>
      </div>
      <div className="flex flex-row gap-4 items-center">
        <div className="flex-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {sortedCards.slice(0, 10).map((card, idx) => (
              <div key={`${card.cardId}-${idx}`} className="relative group">
                {cardImages[card.cardId] ? (
                  <DeckCardWithBoosterPack
                    cardId={card.cardId}
                    imageUrl={cardImages[card.cardId]}
                    boosterPack={cardData[card.cardId]?.boosterPack}
                    cardCount={card.quantity}
                  />
                ) : (
                  <div className="w-full aspect-[5/7] bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    {card.cardId.split("_").pop()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onEdit(deck._id)}
            className="px-4 py-2 bg-primary text-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(deck._id)}
            className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline component that shows card with boosterPack badge
// Mirrors AnimatedCard but with proper boosterPack positioning
function DeckCardWithBoosterPack({
  cardId,
  imageUrl,
  boosterPack,
  cardCount,
}: {
  cardId: string;
  imageUrl: string;
  boosterPack?: string;
  cardCount?: number;
}) {
  return (
    <div
      className="card-container"
      onMouseMove={(e) =>
        interactiveCard.handleMove(
          e,
          e.currentTarget.querySelector(".card") as HTMLElement,
        )
      }
      onMouseOut={(e) =>
        interactiveCard.handleMouseOut(
          e.currentTarget.querySelector(".card") as HTMLElement,
        )
      }
      onMouseUp={(e) =>
        interactiveCard.handleMouseUp(
          e.currentTarget.querySelector(".card") as HTMLElement,
        )
      }
      onClick={(e) => {
        e.preventDefault();
        interactiveCard.handleClick(
          cardId,
          e.currentTarget.querySelector(".card") as HTMLElement,
        );
      }}
    >
      <div className="card relative">
        <CardImage
          src={imageUrl}
          variant="card"
          alt={cardId}
          className="transition-transform duration-300"
        />
        <CardImage
          src="https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/pokemon_card_backside.png"
          variant="card"
          alt="card-backside"
          className="card-backside"
        />
        {boosterPack && (
          <div className="booster-pack w-1/2 h-4 bg-primary text-[10px] font-bold text-foreground text-center absolute left-0 bottom-0 rounded-bl-md rounded-tr-md">
            {boosterPack}
          </div>
        )}
        {cardCount !== undefined && cardCount > 1 && (
          <div className="card-count w-1/2 h-4 bg-primary text-[10px] font-bold text-foreground text-center absolute right-0 bottom-0 rounded-tl-md rounded-br-md">
            x{cardCount}
          </div>
        )}
      </div>
    </div>
  );
}

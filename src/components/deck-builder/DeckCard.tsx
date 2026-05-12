"use client";

import CardImage from "@/components/CardImage";

interface DeckCardProps {
  cardId: string;
  imageUrl: string;
  quantity: number;
  onRemoveOne: (cardId: string) => void;
  onRemoveAll: (cardId: string) => void;
}

export default function DeckCard({
  cardId,
  imageUrl,
  quantity,
  onRemoveOne,
  onRemoveAll,
}: DeckCardProps) {
  return (
    <div
      className="relative group cursor-pointer flex-shrink-0"
      onClick={() => onRemoveOne(cardId)}
      title={`${cardId} (tap to remove)`}
    >
      <div className="w-20 h-28 sm:w-24 sm:h-32">
        <CardImage
          src={imageUrl}
          variant="card"
          alt={cardId}
          className="w-full h-full transition-transform group-hover:scale-105"
        />
      </div>
      {/* Quantity badge — only show when qty > 1 */}
      {quantity > 1 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-foreground text-xs font-bold px-2 py-0.5 rounded-full z-10">
          x{quantity}
        </div>
      )}
      {/* Remove one overlay on hover */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
        <span className="text-white text-2xl font-bold">−</span>
      </div>
      {/* Remove all button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemoveAll(cardId);
        }}
        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        title="Remove all copies"
      >
        ×
      </button>
    </div>
  );
}

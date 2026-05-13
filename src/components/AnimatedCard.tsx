"use client";

import CardImage from "@/components/CardImage";
import * as interactiveCard from "@/utils/interactiveCard";

interface AnimatedCardProps {
  cardId: string;
  imageUrl: string;
  cardCount?: number;
  boosterPack?: string;
  cardClass?: string;
  variant?: "card" | "thumbnailCard";
}

export default function AnimatedCard({
  cardId,
  imageUrl,
  cardCount,
  boosterPack,
  cardClass,
  variant = "card",
}: AnimatedCardProps) {
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
          variant={variant}
          alt={cardId}
          className={`${cardClass} transition-transform duration-300`}
        />
        <CardImage
          src="https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/pokemon_card_backside.png"
          variant={variant}
          alt="card-backside"
          className="card-backside"
        />
        {boosterPack && (
          <div className="booster-pack w-1/3 h-4 bg-primary text-sm font-bold text-foreground text-center absolute left-0 bottom-0 rounded-bl-md rounded-tr-md">
            {boosterPack}
          </div>
        )}
        {cardCount !== undefined && cardCount > 1 && (
          <div className="card-count w-1/3 h-4 bg-primary text-sm font-bold text-foreground text-center absolute right-0 bottom-0 rounded-tl-md rounded-br-md">
            x{cardCount}
          </div>
        )}
      </div>
    </div>
  );
}

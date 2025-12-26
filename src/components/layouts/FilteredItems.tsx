import CardImage from "@/components/CardImage";
import { useRef, useEffect } from "react";
import * as interactiveCard from "@/utils/interactiveCard";

interface FilteredItemsProps {
  files: { id: string; url: string }[];
  packageId?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  focusedCardId?: string;
}

export default function FilteredItems({
  files,
  packageId,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  focusedCardId,
}: FilteredItemsProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef(false);

  // Handle initial focus
  useEffect(() => {
    if (
      focusedCardId &&
      !initialFocusRef.current &&
      cardRefs.current.has(focusedCardId)
    ) {
      initialFocusRef.current = true;
      // Small delay to ensure layout is stable
      setTimeout(() => {
        interactiveCard.handleClick(focusedCardId, cardRefs.current);
      }, 100);
    }
  }, [focusedCardId, files, packageId]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && onLoadMore) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    const currentObserverRef = observerRef.current;
    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6 xl:gap-10">
        {files.map((file) => (
          <div
            key={file.id}
            className="card-container"
            onMouseMove={(e) =>
              interactiveCard.handleMove(e, file.id, cardRefs.current)
            }
            onMouseOut={() =>
              interactiveCard.handleMouseOut(file.id, cardRefs.current)
            }
            onMouseUp={() =>
              interactiveCard.handleMouseUp(file.id, cardRefs.current)
            }
            onClick={(e) => {
              e.preventDefault();
              interactiveCard.handleClick(file.id, cardRefs.current);
            }}
          >
            <div
              ref={(el) => {
                if (el) cardRefs.current.set(file.id, el);
              }}
              className="card"
            >
              <CardImage src={file.url} variant="card" alt={file.id} />
              <CardImage
                src="https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/pokemon_card_backside.png"
                variant="card"
                alt="card-backside"
                className="card-backside"
              />
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div
          ref={observerRef}
          className="flex justify-center items-center py-8"
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-gray-600">Loading more cards...</p>
            </div>
          ) : (
            <div className="h-8"></div>
          )}
        </div>
      )}
    </>
  );
}

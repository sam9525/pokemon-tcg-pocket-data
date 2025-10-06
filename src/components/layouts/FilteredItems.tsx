import Image from "next/image";
import { useRef, useEffect } from "react";

interface FilteredItemsProps {
  files: { id: string; url: string }[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export default function FilteredItems({
  files,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: FilteredItemsProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<HTMLDivElement>(null);

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

  const handleMove = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    const card = cardRefs.current.get(cardId);
    if (!card) return;
    const cardImage = card.querySelector("img");

    const rect = card.getBoundingClientRect();
    const height = rect.height;
    const width = rect.width;

    // Calculate mouse position relative to the card
    const xVal = e.clientX - rect.left;
    const yVal = e.clientY - rect.top;

    const xRotation = -20 * ((yVal - height / 2) / height);
    const yRotation = 20 * ((xVal - width / 2) / width);

    const transformString = `perspective(500px) rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;

    card.style.transform = transformString + " scale(1.1)";
    if (!cardImage) return;
    cardImage.style.transform = transformString;
  };

  const handleMouseOut = (cardId: string) => {
    const card = cardRefs.current.get(cardId);
    const cardImage = card?.querySelector("img");

    const transformString = "perspective(500px) scale(1) rotateX(0) rotateY(0)";

    if (!card) return;
    card.style.transform = transformString;
    if (!cardImage) return;
    cardImage.style.transform = transformString;
  };

  const handleMouseUp = (cardId: string) => {
    const card = cardRefs.current.get(cardId);
    const cardImage = card?.querySelector("img");

    const transformString = "perspective(500px) rotateX(0) rotateY(0)";

    if (!card) return;
    card.style.transform = transformString + " scale(1.1)";
    if (!cardImage) return;
    cardImage.style.transform = transformString;
  };

  const handleClick = (cardId: string) => {
    const card = cardRefs.current.get(cardId);
    if (!card) return;

    // Toggle focus class - add if not present, remove if already present
    if (card.classList.contains("focus")) {
      // Remove focus with animation
      card.classList.add("unfocus");
      setTimeout(() => {
        card.classList.remove("focus", "unfocus");
        // Remove mask when card is unfocused
        document.getElementById("background-mask")?.remove();
      }, 300); // Match the transition duration
    } else {
      // Remove focus from any other cards first
      document.querySelectorAll(".card-container > div.focus").forEach((el) => {
        el.classList.remove("focus");
      });

      // Calculate the card's position relative to the viewport
      const rect = card.getBoundingClientRect();

      // Calculate the position as a percentage of the viewport
      // We need to account for the card's center point
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      // Set CSS variables for the animation
      card.style.setProperty("--start-x", `${startX}px`);
      card.style.setProperty("--start-y", `${startY}px`);

      // Add focus to the clicked card
      card.classList.add("focus");

      // Create and add background mask
      const mask = document.createElement("div");
      mask.id = "background-mask";

      // Remove focus and mask when clicked again
      mask.addEventListener("click", () => {
        card.classList.add("unfocus");
        setTimeout(() => {
          card.classList.remove("focus", "unfocus");
          mask.remove();
        }, 300);
      });

      document.body.appendChild(mask);
    }
    return;
  };

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8 xl:gap-10">
        {files.map((file) => (
          <div
            key={file.id}
            className="card-container"
            onMouseMove={(e) => handleMove(e, file.id)}
            onMouseOut={() => handleMouseOut(file.id)}
            onMouseUp={() => handleMouseUp(file.id)}
            onClick={() => handleClick(file.id)}
          >
            <div
              ref={(el) => {
                if (el) cardRefs.current.set(file.id, el);
              }}
              className="card"
            >
              <Image
                src={file.url}
                alt={file.id}
                width={200}
                height={280}
                onMouseMove={(e) => handleMove(e, file.id)}
                onMouseOut={() => handleMouseOut(file.id)}
                onMouseUp={() => handleMouseUp(file.id)}
              />
              <Image
                src="https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/pokemon_card_backside.png"
                alt="card-backside"
                width={200}
                height={280}
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

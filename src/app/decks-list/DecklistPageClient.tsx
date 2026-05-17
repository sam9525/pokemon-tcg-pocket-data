"use client";
import { useLanguage } from "@/components/provider/LanguageProvider";
import AnimatedCard from "@/components/AnimatedCard";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";

interface Card {
  cardId: string;
  cardName: string;
  cardCount: number;
  boosterPack?: string;
  imageUrl: string;
}

interface CardList {
  [playerName: string]: Card[];
}

interface IDeckList {
  package: string;
  deckName: string;
  count: number;
  highlight: Card[];
  cardList: CardList;
  deckListHash: string;
}

const CARD_BACKSIDE =
  "https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/pokemon_card_backside.png";

export default function DecksListClient({
  defaultDeckList,
}: {
  defaultDeckList: IDeckList[];
}) {
  const { currentLanguageLookup, language } = useLanguage();
  const [deckList, setDeckList] = useState(defaultDeckList || []);
  const [packages, setPackages] = useState("");
  const [packagesList, setPackagesList] = useState<
    { id: string; name: string }[]
  >([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [currentCardListIndices, setCurrentCardListIndices] = useState<
    Record<string, number>
  >({});
  const [animationDirections, setAnimationDirections] = useState<
    Record<string, "left" | "right">
  >({});
  const observerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  // Fetch packages when language changes
  useEffect(() => {
    if (!language) return;

    fetch(`/api/packages-metadata?language=${language}`)
      .then((res) => res.json())
      .then((data) => {
        setPackagesList(data.packages || []);
        // Set default package
        if (data.packages?.length > 0 && !packages) {
          setPackages(data.packages[0].id);
        }
      })
      .catch(console.error);
  }, [language, packages]);

  const prevNextBtnClassNameDesktop =
    "hidden md:block self-center px-3 py-6 border-2 border-primary rounded-lg font-bold bg-foreground text-primary hover:bg-primary hover:text-background transition-colors duration-200";

  const prevNextBtnClassName =
    "px-4 py-2 border-2 border-primary rounded-lg font-bold bg-foreground text-primary hover:bg-primary hover:text-background transition-colors duration-200";

  const setTagClassName =
    "w-full md:w-auto px-6 py-2 border-2 border-primary rounded-full font-bold bg-foreground text-center text-primary hover:bg-primary hover:text-background transition-colors duration-200";

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      if (language === "en_US" && !packages) {
        return;
      }
    }

    try {
      const toastPromise = new Promise(async (resolve, reject) => {
        const response = await fetch(
          `/api/decks-list?packages=${packages}&language=${language}`,
        );
        const data = await response.json();
        setDeckList(data.decklists || []);

        if (response.ok) {
          resolve(response);
        } else {
          reject(response);
        }
      });

      toast.promise(toastPromise, {
        loading: currentLanguageLookup.NOTIFICATIONS.loadingDeckLists,
        error: currentLanguageLookup.NOTIFICATIONS.failedToLoadDeckLists,
        success:
          currentLanguageLookup.NOTIFICATIONS.deckListsLoadedSuccessfully,
      });
    } catch (error) {
      console.error(error);
    }
  }, [packages, language, currentLanguageLookup]);

  useEffect(() => {
    setVisibleCount(5);
  }, [deckList, packages]);

  const hasMore = visibleCount < deckList.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          handleLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
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
  }, [hasMore]);

  const visibleDecks = deckList.slice(0, visibleCount);

  return (
    <div className="flex flex-col items-center justify-center p-3 md:p-5">
      <select
        className="dropdown"
        onChange={(e) => {
          setPackages(e.target.value);
          const selectedText = e.target.selectedOptions[0]?.text;
          if (selectedText) {
            document.title = `${selectedText} Deck Lists | Pokemon TCG Pocket Data`;
          }
        }}
      >
        {packagesList.map((pkg) => (
          <option key={pkg.id} value={pkg.id}>
            {pkg.name}
          </option>
        ))}
      </select>
      <div className="w-full max-w-5xl">
        {/* Main Content Area */}
        {visibleDecks.map((deck) => {
          const cardLists = Object.values(deck.cardList);
          const currentListIndex = currentCardListIndices[deck.deckName] || 0;
          const currentCardList = cardLists[currentListIndex] || [];
          const direction = animationDirections[deck.deckName] || "right";

          const handlePrevDeck = () => {
            setAnimationDirections((prev) => ({
              ...prev,
              [deck.deckName]: "left",
            }));
            setCurrentCardListIndices((prev) => ({
              ...prev,
              [deck.deckName]:
                (currentListIndex - 1 + cardLists.length) % cardLists.length,
            }));
          };

          const handleNextDeck = () => {
            setAnimationDirections((prev) => ({
              ...prev,
              [deck.deckName]: "right",
            }));
            setCurrentCardListIndices((prev) => ({
              ...prev,
              [deck.deckName]: (currentListIndex + 1) % cardLists.length,
            }));
          };

          return (
            <div
              key={deck.deckName}
              className="flex flex-col gap-6 items-end m-4"
            >
              <div className="w-full flex flex-col gap-4 p-4 md:p-6 sm:p-5 border-2 border-primary rounded-2xl bg-search-background shadow-lg">
                <div className="flex flex-row justify-between items-center">
                  <div className="text-xl font-bold">{deck.deckName}</div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center md:items-stretch">
                  {/* Featured Image section */}
                  <div className="hidden md:flex md:flex-col justify-center md:justify-start">
                    <AnimatedCard
                      cardId={deck.highlight[0]?.cardName ?? ""}
                      imageUrl={deck.highlight[0]?.imageUrl ?? CARD_BACKSIDE}
                      boosterPack={deck.highlight[0]?.boosterPack}
                      cardCount={deck.highlight[0]?.cardCount}
                    />
                    <div className="flex-grow h-4" />
                    <div className="flex flex-col gap-2">
                      {/* Tag */}
                      <div className={setTagClassName}>B1</div>
                      {/* Save Button */}
                      <button className="decklist-button">SAVE</button>
                    </div>
                  </div>

                  {/* Previous Button (Desktop) */}
                  <button
                    className={prevNextBtnClassNameDesktop}
                    onClick={handlePrevDeck}
                    disabled={cardLists.length <= 1}
                  >
                    &lt;
                  </button>

                  {/* Grid of Cards */}
                  <div
                    key={currentListIndex}
                    className={`flex-1 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 pb-4 sm:pb-0 ${
                      direction === "right"
                        ? "animate-slideInRight"
                        : "animate-slideInLeft"
                    }`}
                  >
                    {/* Featured Image (Mobile) */}
                    <div className="relative group md:hidden">
                      <AnimatedCard
                        cardId={deck.highlight[0]?.cardName ?? ""}
                        imageUrl={deck.highlight[0]?.imageUrl ?? CARD_BACKSIDE}
                        boosterPack={deck.highlight[0]?.boosterPack}
                        cardCount={deck.highlight[0]?.cardCount}
                      />
                    </div>
                    {currentCardList.map((card, cardIndex) => (
                      <div key={cardIndex} className="relative group">
                        <AnimatedCard
                          cardId={card.cardName}
                          imageUrl={card.imageUrl}
                          boosterPack={card.boosterPack}
                          cardCount={card.cardCount}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Next Button (Desktop) */}
                  <button
                    className={prevNextBtnClassNameDesktop}
                    onClick={handleNextDeck}
                    disabled={cardLists.length <= 1}
                  >
                    &gt;
                  </button>

                  <div className="md:hidden flex flex-col w-full gap-4">
                    <div className="flex flex-row justify-between w-full gap-4">
                      <button
                        className={prevNextBtnClassName}
                        onClick={handlePrevDeck}
                        disabled={cardLists.length <= 1}
                      >
                        &lt;
                      </button>
                      <button
                        className={prevNextBtnClassName}
                        onClick={handleNextDeck}
                        disabled={cardLists.length <= 1}
                      >
                        &gt;
                      </button>
                    </div>
                    <div className="flex flex-row gap-4">
                      {/* Tag */}
                      <div className={setTagClassName}>B1</div>
                      {/* Save Button */}
                      <button className="decklist-button">SAVE</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div
          ref={observerRef}
          className="flex justify-center items-center py-8"
        >
          <div className="h-8"></div>
        </div>
      )}
    </div>
  );
}

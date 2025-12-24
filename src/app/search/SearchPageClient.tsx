"use client";

import FilteredItems from "@/components/layouts/FilteredItems";
import CardImage from "@/components/CardImage";
import React, { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";

interface FilterItem {
  id: string;
  url: string;
}

interface FilterSectionProps {
  title: string;
  items: FilterItem[];
  filterName: string;
  renderItem: (
    filterName: string,
    item: FilterItem,
    index: number
  ) => React.ReactNode;
  className?: string;
}

interface FilterItemImageProps {
  filterName?: string;
  item: FilterItem;
  width: number;
  height: number;
}

interface RarityFilterItemProps {
  filterName?: string;
  rarity: FilterItem;
  repeats: number[][];
  rarityIndex: number;
  width: number;
  height: number;
}

export default function SearchPageClient({
  initialTypes,
  initialRarity,
  initialPackageIcons,
  initialBoostersIcon,
  initialSpecificEffect,
}: {
  initialTypes: FilterItem[];
  initialRarity: FilterItem[];
  initialPackageIcons: FilterItem[];
  initialBoostersIcon: FilterItem[];
  initialSpecificEffect: FilterItem[];
}) {
  const hasLoaded = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [types, setTypes] = useState<FilterItem[]>(initialTypes);
  const [rarity, setRarity] = useState<FilterItem[]>(initialRarity);
  const repeats = [[1, 2, 3], [1, 2, 3], [1, 2], [1]];
  const [package_icons, setPackageIcons] =
    useState<FilterItem[]>(initialPackageIcons);
  const [Boosters_icon, setBoostersIcon] =
    useState<FilterItem[]>(initialBoostersIcon);
  const [specific_effect, setSpecificEffect] = useState<FilterItem[]>(
    initialSpecificEffect
  );
  const [filtering, setFiltering] = useState<[string, string][]>([]);
  const [searchResult, setSearchResult] = useState<FilterItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { language, currentLanguageLookup } = useLanguage();
  const [searchCardName, setSearchCardName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search`, {
          headers: {
            language: language,
          },
        });
        const data = await res.json();
        setTypes(data.types);
        setRarity(data.rarity);
        setPackageIcons(data.package_icons);
        setBoostersIcon(data.Boosters_icon);
        setSpecificEffect(data.specific_effect);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [language]);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    if (isLoading) {
      const loadingToast = toast.loading(
        currentLanguageLookup.NOTIFICATIONS.loading
      );
      return () => {
        toast.success(currentLanguageLookup.NOTIFICATIONS.loadingSuccessful, {
          id: loadingToast,
        });
      };
    }
  }, [isLoading, currentLanguageLookup]);

  useEffect(() => {
    const fetchSearchResult = async (
      page: number = 1,
      append: boolean = false
    ) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        // If filtering array is empty, clear search results and return early
        if (filtering.length === 0) {
          setSearchResult([]);
          setHasMore(false);
          setCurrentPage(1);
          return;
        }

        // Convert filtering array to structured object
        const filterObject: Record<string, string[]> = {};
        filtering.forEach(([filterName, id]) => {
          if (!filterObject[filterName]) {
            filterObject[filterName] = [];
          }
          filterObject[filterName].push(id);
        });

        const toastPromise = new Promise(async (resolve, reject) => {
          const res = await fetch("/api/search/filtering", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              language: language,
            },
            body: JSON.stringify({
              ...filterObject,
              page: page,
              limit: 100,
            }),
          });
          const data = await res.json();

          if (append) {
            setSearchResult((prev) => [...prev, ...data.results]);
          } else {
            setSearchResult(data.results);
          }

          setHasMore(data.hasMore);
          setCurrentPage(page);

          if (res.ok) {
            resolve(res);
          } else {
            reject(res);
          }
        });

        if (page === 1) {
          toast.promise(toastPromise, {
            loading: currentLanguageLookup.NOTIFICATIONS.loadingCards,
            error: currentLanguageLookup.NOTIFICATIONS.failedToLoadCards,
            success:
              currentLanguageLookup.NOTIFICATIONS.cardsLoadedSuccessfully,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    fetchSearchResult(1, false);
  }, [filtering, language, currentLanguageLookup]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      const fetchMoreResults = async () => {
        try {
          setIsLoadingMore(true);

          // If filtering array is empty, return
          if (filtering.length === 0) {
            return;
          }

          // Convert filtering array to structured object
          const filterObject: Record<string, string[]> = {};
          filtering.forEach(([filterName, id]) => {
            if (!filterObject[filterName]) {
              filterObject[filterName] = [];
            }
            filterObject[filterName].push(id);
          });

          const res = await fetch("/api/search/filtering", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              language: language,
            },
            body: JSON.stringify({
              ...filterObject,
              page: currentPage + 1,
              limit: 100,
            }),
          });
          const data = await res.json();

          setSearchResult((prev) => [...prev, ...data.results]);
          setHasMore(data.hasMore);
          setCurrentPage(currentPage + 1);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoadingMore(false);
        }
      };

      fetchMoreResults();
    }
  }, [isLoadingMore, hasMore, filtering, language, currentPage]);

  const mouseClick = (filterName: string, id: string) => {
    setFiltering((prevFiltering) => {
      const existingIndex = prevFiltering.findIndex(
        ([filter, itemId]) => filter === filterName && itemId === id
      );

      if (existingIndex !== -1) {
        // Remove the filter if it already exists
        return prevFiltering.filter((_, index) => index !== existingIndex);
      } else {
        // Add the filter if it doesn't exist
        return [...prevFiltering, [filterName, id]];
      }
    });
  };

  // Filter section component
  const FilterSection = React.memo<FilterSectionProps>(
    ({ title, items, filterName, renderItem, className }) => (
      <div className="flex items-center justify-start max-w-240 w-[90%] md:w-[85%] m-auto">
        <div className="rounded-lg w-24 font-medium text-start">{title}</div>
        <div className={`flex flex-wrap gap-3 items-center ${className}`}>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {renderItem(filterName, item, index)}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  );

  FilterSection.displayName = "FilterSection";

  // Type filter item component
  const FilterItemImage = React.memo<FilterItemImageProps>(
    ({ filterName, item, width, height }) => {
      const isActive = filtering.some(
        ([filter, itemId]) => filter === filterName && itemId === item.id
      );

      return (
        <button
          key={item.id}
          className="cursor-pointer"
          onClick={() => {
            mouseClick(filterName || "", item.id);
          }}
        >
          <CardImage
            src={item.url}
            variant="thumbnail"
            alt={item.id}
            width={width}
            height={height}
            className={`transition-opacity duration-300 ${
              isActive ? "opacity-100" : "opacity-30"
            }`}
          />
        </button>
      );
    }
  );

  FilterItemImage.displayName = "FilterItemImage";

  // Rarity filter with multiple stars
  const RarityFilterItem = React.memo<RarityFilterItemProps>(
    ({ filterName, rarity, repeats, rarityIndex, width, height }) => {
      // Get the star counts for this specific rarity item
      const starCounts = repeats[rarityIndex] || [1];

      return (
        <div className="flex gap-2">
          {starCounts.map((starCount) => {
            const itemId = `${rarity.id}-${starCount}`;
            const isActive = filtering.some(
              ([filter, id]) => filter === filterName && id === itemId
            );

            return (
              <button
                key={itemId}
                className={`${itemId} cursor-pointer flex flex-row items-center transition-opacity duration-300 ${
                  isActive ? "opacity-100" : "opacity-30"
                }`}
                onClick={() => mouseClick(filterName || "", itemId)}
              >
                {Array.from({ length: starCount }, (_, index) => (
                  <CardImage
                    key={index}
                    src={rarity.url}
                    variant="thumbnail"
                    alt={itemId}
                    width={width}
                    height={height}
                    className={`w-auto h-8 transition-opacity duration-300`}
                  />
                ))}
              </button>
            );
          })}
          <div className="w-0.5 h-9 rounded-lg bg-primary"></div>
        </div>
      );
    }
  );

  const handleSearchByCardName = async (cardName: string) => {
    try {
      const res = await fetch(`/api/search/searchCardName`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          language: language,
        },
        body: JSON.stringify({ cardName }),
      });
      const data = await res.json();

      setSearchResult(data.results);
    } catch (error) {
      console.error(error);
    }
  };

  RarityFilterItem.displayName = "RarityFilterItem";

  return (
    <>
      <div className="max-w-240 w-[90%] m-auto my-8 md:my-10 sm:my-12 bg-search-background rounded-xl border-primary border-2">
        <div className="flex flex-col gap-5 items-center justify-center p-4 sm:p-6">
          <input
            value={searchCardName}
            onChange={(e) => setSearchCardName(e.target.value)}
            type="text"
            placeholder={currentLanguageLookup.SEARCH.enterPokemonName}
            className="max-w-140 w-[80%] px-4 py-2 bg-search-input rounded-lg hover:-webkit-text-fill-color-primary focus:outline-none focus:ring-2 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchByCardName(searchCardName);
              }
            }}
          />
          <FilterSection
            title={currentLanguageLookup.SEARCH.type}
            items={types.slice(1)}
            filterName="types"
            renderItem={(filterName, type) => (
              <FilterItemImage
                filterName={filterName}
                item={type}
                width={32}
                height={32}
              />
            )}
            className="max-w-170 types"
          />
          <FilterSection
            title={currentLanguageLookup.SEARCH.rarity}
            items={rarity.slice(1)}
            filterName="rarity"
            renderItem={(filterName, rarity, index) => (
              <RarityFilterItem
                filterName={filterName}
                rarity={rarity}
                repeats={repeats}
                rarityIndex={index}
                width={32}
                height={32}
              />
            )}
            className="max-w-170 rarity"
          />
          <div className="max-w-180 h-0.5 rounded-lg bg-primary"></div>
          <FilterSection
            title={currentLanguageLookup.SEARCH.package}
            items={package_icons}
            filterName="package_icons"
            renderItem={(filterName, package_icon) => (
              <FilterItemImage
                filterName={filterName}
                item={package_icon}
                width={100}
                height={44}
              />
            )}
            className="max-w-170 package_icons"
          />
          <div className="max-w-180 h-0.5 rounded-lg bg-primary"></div>
          <FilterSection
            title={currentLanguageLookup.SEARCH.boosterPack}
            items={Boosters_icon}
            filterName="Boosters_icon"
            renderItem={(filterName, Boosters_icon) => (
              <FilterItemImage
                filterName={filterName}
                item={Boosters_icon}
                width={100}
                height={44}
              />
            )}
            className="max-w-170 Boosters_icon"
          />
          <div className="max-w-180 w-[90%] m-auto p-3 sm:p-6 bg-search-extra rounded-lg">
            <div className="flex flex-col gap-4 items-center justify-center">
              <FilterSection
                title={currentLanguageLookup.SEARCH.speicalEffect}
                items={specific_effect.slice(1)}
                filterName="specific_effect"
                renderItem={(filterName, specific_effect) => (
                  <FilterItemImage
                    filterName={filterName}
                    item={specific_effect}
                    width={32}
                    height={32}
                  />
                )}
                className="max-w-130 specific_effect"
              />
              <FilterSection
                title={currentLanguageLookup.SEARCH.fightEnergy}
                items={types.slice(1, 9)}
                filterName="fight_energy"
                renderItem={(filterName, type) => (
                  <FilterItemImage
                    filterName={filterName}
                    item={type}
                    width={32}
                    height={32}
                  />
                )}
                className="max-w-150 fight_energy"
              />
              <FilterSection
                title={currentLanguageLookup.SEARCH.weakness}
                items={types.slice(1, 9)}
                filterName="weakness"
                renderItem={(filterName, type) => (
                  <FilterItemImage
                    filterName={filterName}
                    item={type}
                    width={32}
                    height={32}
                  />
                )}
                className="max-w-150 weakness"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center m-10">
        <FilteredItems
          files={searchResult}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoading={isLoadingMore}
        />
      </div>
    </>
  );
}

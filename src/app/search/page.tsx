"use client";

import FilteredItems from "@/components/layouts/FilteredItems";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
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

export default function SearchPage() {
  const hasLoaded = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [types, setTypes] = useState<FilterItem[]>([]);
  const [rarity, setRarity] = useState<FilterItem[]>([]);
  const repeats = [[1, 2, 3], [1, 2, 3], [1, 2], [1]];
  const [package_icons, setPackageIcons] = useState<FilterItem[]>([]);
  const [Boosters_icon, setBoostersIcon] = useState<FilterItem[]>([]);
  const [specific_effect, setSpecificEffect] = useState<FilterItem[]>([]);
  const [filtering, setFiltering] = useState<[string, string][]>([]);
  const [searchResult, setSearchResult] = useState<FilterItem[]>([]);
  const { currentLanguageLookup } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/search");
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
  }, []);

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
    const fetchSearchResult = async () => {
      try {
        setIsLoading(true);

        // If filtering array is empty, clear search results and return early
        if (filtering.length === 0) {
          setSearchResult([]);
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
          },
          body: JSON.stringify(filterObject),
        });
        const data = await res.json();
        setSearchResult(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResult();
  }, [filtering]);

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
    console.log(filtering);
  };

  // Filter section component
  const FilterSection = React.memo<FilterSectionProps>(
    ({ title, items, filterName, renderItem, className }) => (
      <div className="flex items-center justify-left">
        <div className="rounded-lg mr-10 w-24 font-medium text-right">
          {title}
        </div>
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
          <Image
            src={item.url}
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
                  <Image
                    key={index}
                    src={rarity.url}
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

  RarityFilterItem.displayName = "RarityFilterItem";

  return (
    <>
      <div className="w-240 m-auto my-12 bg-search-background rounded-xl border-primary border-2">
        <div className="flex flex-col gap-5 items-center justify-center p-6">
          <input
            type="text"
            placeholder={currentLanguageLookup.SEARCH.enterPokemonName}
            className="w-140 px-4 py-2 bg-search-input rounded-lg hover:-webkit-text-fill-color-primary focus:outline-none focus:ring-2 focus:border-transparent"
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
            className="w-170 types"
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
            className="w-170 rarity"
          />
          <div className="w-180 h-0.5 rounded-lg bg-primary"></div>
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
            className="w-170 package_icons"
          />
          <div className="w-180 h-0.5 rounded-lg bg-primary"></div>
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
            className="w-170 Boosters_icon"
          />
          <div className="w-180 m-auto p-6 bg-search-extra rounded-lg">
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
                className="w-130 specific_effect"
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
                className="w-130 fight_energy"
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
                className="w-130 weakness"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center m-10">
        <FilteredItems files={searchResult} />
      </div>
    </>
  );
}

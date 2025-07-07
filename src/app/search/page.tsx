"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
  const [isLoading, setIsLoading] = useState(true);
  const [types, setTypes] = useState<FilterItem[]>([]);
  const [rarity, setRarity] = useState<FilterItem[]>([]);
  const repeats = [[1, 2, 3], [1, 2, 3], [1, 2], [1]];
  const [package_icons, setPackageIcons] = useState<FilterItem[]>([]);
  const [Boosters_icon, setBoostersIcon] = useState<FilterItem[]>([]);
  const [specific_effect, setSpecificEffect] = useState<FilterItem[]>([]);

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
    if (isLoading) {
      const loadingToast = toast.loading("Loading...");
      return () => {
        toast.success("Loading successful", { id: loadingToast });
      };
    }
  }, [isLoading]);

  const mouseClick = (filterName: string, id: string) => {
    const filter = document.querySelector(`.${filterName}`);
    let type_item: HTMLElement | null | undefined = null;
    if (filterName === "rarity") {
      type_item = filter?.querySelector(`.${id}`);
    } else {
      type_item = filter?.querySelector(`[alt="${id}"]`);
    }

    if (type_item?.classList.contains("opacity-30")) {
      type_item?.classList.add("opacity-100");
      type_item?.classList.remove("opacity-30");
    } else {
      type_item?.classList.remove("opacity-100");
      type_item?.classList.add("opacity-30");
    }
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
    ({ filterName, item, width, height }) => (
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
          className="opacity-30 transition-opacity duration-300"
        />
      </button>
    )
  );

  FilterItemImage.displayName = "FilterItemImage";

  // Rarity filter with multiple stars
  const RarityFilterItem = React.memo<RarityFilterItemProps>(
    ({ filterName, rarity, repeats, rarityIndex, width, height }) => {
      // Get the star counts for this specific rarity item
      const starCounts = repeats[rarityIndex] || [1];

      return (
        <div className="flex gap-2">
          {starCounts.map((starCount) => (
            <button
              key={`${rarity.id}-${starCount}`}
              className={`${rarity.id}-${starCount} cursor-pointer flex flex-row items-center opacity-30 transition-opacity duration-300`}
              onClick={() =>
                mouseClick(filterName || "", `${rarity.id}-${starCount}`)
              }
            >
              {Array.from({ length: starCount }, (_, index) => (
                <Image
                  key={index}
                  src={rarity.url}
                  alt={`${rarity.id}-${starCount}`}
                  width={width}
                  height={height}
                  className={`w-auto h-8 transition-opacity duration-300`}
                />
              ))}
            </button>
          ))}
          <div className="w-0.5 h-9 rounded-lg bg-primary"></div>
        </div>
      );
    }
  );

  RarityFilterItem.displayName = "RarityFilterItem";

  return (
    <div className="w-240 m-auto my-12 bg-search-background rounded-xl border-primary border-2">
      <div className="flex flex-col gap-5 items-center justify-center p-6">
        <input
          type="text"
          placeholder="請輸入寶可夢名稱"
          className="w-140 px-4 py-2 bg-search-input rounded-lg hover:-webkit-text-fill-color-primary focus:outline-none focus:ring-2 focus:border-transparent"
        />
        <FilterSection
          title="屬性"
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
          title="稀有度"
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
          title="系列"
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
          title="擴充包"
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
              title="特殊效果"
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
              title="招式"
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
              title="弱點"
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
  );
}

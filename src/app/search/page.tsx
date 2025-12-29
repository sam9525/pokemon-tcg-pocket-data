import type { Metadata } from "next";
import SearchPageClient from "./SearchPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for Pokemon TCG Pocket cards.",
  openGraph: {
    title: "Search | Pokemon TCG Pocket Data",
    description: "Search for Pokemon TCG Pocket cards.",
  },
};

export default async function SearchPage() {
  const response = await fetch(
    `${process.env.AUTH_URL}/api/search?language=en`,
    {
      cache: "no-cache",
    }
  );
  const data = await response.json();

  return (
    <SearchPageClient
      initialTypes={data.types}
      initialRarity={data.rarity}
      initialPackageIcons={data.package_icons}
      initialBoostersIcon={data.Boosters_icon}
      initialSpecificEffect={data.specific_effect}
    />
  );
}

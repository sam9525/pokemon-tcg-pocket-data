import PackagePageClient from "./PackagePageClient";

import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const packageName = id.replace(/_/g, " ");

  return {
    title: `Package ${packageName}`,
    description: `Browse cards from the ${packageName} package in Pokemon TCG Pocket.`,
    openGraph: {
      title: `Package ${packageName} | Pokemon TCG Pocket`,
      description: `Browse cards from the ${packageName} package in Pokemon TCG Pocket.`,
    },
  };
}

export default async function PackagePage({ params }: Props) {
  const { id } = await params;

  const response = await fetch(
    `${process.env.AUTH_URL}/api/cards/${id}?language=en_US`
  );
  const data = await response.json();

  return <PackagePageClient packageId={id} initialCards={data.cards} />;
}

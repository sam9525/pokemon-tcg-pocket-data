import { Metadata } from "next";
import PackagePageClient from "../PackagePageClient";
import { cache } from "react";

const getCards = cache(async (id: string) => {
  const response = await fetch(
    `${process.env.AUTH_URL}/api/cards/${id}?language=en`
  );
  if (!response.ok) return null;
  return response.json();
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}): Promise<Metadata> {
  const { id, cardId } = await params;
  const packageName = id.replace(/_/g, " ");
  const cardName = cardId.replace(/_/g, " ");

  const data = await getCards(id);
  const card = data?.cards?.find((c: { id: string }) => c.id === cardId);

  return {
    title: `${cardName} | ${packageName}`,
    description: `View details for ${cardName} from the ${packageName} package in Pokemon TCG Pocket.`,
    openGraph: {
      title: `${cardName} | Pokemon TCG Pocket Data`,
      description: `View details for ${cardName} from the ${packageName} package in Pokemon TCG Pocket.`,
      images: card ? [card.url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${cardName} | Pokemon TCG Pocket Data`,
      description: `View details for ${cardName} from the ${packageName} package in Pokemon TCG Pocket.`,
      images: card ? [card.url] : [],
    },
  };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const { id, cardId } = await params;
  const data = await getCards(id);

  return (
    <PackagePageClient
      packageId={id}
      initialCards={data?.cards || []}
      focusedCardId={cardId}
    />
  );
}

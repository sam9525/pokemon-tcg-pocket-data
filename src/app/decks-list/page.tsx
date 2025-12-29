import type { Metadata } from "next";
import DecksListClient from "./DecklistPageClient";

const PACKAGE_DISPLAY_NAME = "A1 - Genetic Apex";

export const metadata: Metadata = {
  title: `${PACKAGE_DISPLAY_NAME} Deck Lists`,
  description: `Browse ${PACKAGE_DISPLAY_NAME} deck lists for Pokemon TCG Pocket.`,
  openGraph: {
    title: `${PACKAGE_DISPLAY_NAME} Deck Lists | Pokemon TCG Pocket Data`,
    description: `Browse ${PACKAGE_DISPLAY_NAME} deck lists for Pokemon TCG Pocket.`,
  },
};

export default async function DecksList() {
  const response = await fetch(
    `${process.env.AUTH_URL}/api/decks-list?packages=A1_Genetic-Apex&language=en_US`,
    {
      cache: "no-cache",
    }
  );
  const data = await response.json();

  return <DecksListClient defaultDeckList={data.decklists} />;
}

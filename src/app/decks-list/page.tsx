import DecksListClient from "./DecklistPageClient";

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

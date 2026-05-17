/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DeckCollectionClient from "./DeckCollectionClient";
import { UserDeck } from "@/models/UserDeck";
import { User } from "@/models/User";
import connectDB from "@/lib/mongodb";

export const metadata: Metadata = {
  title: "Deck Collection",
  description: "View and manage your saved deck collections",
};

export default async function DeckCollectionPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/deck-collection");
  }

  await connectDB();

  const user = (await User.findOne({
    email: session.user.email,
  }).lean()) as any;

  if (!user?._id) {
    redirect("/login?callbackUrl=/deck-collection");
  }

  // Only fetch decks from deck list (source: "decklist")
  const decks = (await UserDeck.find({ userId: user._id, source: "decklist" })
    .sort({ updatedAt: -1 })
    .select("name cards createdAt updatedAt")
    .lean()) as any;

  const plainDecks = decks.map((deck: any) => ({
    _id: deck._id.toString(),
    name: deck.name,
    cards: deck.cards,
    createdAt: deck.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: deck.updatedAt?.toISOString() || new Date().toISOString(),
  }));

  return <DeckCollectionClient initialDecks={plainDecks} />;
}

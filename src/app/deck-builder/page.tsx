import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DeckBuilderClient from "./DeckBuilderClient";

export const metadata: Metadata = {
  title: "Deck Builder",
  description: "Build and manage your Pokemon TCG Pocket decks",
};

// Redirect to login if not authenticated
export default async function DeckBuilderPage() {
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/deck-builder");
  }

  return <DeckBuilderClient />;
}

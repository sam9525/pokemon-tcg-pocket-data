/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";
import connectDB from "@/lib/mongodb";
import { DeckList } from "@/models/DeckList";
import { Card } from "@/models/Card";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const packages = searchParams.get("packages") as string;
  const language = searchParams.get("language") as string;

  // Rate limiting to decklist queries
  const rateLimitResult = await rateLimit(request, API_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Connect to MongoDB
  await connectDB();

  // Get the specific packages' deck lists first
  const decklists = (await DeckList.find({
    package: packages,
  }).lean()) as any[];

  // Extract all unique card names from the deck lists
  const cardNamesSet = new Set<string>();
  decklists.forEach((deck: any) => {
    // Collect from highlight
    if (deck.highlight) {
      deck.highlight.forEach((card: any) => {
        if (card.cardName) cardNamesSet.add(card.cardName);
      });
    }

    // Collect from cardList
    if (deck.cardList) {
      Object.values(deck.cardList).forEach((playerCards: any) => {
        if (Array.isArray(playerCards)) {
          playerCards.forEach((card: any) => {
            if (card.cardName) cardNamesSet.add(card.cardName);
          });
        }
      });
    }
  });

  const uniqueCardNames = Array.from(cardNamesSet);

  // Fetch only the relevant cards using case-insensitive matching
  const cards = (await Card.find({
    package: packages,
    name: { $in: uniqueCardNames },
    language: language,
    rarity: {
      $regex: `^(Immersive Rare|Super Rare|Art Rare|Double Rare|Rare|Uncommon|Common)$`,
      $options: "i",
    },
  })
    .collation({ locale: "en", strength: 2 }) // Case-insensitive match
    .select("name cardId imageUrl language")
    .lean()) as any[];

  // Create a lookup map for cards by name
  const cardMap = new Map<
    string,
    { cardId: string; imageUrl: string | undefined }
  >();
  cards.forEach((card: any) => {
    // Store both exact and normalized keys
    cardMap.set(card.name, { cardId: card.cardId, imageUrl: card.imageUrl });
    if (card.name) {
      cardMap.set(card.name.toLowerCase().trim(), {
        cardId: card.cardId,
        imageUrl: card.imageUrl,
      });
    }
  });

  // Helper to get card data
  const getCardData = (name: string) => {
    if (!name) return undefined;
    return cardMap.get(name) || cardMap.get(name.toLowerCase().trim());
  };

  // Enrich decklists with cardId and imageUrl
  const enrichedDecklists = decklists.map((deck: any) => {
    // Enrich highlight cards
    const enrichedHighlight = deck.highlight.map((card: any) => {
      const cardData = getCardData(card.cardName);
      if (!cardData) {
        console.log(`Failed to find card for highlight: "${card.cardName}"`);
      }
      return {
        ...card,
        ...cardData,
      };
    });

    // Enrich cardList
    const enrichedCardList: Record<string, any[]> = {};
    Object.entries(deck.cardList).forEach(([player, playerCards]) => {
      enrichedCardList[player] = (playerCards as any[]).map((card: any) => ({
        ...card,
        ...getCardData(card.cardName),
      }));
    });

    return {
      ...deck,
      highlight: enrichedHighlight,
      cardList: enrichedCardList,
    };
  });

  return Response.json({ decklists: enrichedDecklists });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";
import connectDB from "@/lib/mongodb";
import { DeckList } from "@/models/DeckList";
import { Card } from "@/models/Card";
import { getBoosterToPackageMapping } from "@/lib/boosterToPackage";

const PACKAGE_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_PACKAGE_LEN = 64;

function getPackageFromBoosterPack(
  boosterPack: string,
  boosterToPackage: Record<string, string>,
): string {
  if (!boosterPack) return "";
  const prefix = boosterPack.split("_")[0];
  return boosterToPackage[prefix] || prefix;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const packages = searchParams.get("packages") as string;
  const language = (searchParams.get("language") as string) || "en_US";

  // C4: bound and validate the packages param to prevent regex DoS
  if (!packages || packages.length === 0) {
    return NextResponse.json(
      { error: "packages param is required" },
      { status: 400 },
    );
  }
  if (packages.length > MAX_PACKAGE_LEN || !PACKAGE_PATTERN.test(packages)) {
    return NextResponse.json(
      { error: "packages param is invalid" },
      { status: 400 },
    );
  }

  // Rate limiting to decklist queries
  const rateLimitResult = await rateLimit(request, API_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Fetch booster-to-package mapping from S3 (cached)
  const boosterToPackage = await getBoosterToPackageMapping();

  // Connect to MongoDB
  await connectDB();

  // Get the specific packages' deck lists first
  const decklists = (await DeckList.find({
    package: { $regex: `^${packages}$`, $options: "i" },
  })
    .limit(500) // Defense in depth
    .lean()) as any[];

  // Extract all unique card names from the deck lists
  const cardNamesSet = new Set<string>();
  decklists.forEach((deck: any) => {
    if (deck.highlight) {
      deck.highlight.forEach((card: any) => {
        if (card.cardName) cardNamesSet.add(card.cardName);
      });
    }
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

  // Derive fallback packages from booster packs for cards not in selected packages
  const fallbackPackagesSet = new Set<string>();
  decklists.forEach((deck: any) => {
    if (deck.highlight) {
      deck.highlight.forEach((card: any) => {
        if (card.boosterPack) {
          const pkg = getPackageFromBoosterPack(
            card.boosterPack,
            boosterToPackage,
          );
          if (pkg) fallbackPackagesSet.add(pkg);
        }
      });
    }
    if (deck.cardList) {
      Object.values(deck.cardList).forEach((playerCards: any) => {
        if (Array.isArray(playerCards)) {
          playerCards.forEach((card: any) => {
            if (card.boosterPack) {
              const pkg = getPackageFromBoosterPack(
                card.boosterPack,
                boosterToPackage,
              );
              if (pkg) fallbackPackagesSet.add(pkg);
            }
          });
        }
      });
    }
  });

  // Fetch cards from selected packages AND fallback packages
  const allPackages = [
    ...new Set([...[packages], ...Array.from(fallbackPackagesSet)]),
  ];
  const cards = (await Card.find({
    package: { $in: allPackages },
    name: { $in: uniqueCardNames },
    language: "en_US",
    rarity: {
      $regex: `^(Immersive Rare|Super Rare|Art Rare|Double Rare|Rare|Uncommon|Common)$`,
      $options: "i",
    },
  })
    .collation({ locale: "en", strength: 2 })
    .select("name cardId imageUrl language package")
    .lean()) as any[];

  // Create lookup map by card name (case-insensitive)
  const cardMap = new Map<
    string,
    { cardId: string; imageUrl: string | undefined; package: string }
  >();
  const cardMapLower = new Map<
    string,
    { cardId: string; imageUrl: string | undefined; package: string }
  >();

  cards.forEach((card: any) => {
    if (!cardMap.has(card.name)) {
      cardMap.set(card.name, {
        cardId: card.cardId,
        imageUrl: card.imageUrl,
        package: card.package,
      });
    }
    const lower = card.name.toLowerCase().trim();
    if (!cardMapLower.has(lower)) {
      cardMapLower.set(lower, {
        cardId: card.cardId,
        imageUrl: card.imageUrl,
        package: card.package,
      });
    }
  });

  // Helper to get card data (case-insensitive lookup)
  const getCardData = (name: string) => {
    if (!name) return undefined;
    return cardMap.get(name) || cardMapLower.get(name.toLowerCase().trim());
  };

  // Enrich decklists with cardId and imageUrl
  const enrichedDecklists = decklists.map((deck: any) => {
    const enrichedHighlight = Array.isArray(deck.highlight)
      ? deck.highlight.map((card: any) => {
          const cardData = getCardData(card.cardName);
          if (!cardData) {
            console.log(
              `Failed to find card: "${card.cardName}" boosterPack: "${card.boosterPack}"`,
            );
          }
          const result = { ...card, ...cardData };
          if (result?.cardId && language !== "en_US") {
            result.cardId = result.cardId.replace(/en_US/gi, language);
          }
          if (result?.imageUrl && language !== "en_US") {
            result.imageUrl = result.imageUrl.replace(/en_US/gi, language);
          }
          return result;
        })
      : [];

    const enrichedCardList: Record<string, any[]> = {};
    if (deck.cardList && typeof deck.cardList === "object") {
      Object.entries(deck.cardList).forEach(([player, playerCards]) => {
        enrichedCardList[player] = Array.isArray(playerCards)
          ? (playerCards as any[]).map((card: any) => {
              const cardData = getCardData(card.cardName);
              if (!cardData) {
                console.log(
                  `Failed to find card: "${card.cardName}" boosterPack: "${card.boosterPack}"`,
                );
              }
              const result = { ...card, ...cardData };
              if (result?.cardId && language !== "en_US") {
                result.cardId = result.cardId.replace(/en_US/gi, language);
              }
              if (result?.imageUrl && language !== "en_US") {
                result.imageUrl = result.imageUrl.replace(/en_US/gi, language);
              }
              return result;
            })
          : [];
      });
    }
    return {
      ...deck,
      highlight: enrichedHighlight,
      cardList: enrichedCardList,
    };
  });

  return Response.json({ decklists: enrichedDecklists });
}

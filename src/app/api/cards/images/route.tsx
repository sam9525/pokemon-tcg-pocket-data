import { Card } from "@/models/Card";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cardIdsParam = url.searchParams.get("cardIds");
    const language = url.searchParams.get("language") || "en_US";

    if (!cardIdsParam) {
      return Response.json({ images: {}, cardData: {} });
    }

    const cardIds = cardIdsParam.split(",").filter(Boolean);

    // Translate cardIds from English to target language
    const translatedCardIds = cardIds.map((cardId) => {
      if (cardId.includes("en_US")) {
        return cardId.replace(/en_US/gi, language);
      }
      return cardId; // Already translated or non-standard format
    });

    const cachePrefix = `card_images_${translatedCardIds.join("_")}_${language}`;
    const cached = cacheManager.get(cachePrefix);
    if (cached) {
      return Response.json(cached);
    }

    await connectDB();

    const cards = await Card.find({
      cardId: { $in: translatedCardIds },
      language: language,
    });

    const images: Record<string, string> = {};
    const cardData: Record<string, { boosterPack?: string; rarity?: string }> =
      {};

    cards.forEach((card) => {
      // Find the original cardId that maps to this translated cardId
      const originalIdx = translatedCardIds.indexOf(card.cardId);
      const originalCardId =
        originalIdx >= 0 ? cardIds[originalIdx] : card.cardId;
      // Use original cardId as key for frontend compatibility
      images[originalCardId] = card.imageUrl || "";
      // Extract booster pack code from package (e.g., "A1_genetic-apex" -> "A1")
      const boosterPackCode = card.package?.split("_")[0] || "";
      cardData[originalCardId] = {
        boosterPack: boosterPackCode,
        rarity: card.rarity || "Common",
      };
    });

    // Fill in missing cardIds with empty strings using original IDs
    cardIds.forEach((cardId) => {
      if (!images[cardId]) {
        console.warn(`[cards/images] Card not found: ${cardId}`);
        images[cardId] = "";
        cardData[cardId] = { boosterPack: "", rarity: "Common" };
      }
    });

    const result = { images, cardData };
    cacheManager.set(cachePrefix, result, CACHE_CONFIG.CACHE_20_TTL.TTL);

    return Response.json(result);
  } catch (error) {
    console.error("[cards/images] Error:", error);
    return Response.json({ images: {}, cardData: {} }, { status: 500 });
  }
}

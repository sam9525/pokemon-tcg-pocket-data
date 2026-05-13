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
      return Response.json({ images: {} });
    }

    const cardIds = cardIdsParam.split(",").filter(Boolean);

    const cachePrefix = `card_images_${cardIds.join("_")}_${language}`;
    const cached = cacheManager.get(cachePrefix);
    if (cached) {
      return Response.json(cached);
    }

    await connectDB();

    const cards = await Card.find({
      cardId: { $in: cardIds },
      language: language,
    });

    const images: Record<string, string> = {};
    cards.forEach((card) => {
      images[card.cardId] = card.imageUrl || "";
    });

    // Fill in missing cardIds with empty strings
    cardIds.forEach((cardId) => {
      if (!images[cardId]) {
        images[cardId] = "";
      }
    });

    const result = { images };
    cacheManager.set(cachePrefix, result, CACHE_CONFIG.CACHE_20_TTL.TTL);

    return Response.json(result);
  } catch (error) {
    console.error("[cards/images] Error:", error);
    return Response.json({ images: {} }, { status: 500 });
  }
}

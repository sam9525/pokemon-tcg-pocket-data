import { Card } from "@/models/Card";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";
import { buildCacheKey } from "@/utils/cacheKey";

const MAX_CARD_IDS = 500;
const CARD_ID_REGEX = /^[A-Za-z0-9_:.\-\s'♀♂()]{1,100}$/;
const LANGUAGE_REGEX = /^[A-Za-z0-9_-]{1,20}$/;

export async function GET(request: NextRequest) {
  // Rate-limit BEFORE any cache or DB work to prevent cache exhaustion.
  const rl = await rateLimit(request, API_RATE_LIMIT);
  if (!rl.success) return rl.response;

  try {
    const url = new URL(request.url);
    const cardIdsParam = url.searchParams.get("cardIds");
    const language = url.searchParams.get("language");

    if (!language || !LANGUAGE_REGEX.test(language)) {
      return Response.json({ error: "Invalid language" }, { status: 400 });
    }

    if (!cardIdsParam) {
      return Response.json({ images: {}, cardData: {} });
    }

    const cardIds = cardIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (cardIds.length === 0) {
      return Response.json({ images: {}, cardData: {} });
    }
    if (cardIds.length > MAX_CARD_IDS) {
      return Response.json({ error: "Too many cardIds" }, { status: 400 });
    }
    if (!cardIds.every((id) => CARD_ID_REGEX.test(id))) {
      return Response.json({ error: "Invalid cardId" }, { status: 400 });
    }

    const translatedCardIds = cardIds.map((cardId) =>
      cardId.includes("en_US") ? cardId.replace(/en_US/gi, language) : cardId,
    );

    // Sort + hash: order-independent, bounded-length cache key.
    const cachePrefix = buildCacheKey(
      ["card_images", language, ...translatedCardIds],
      { sort: true },
    );

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
      const originalIdx = translatedCardIds.indexOf(card.cardId);
      const originalCardId =
        originalIdx >= 0 ? cardIds[originalIdx] : card.cardId;
      images[originalCardId] = card.imageUrl || "";
      const boosterPackCode = card.package?.split("_")[0] || "";
      cardData[originalCardId] = {
        boosterPack: boosterPackCode,
        rarity: card.rarity || "Common",
      };
    });

    cardIds.forEach((cardId) => {
      if (!images[cardId]) {
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

import { Card } from "@/models/Card";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";
import { buildCacheKey } from "@/utils/cacheKey";

// Allow package codes (alphanumeric + dash) and booster codes (alphanumeric).
// Examples of valid ids: "A1_genetic-apex_mewtwo", "A2_legendary-guardians_pikachu-ex".
const ID_REGEX = /^[A-Za-z0-9-]{1,40}_[A-Za-z0-9-]{1,40}_[A-Za-z0-9-]{1,80}$/;
const MAX_ID_LENGTH = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResult = await rateLimit(request, API_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const url = new URL(request.url);
    const filterParam = url.searchParams.get("filter");
    const filters = filterParam
      ? filterParam.split(",").filter((f) => /^[A-Za-z0-9-]{1,40}$/.test(f))
      : [];
    const language = url.searchParams.get("language");
    if (!language || !/^[A-Za-z0-9_-]{1,20}$/.test(language)) {
      return Response.json({ error: "Invalid language" }, { status: 400 });
    }

    const { id } = await params;
    if (
      typeof id !== "string" ||
      id.length > MAX_ID_LENGTH ||
      !ID_REGEX.test(id)
    ) {
      return Response.json({ error: "Invalid id" }, { status: 400 });
    }

    const cachePrefix = buildCacheKey(
      ["cards", id, filters.join(","), language],
      { sort: false },
    );

    const cached = cacheManager.get(cachePrefix);
    if (cached) {
      return Response.json(cached);
    }

    await connectDB();

    const rarityMap: Record<string, string[]> = {
      pokemon: ["common", "uncommon", "rare"],
      "pokemon-ex": ["double rare"],
      "special-art": ["art rare", "super rare", "super art rare"],
      "real-art": ["immersive rare"],
      crown: ["ultra rare"],
    };

    const rarityFilters = [
      ...new Set(
        filters.flatMap(
          (filter) => rarityMap[filter as keyof typeof rarityMap] || [],
        ),
      ),
    ];

    const parts = id.split("_");
    const boosterPack = parts[1];
    const cards = await Card.find({
      package: parts[0] + "_" + parts[2],
      boosterPack: boosterPack,
      ...(rarityFilters.length > 0 && { rarity: { $in: rarityFilters } }),
      language: language,
    });

    const cardsMap = {
      cards: cards.map((card) => ({ id: card.cardId, url: card.imageUrl })),
    };

    cacheManager.set(cachePrefix, cardsMap, CACHE_CONFIG.CACHE_20_TTL.TTL);
    return Response.json(cardsMap);
  } catch (error) {
    // Log internally for ops, but do NOT leak error.message to clients.
    console.error("Error fetching cards:", error);
    return Response.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

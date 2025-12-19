import { Card } from "@/models/Card";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting to card queries
  const rateLimitResult = await rateLimit(request, API_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    // Get filter from URL search params
    const url = new URL(request.url);
    const filterParam = url.searchParams.get("filter");
    const filters = filterParam ? filterParam.split(",") : [];
    const language = url.searchParams.get("language");

    const cachePrefix = `cards_${(await params).id}_${filters.join(
      "_"
    )}_${language}`;

    // Get the response from the cache
    const cached = cacheManager.get(cachePrefix);

    // Check if the response is cached and not expired
    if (cached) {
      return Response.json(cached);
    }

    // Connect to MongoDB
    await connectDB();

    const rarityMap = {
      pokemon: ["common", "uncommon", "rare"],
      "pokemon-ex": ["double rare"],
      "special-art": ["art rare", "super rare", "super art rare"],
      "real-art": ["immersive rare"],
      crown: ["ultra rare"],
    };

    const rarityFilters = [
      ...new Set(
        filters.flatMap(
          (filter) => rarityMap[filter as keyof typeof rarityMap] || []
        )
      ),
    ];

    const { id } = await params;
    const parts = id.split("_");
    const isExtended = parts.length >= 3;
    const isPromo = parts[0] === "promo";
    const pkg = isPromo
      ? `${parts[0]}-${parts[1]}`
      : `${parts[0]}_${isExtended ? parts[2] : parts[1]}`;
    const boosterPack = isPromo
      ? pkg
      : isExtended
      ? parts[1]
      : parts[1].replace(/-/g, " ");

    const cards = await Card.find({
      package: pkg,
      boosterPack,
      language,
      ...(rarityFilters.length > 0 && { rarity: { $in: rarityFilters } }),
    });

    const cardsMap = {
      cards: cards.map((card) => ({ id: card.cardId, url: card.imageUrl })),
    };

    // Store the response in the cache
    cacheManager.set(cachePrefix, cardsMap, CACHE_CONFIG.CACHE_20_TTL.TTL);

    return Response.json(cardsMap);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return Response.json(
      {
        error: "Failed to fetch cards",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

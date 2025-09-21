import { Card } from "@/models/Card";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get filter from URL search params
    const url = new URL(request.url);
    const filterParam = url.searchParams.get("filter");
    const filters = filterParam ? filterParam.split(",") : [];

    const cachePrefix = `cards_${(await params).id}_${filters.join("_")}`;

    // Get the response from the cache
    const cached = cacheManager.get(cachePrefix);

    // Check if the response is cached and not expired
    if (cached) {
      return Response.json(cached);
    }

    // Create to mongoosedb
    await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
      console.error("Failed to connect to MongoDB:", err);
      throw new Error("Database connection failed");
    });

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
    const pack = id.split("_")[0] + "_" + id.split("_")[2];
    const boosterPack = id.split("_")[1];
    const cards = await Card.find({
      package: pack,
      boosterPack: boosterPack,
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

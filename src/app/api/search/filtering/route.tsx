import { Card } from "@/models/Card";
import mongoose from "mongoose";
import {
  TYPE_MAPPINGS,
  RARITY_MAPPINGS,
  PACKAGE_MAPPINGS,
  BOOSTER_MAPPINGS,
  SPECIFIC_EFFECT_MAPPINGS,
  FIGHT_ENERGY_MAPPINGS,
  WEAKNESS_MAPPINGS,
} from "@/utils/constants";

export async function POST(request: Request) {
  try {
    // Create to mongoosedb
    await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
      console.error("Failed to connect to MongoDB:", err);
      throw new Error("Database connection failed");
    });

    // Get filters from request body
    const filters = await request.json();
    const language = request.headers.get("language") as string;

    // Extract pagination parameters
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 100;
    const skip = (page - 1) * limit;

    // Build MongoDB query based on filters
    const query: Record<string, unknown> = {};
    query.language = language;

    // Handle types filter
    if (
      filters.types &&
      Array.isArray(filters.types) &&
      filters.types.length > 0
    ) {
      const mappedTypes = filters.types
        .map((type: string) => TYPE_MAPPINGS[type] || type)
        .filter(Boolean);

      if (mappedTypes.includes("item") || mappedTypes.includes("trainer")) {
        query.type = { $in: ["none"] };
        query.trainer = { $in: mappedTypes };
      } else if (mappedTypes.length > 0) {
        query.type = { $in: mappedTypes };
      }
    }

    // Handle rarity filter
    if (
      filters.rarity &&
      Array.isArray(filters.rarity) &&
      filters.rarity.length > 0
    ) {
      const mappedRarity = filters.rarity
        .flatMap((rarity: string) => RARITY_MAPPINGS[rarity] || rarity)
        .filter(Boolean);

      if (mappedRarity.length > 0) {
        query.rarity = { $in: mappedRarity };
      }
    }

    // Handler function
    function handleFilter(
      filterKey: string,
      queryKey: string,
      mappings: Record<string, string>
    ) {
      if (filters[filterKey] && filters[filterKey].length > 0) {
        const mappedFilter = filters[filterKey]
          .map((search: string) => mappings[search] || search)
          .filter(Boolean);

        if (mappedFilter.length > 0) {
          query[queryKey] = { $in: mappedFilter };
        }
      }
    }

    // Iterating over filter definitions
    const filterConfigs = [
      {
        filterKey: "package_icons",
        queryKey: "package",
        mappings: PACKAGE_MAPPINGS[language],
      },
      {
        filterKey: "Boosters_icon",
        queryKey: "boosterPack",
        mappings: BOOSTER_MAPPINGS[language],
      },
      {
        filterKey: "specific_effect",
        queryKey: "specificEffect",
        mappings: SPECIFIC_EFFECT_MAPPINGS,
      },
      {
        filterKey: "fight_energy",
        queryKey: "fightEnergy",
        mappings: FIGHT_ENERGY_MAPPINGS,
      },
      {
        filterKey: "weakness",
        queryKey: "weakness",
        mappings: WEAKNESS_MAPPINGS,
      },
    ];

    for (const { filterKey, queryKey, mappings } of filterConfigs) {
      handleFilter(filterKey, queryKey, mappings);
    }

    // Get total count for pagination
    const totalCount = await Card.countDocuments(query);

    // Get paginated results
    const cards = await Card.find(query).skip(skip).limit(limit);

    const transformedCards = cards.map((card) => ({
      id: card.cardId,
      url: card.imageUrl,
    }));

    // Calculate if there are more results
    const hasMore = skip + cards.length < totalCount;

    return Response.json({
      results: transformedCards,
      hasMore: hasMore,
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
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

import { Card } from "@/models/Card";
import mongoose from "mongoose";
import {
  TYPE_MAPPINGS,
  RARITY_MAPPINGS,
  PACKAGE_MAPPINGS,
  BOOSTER_MAPPINGS,
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

      console.log(mappedRarity);
      if (mappedRarity.length > 0) {
        query.rarity = { $in: mappedRarity };
      }
    }

    // Handle package filter
    if (filters.package_icons && filters.package_icons.length > 0) {
      const mappedPackageIcons = filters.package_icons
        .map((icon: string) => PACKAGE_MAPPINGS[language][icon] || icon)
        .filter(Boolean);

      if (mappedPackageIcons.length > 0) {
        query.package = { $in: mappedPackageIcons };
      }
    }

    // Handle booster filter
    if (filters.Boosters_icon && filters.Boosters_icon.length > 0) {
      const mappedBoosterIcon = filters.Boosters_icon.map(
        (icon: string) => BOOSTER_MAPPINGS[language][icon] || icon
      ).filter(Boolean);

      if (mappedBoosterIcon.length > 0) {
        query.boosterPack = { $in: mappedBoosterIcon };
      }
    }

    const cards = await Card.find(query);

    const transformedCards = cards.map((card) => ({
      id: card.cardId,
      url: card.imageUrl,
    }));

    return Response.json(transformedCards);
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

import { Card } from "@/models/Card";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Create to mongoosedb
    await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
      console.error("Failed to connect to MongoDB:", err);
      throw new Error("Database connection failed");
    });

    // Get filter from URL search params
    const url = new URL(request.url);
    const filterParam = url.searchParams.get("filter");
    const filters = filterParam ? filterParam.split(",") : [];

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

    return Response.json({
      cards: cards.map((card) => ({ id: card.cardId, url: card.imageUrl })),
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return Response.json(
      {
        error: "Failed to fetch package files",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

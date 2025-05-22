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

    const pack = params.id.split("_")[0] + "_" + params.id.split("_")[2];
    const boosterPack = params.id.split("_")[1];
    const cards = await Card.find({
      package: pack,
      boosterPack: boosterPack,
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

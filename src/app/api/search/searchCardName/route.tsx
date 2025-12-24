import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { Card } from "@/models/Card";

export async function POST(request: NextRequest) {
  // Connect to MongoDB
  await connectDB();

  const body = await request.json();
  const cardName = body.cardName;

  const res = await Card.find({
    name: { $regex: cardName || "", $options: "i" },
  });

  const transformedCards = res.map((card) => ({
    id: card.cardId,
    url: card.imageUrl,
  }));

  return Response.json({ results: transformedCards });
}

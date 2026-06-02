import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { Card } from "@/models/Card";
import { rateLimit } from "@/lib/rateLimit";
import { SEARCH_RATE_LIMIT } from "@/utils/rateLimitConfig";

export async function POST(request: NextRequest) {
  // 1. Add rate limiting
  const rateLimitResult = await rateLimit(request, SEARCH_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  await connectDB();

  const body = await request.json();

  // Validate cardName: must be a string if provided. Reject other types
  // outright rather than letting .replace throw a 500.
  if (body.cardName !== undefined && typeof body.cardName !== "string") {
    return Response.json(
      { error: "cardName must be a string" },
      { status: 400 },
    );
  }
  const cardName: string = body.cardName ?? "";

  // Coerce pagination; ignore non-finite values by falling back to defaults.
  const rawLimit = Number(body.limit);
  const rawSkip = Number(body.skip);
  let limit = Number.isFinite(rawLimit) ? rawLimit : 100;
  let skip = Number.isFinite(rawSkip) ? rawSkip : 0;

  // 2. Enforce pagination limits
  limit = Math.min(Math.max(1, limit), 100);
  skip = Math.max(0, skip);

  // 3. Escape regex special characters
  const escapedCardName = cardName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 4. Get total count for pagination
  const totalCount = await Card.countDocuments({
    name: { $regex: escapedCardName, $options: "i" },
  });

  // 5. Find with pagination
  const res = await Card.find({
    name: { $regex: escapedCardName, $options: "i" },
  })
    .skip(skip)
    .limit(limit);

  const transformedCards = res.map((card) => ({
    id: card.cardId,
    url: card.imageUrl,
  }));

  // 6. Return results with pagination info
  return Response.json({
    results: transformedCards,
    total: totalCount,
    hasMore: skip + limit < totalCount,
  });
}

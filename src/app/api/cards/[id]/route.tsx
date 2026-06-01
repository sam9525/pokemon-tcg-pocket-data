import { Card } from "@/models/Card";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import connectDB from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { API_RATE_LIMIT } from "@/utils/rateLimitConfig";
import { createHash } from "crypto";

const ALLOWED_LANGUAGES = new Set([
  "en_US",
  "ja_JP",
  "zh_TW",
  "zh_CN",
  "ko_KR",
  "fr_FR",
  "de_DE",
  "es_ES",
  "it_IT",
  "pt_BR",
  "th_TH",
]);

const FILTER_PATTERN = /^[a-zA-Z0-9,_-]+$/;
const MAX_FILTER_LEN = 128;
const MAX_LANGUAGE_LEN = 16;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Rate limiting to card queries
  const rateLimitResult = await rateLimit(request, API_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    // Get filter from URL search params
    const url = new URL(request.url);
    const filterParam = url.searchParams.get("filter") ?? "";
    const language = url.searchParams.get("language") ?? "";

    // C2: bound and validate input to prevent cache key thrashing
    if (filterParam.length > MAX_FILTER_LEN) {
      return Response.json({ error: "filter param too long" }, { status: 400 });
    }
    if (filterParam.length > 0 && !FILTER_PATTERN.test(filterParam)) {
      return Response.json(
        { error: "filter param contains invalid characters" },
        { status: 400 },
      );
    }
    if (language.length > MAX_LANGUAGE_LEN) {
      return Response.json(
        { error: "language param too long" },
        { status: 400 },
      );
    }
    if (language.length > 0 && !ALLOWED_LANGUAGES.has(language)) {
      return Response.json({ error: "unsupported language" }, { status: 400 });
    }

    const filters = filterParam ? filterParam.split(",") : [];
    const { id } = await params;

    // Hash the cache key so unique long inputs cannot bloat Map keys
    const cachePrefix = `cards_${createHash("sha1")
      .update(`${id}|${filters.join(",")}|${language}`)
      .digest("hex")}`;

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
          (filter) => rarityMap[filter as keyof typeof rarityMap] || [],
        ),
      ),
    ];

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

    const query: Record<string, unknown> = { package: pkg };
    if (isExtended && boosterPack) {
      query.boosterPack = boosterPack;
    }
    if (language) {
      query.language = language;
    }
    if (rarityFilters.length > 0) {
      query.rarity = { $in: rarityFilters };
    }

    const cards = await Card.find(query);

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
        details: "An error occurred. Please try again.",
      },
      { status: 500 },
    );
  }
}

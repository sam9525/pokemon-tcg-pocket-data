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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; language: string }> }
) {
  try {
    const { id: packageId, language } = await params;

    // Check if request body is valid
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return Response.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { id, url } = body;

    // Validate required fields
    if (!id || !url) {
      return Response.json(
        { success: false, error: "Missing required fields: id and url" },
        { status: 400 }
      );
    }

    await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
      console.error("Failed to connect to MongoDB:", err);
      throw new Error("Database connection failed");
    });

    // Parse image name with error handling
    const baseUrl = `${process.env.S3_URL}Booster-Pack/${packageId}/${language}`;
    const image_name = url.replace(baseUrl, "");

    const parts = image_name.split("_");
    if (parts.length < 10) {
      return Response.json(
        { success: false, error: "Invalid image name format" },
        { status: 400 }
      );
    }
    const card_id = parts[2];
    const card_name = parts[4];
    // Extract card package from packageId
    const card_package = `${packageId.split("_")[0]}_${
      packageId.split("_")[2]
    }`;

    const path = `../../../../cards-list/${packageId.split("_")[0]}.json`;
    let card_list;
    try {
      const importedModule = await import(path);
      card_list = importedModule.default || importedModule;
    } catch (error) {
      console.error("Failed to import card list:", error);
      return Response.json(
        { success: false, error: "Card list not found" },
        { status: 404 }
      );
    }

    // Find the card type by searching through all booster packs
    let card_type = null;
    const card_booster_pack: string[] = [];

    // Search for card type and booster pack in one loop
    for (const [boosterName, boosterPack] of Object.entries(card_list)) {
      for (const [type, cards] of Object.entries(
        boosterPack as Record<string, string[]>
      )) {
        if (Array.isArray(cards) && cards.includes(card_id)) {
          card_type = type;
          card_booster_pack.push(boosterName);
        }
      }
    }

    // Map trainer types
    const trainer = `${parts[0]}_${parts[1]}`;
    const trainerMap = {
      cPK_10: "pokemon",
      cPK_20: "pokemon",
      cPK_90: "pokemon",
      cTR_10: "trainer",
      cTR_20: "trainer",
      cTR_90: "item",
    };
    let card_trainer = trainerMap[trainer as keyof typeof trainerMap] || "";

    // Map rarity types
    const rarity = parts[5];
    const rarityMap = {
      C: "common",
      U: "uncommon",
      R: "rare",
      RR: "double rare",
      AR: "art rare",
      SR: "super rare",
      SAR: "super art rare",
      IM: "immersive rare",
      UR: "ultra rare",
      S: "shiny",
      SSR: "shiny super rare",
    };
    const card_rarity =
      rarityMap[rarity as keyof typeof rarityMap] || "unknown";

    const card_language = parts[8] + "_" + parts[9].split(".")[0];

    let special_effect = "none";
    let fight_energy = card_type || "colorless";

    const weaknessMap = {
      grass: "fire",
      fire: "water",
      water: "lightning",
      lightning: "fighting",
      psychic: "darkness",
      fighting: "grass",
      darkness: "fighting",
      metal: "fire",
      colorless: "fighting",
    };

    let weakness = weaknessMap[card_type as keyof typeof weaknessMap] || "none";

    // Check if card already exists
    const existingCard = await Card.findOne({ cardId: id });
    if (existingCard) {
      // Check if any of the booster packs are not already in the existing card
      const newBoosterPacks = card_booster_pack.filter(
        (pack) => !existingCard.boosterPack.includes(pack)
      );

      if (newBoosterPacks.length > 0) {
        // Add new booster packs to the existing card
        existingCard.boosterPack = [
          ...existingCard.boosterPack,
          ...newBoosterPacks,
        ];
        await existingCard.save();
      }
      return Response.json({ success: true, card: existingCard });
    }

    // Read json file for special cards
    const special_path = `../../../../cards-list/${
      packageId.split("_")[0]
    }_special.json`;
    let special_card_list;
    try {
      const importedSpecialModule = await import(special_path);
      special_card_list =
        importedSpecialModule.default || importedSpecialModule;
    } catch {
      console.log("No special cards file found, using regular card logic");
      special_card_list = null;
    }

    // Check for special cards
    let isSpecialCard = false;
    let specialCardData = null;

    if (special_card_list) {
      // Search for the card in the special cards data
      for (const [, pokemonCards] of Object.entries(special_card_list)) {
        // Check for special Pokemon cards (charizard, mewtwo, pikachu)
        for (const [specialCardId, cardData] of Object.entries(
          pokemonCards as Record<string, Record<string, string>>
        )) {
          if (specialCardId === card_id || specialCardId === card_name) {
            isSpecialCard = true;
            specialCardData = cardData;
            break;
          }
        }
        if (isSpecialCard) break;
      }
    }

    // Use special card data if found
    if (isSpecialCard && specialCardData) {
      card_type = specialCardData.type;
      card_trainer = specialCardData.trainer;
      special_effect = specialCardData.special_effect;
      fight_energy = specialCardData.fight_energy;
      weakness = specialCardData.weakness;
      if (specialCardData.boosterPack) {
        Object.assign(card_booster_pack, specialCardData.boosterPack);
      }
    }

    // Ensure we have required values
    if (!card_type) {
      card_type = "colorless";
    }
    if (!card_trainer) {
      card_trainer = "pokemon";
    }

    const card = await Card.create({
      cardId: id,
      name: card_name,
      type: card_type,
      package: card_package,
      boosterPack: card_booster_pack,
      trainer: card_trainer,
      rarity: card_rarity,
      specialEffect: special_effect,
      fightEnergy: fight_energy,
      weakness: weakness,
      language: card_language,
      imageUrl: url,
    });

    return Response.json({ success: true, card });
  } catch (error) {
    console.error("Error creating card:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to create card",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

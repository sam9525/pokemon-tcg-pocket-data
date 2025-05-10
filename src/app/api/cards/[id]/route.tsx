import { ListObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { Card } from "@/models/Card";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Create a new S3 client
    const s3Client = new S3Client({
      region: "ap-southeast-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET_KEY as string,
      },
    });

    const bucket = "pokemon-tcg-pocket-data";

    // Construct the prefix path using the id parameter
    const prefix = `Booster-Pack/${params.id}/zh_TW/`;

    // List objects in the specified folder
    const command = new ListObjectsCommand({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    console.log("test");

    if (!response.Contents || response.Contents.length === 0) {
      return Response.json(
        {
          success: false,
          message: "No files found for the specified package",
        },
        { status: 404 }
      );
    }

    const files = response.Contents.map((item) => {
      if (!item.Key) return null;

      const fileName = item.Key.split("/").pop() || "";
      const id = fileName.split(".")[0];

      return {
        id,
        url: `https://${bucket}.s3.ap-southeast-2.amazonaws.com/${item.Key}`,
      };
    }).filter(Boolean);

    return Response.json({ files });
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
  { params }: { params: { id: string } }
) {
  try {
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

    await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
      console.error("Failed to connect to MongoDB:", err);
      throw new Error("Database connection failed");
    });

    // Parse image name with error handling
    const image_name = url.replace(
      "https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/Booster-Pack/A1_charizard_genetic-apex/zh_TW/",
      ""
    );

    const parts = image_name.split("_");
    if (parts.length < 10) {
      return Response.json(
        { success: false, error: "Invalid image name format" },
        { status: 400 }
      );
    }
    const card_id = parts[2];
    const card_name = parts[4];
    // Extract card package from params.id
    const card_package = `${params.id.split("_")[0]}_${
      params.id.split("_")[2]
    }`;

    const path = `../../../../cards-list/${params.id.split("_")[0]}.json`;
    const card_list = await import(path);

    // Find the card type by searching through all booster packs
    let card_type = null;
    let card_booster_pack = null;

    // Search for card type and booster pack in one loop
    for (const [boosterName, boosterPack] of Object.entries(card_list)) {
      for (const [type, cards] of Object.entries(
        boosterPack as Record<string, string[]>
      )) {
        if (cards.includes(card_id)) {
          card_type = type;
          card_booster_pack = boosterName;
          break;
        }
      }
      if (card_type) break;
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
    const card_trainer = trainerMap[trainer as keyof typeof trainerMap] || "";

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

    // Check if card already exists
    const existingCard = await Card.findOne({ cardId: id });
    if (existingCard) {
      return Response.json(
        {
          success: false,
          error: "Card with this ID already exists",
        },
        { status: 400 }
      );
    }

    const card = await Card.create({
      cardId: id,
      name: card_name,
      type: card_type,
      package: card_package,
      boosterPack: card_booster_pack,
      trainer: card_trainer,
      rarity: card_rarity,
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

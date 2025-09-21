import { Package } from "@/models/Package";
import mongoose from "mongoose";

let isConnected = false;

export async function GET(request: Request) {
  if (!isConnected) {
    await mongoose.connect(process.env.MONGO_URL as string);
    isConnected = true;
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const language = searchParams.get("language");

    const packageInDB = await Package.findOne({ code, language });

    if (!packageInDB) {
      return Response.json({ packageInDB: false });
    }

    return Response.json({ packageInDB });
  } catch (error) {
    console.error("Error getting package in DB", error);
  }
}

export async function POST(request: Request) {
  if (!isConnected) {
    await mongoose.connect(process.env.MONGO_URL as string);
    isConnected = true;
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const language = searchParams.get("language");

    const packageInDB = await Package.create({
      code,
      language,
      inDatabase: true,
    });

    return Response.json({ packageInDB });
  } catch (error) {
    console.error("Error creating package in DB", error);
  }
}

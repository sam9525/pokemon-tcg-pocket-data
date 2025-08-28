import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET() {
  // Create to mongoosedb
  await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    throw new Error("Database connection failed");
  });

  // Find all users
  const users = await User.find({});

  return Response.json({ users });
}

import mongoose from "mongoose";
import { auth } from "@/../auth";
import { User } from "@/app/models/User";

export async function GET(req: Request) {
  // Connecting to database
  await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    throw new Error("Database connection failed");
  });

  const url = new URL(req.url);
  const _id = url.searchParams.get("_id");
  let filterUser = {};

  if (_id) {
    filterUser = { _id };
  } else {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    filterUser = { email };
  }

  const user = await User.findOne(filterUser).lean();

  return Response.json(user);
}

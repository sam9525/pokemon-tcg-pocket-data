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

  // If _id is provided, update the user with the given _id otherwise use the email from the session
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

  // Get the user with the given filter
  const user = await User.findOne(filterUser).lean();

  return Response.json(user);
}

export async function PUT(req: Request) {
  // Connecting to database
  await mongoose.connect(process.env.MONGO_URL as string).catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    throw new Error("Database connection failed");
  });

  const data = await req.json();
  const { _id, name, image } = data;

  let filterUser = {};

  // If _id is provided, update the user with the given _id otherwise use the email from the session
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

  // Update the user with the given name and image
  await User.updateOne(filterUser, { $set: { name, image } });

  return Response.json({ message: "User updated" }, { status: 200 });
}

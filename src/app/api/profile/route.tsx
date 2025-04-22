import mongoose from "mongoose";
import { auth } from "@/../auth";
import { User } from "@/app/models/User";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function DELETE(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return Response.json({ error: "No URL provided" }, { status: 400 });
    }

    // Skip deletion if it's the default avatar
    if (url.includes("avatar.jpg")) {
      return Response.json({ message: "Default avatar cannot be deleted" });
    }

    // Extract the key from the URL
    const key = url.split(".com/")[1];
    if (!key) {
      return Response.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Create a new S3 client
    const s3Client = new S3Client({
      region: "ap-southeast-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET_KEY as string,
      },
    });

    const bucket = "pokemon-tcg-pocket-data";

    // Delete the file from S3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    return Response.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

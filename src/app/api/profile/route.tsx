import connectDB from "@/lib/mongodb";
import { auth } from "@/../auth";
import { User } from "@/models/User";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, S3_BUCKET } from "@/lib/s3Client";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { PROFILE_RATE_LIMIT } from "@/utils/rateLimitConfig";

export async function GET(req: NextRequest) {
  // Rate limiting to profile GET requests
  const rateLimitResult = await rateLimit(req, PROFILE_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Auth check first - before any _id parameter handling
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Connect to MongoDB
  await connectDB();

  const url = new URL(req.url);
  const requestedId = url.searchParams.get("_id");

  // Admin can view any profile via _id, otherwise only own profile
  let filterUser: Record<string, string>;
  if (requestedId && session.user.isAdmin) {
    filterUser = { _id: requestedId };
  } else {
    filterUser = { email: session.user.email };
  }

  // Get the user with the given filter
  const user = await User.findOne(filterUser).lean();

  return Response.json(user || null);
}

export async function PUT(req: NextRequest) {
  // Rate limiting to profile PUT requests
  const rateLimitResult = await rateLimit(req, PROFILE_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Auth check first - before any _id parameter handling
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Connect to MongoDB
  await connectDB();

  const data = await req.json();
  const { _id, name, image } = data;

  // Admin can update any profile via _id, otherwise only own profile
  let filterUser: Record<string, string>;
  if (_id && session.user.isAdmin) {
    filterUser = { _id };
  } else {
    filterUser = { email: session.user.email };
  }

  // Update the user with the given name and image
  await User.updateOne(filterUser, { $set: { name, image } });

  return Response.json({ message: "User updated" }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  // Apply rate limiting to profile DELETE requests
  const rateLimitResult = await rateLimit(req, PROFILE_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }
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

    const s3Client = getS3Client();

    // Delete the file from S3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );

    return Response.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

import connectDB from "@/lib/mongodb";
import { auth } from "@/../auth";
import { User } from "@/models/User";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, S3_BUCKET } from "@/lib/s3Client";

export async function GET(req: Request) {
  // Connect to MongoDB
  await connectDB();

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
  // Connect to MongoDB
  await connectDB();

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

    const s3Client = getS3Client();

    // Delete the file from S3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );

    return Response.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

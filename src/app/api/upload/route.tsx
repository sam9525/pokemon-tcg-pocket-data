import { PutObjectCommand } from "@aws-sdk/client-s3";
import uniqid from "uniqid";
import { getS3Client, S3_BUCKET } from "@/lib/s3Client";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const s3Client = getS3Client();

    // Get the extension of the file
    const ext = file.name.split(".").slice(-1)[0];
    // Create a new file name
    const newFileName = uniqid() + "." + ext;

    // Convert file to buffer using arrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bucket = S3_BUCKET;

    // Upload the file to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: "Avatar/" + newFileName,
        ACL: "public-read",
        ContentType: file.type,
        Body: buffer,
      })
    );

    // Create a new link
    const link =
      "https://" +
      bucket +
      ".s3.ap-southeast-2.amazonaws.com/Avatar/" +
      newFileName;

    return Response.json({ url: link });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

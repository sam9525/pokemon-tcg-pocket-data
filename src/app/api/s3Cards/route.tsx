import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3";
import connectDB from "@/lib/mongodb";
import { Card } from "@/models/Card";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import { cacheManager } from "@/utils/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const packageId = searchParams.get("packageId");
  const language = searchParams.get("language");

  const cachePrefix = `${packageId}_${language}`;

  // Get the response from the cache
  const cached = cacheManager.get(cachePrefix);

  // Check if the response is cached and not expired
  if (cached) {
    return Response.json(cached);
  }

  // Create a new S3 client
  const s3Client = new S3Client({
    region: "ap-southeast-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY as string,
      secretAccessKey: process.env.AWS_SECRET_KEY as string,
    },
  });

  try {
    // Fetch cards
    const bucket = "pokemon-tcg-pocket-data";

    // Construct the prefix path using the id parameter
    const prefix = `Booster-Pack/${packageId}/${language}/`;

    // List objects in the specified folder
    const command = new ListObjectsCommand({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    // Check if no files are found
    if (!response.Contents || response.Contents.length === 0) {
      return Response.json(
        {
          success: false,
          message: "No files found for the specified package",
        },
        { status: 404 }
      );
    }

    // Find all files in the specified folder
    const files = response.Contents.filter((item) => item.Key).map((item) => {
      const fileName = item.Key?.split("/").pop() || "";
      const id = fileName.split(".")[0];

      return {
        id,
        url: `https://${bucket}.s3.ap-southeast-2.amazonaws.com/${item.Key}`,
      };
    });

    const result = {
      success: true,
      files,
    };

    // Store the response in the cache
    cacheManager.set(cachePrefix, result, CACHE_CONFIG.CACHE_10_TTL.TTL);

    return Response.json(result);
  } catch (error) {
    console.error(error);
  }
}

export async function POST(request: Request) {
  // Connect to MongoDB
  await connectDB();

  const data = await request.json();

  const { preprocessedCards } = data;

  // Post to the database
  await Card.insertMany(preprocessedCards);

  return Response.json({
    success: true,
    message: "Card created",
  });
}

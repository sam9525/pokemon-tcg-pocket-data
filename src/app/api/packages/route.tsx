import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import { ListObjectsCommand, S3Client } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    const cachePrefix = "packages";

    // Get the response from the cache
    const cached = cacheManager.get(cachePrefix);

    // Check if the response is cached and not expired
    if (cached) {
      return Response.json({ packages: cached });
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

    // List objects in the cards folder
    const command = new ListObjectsCommand({
      Bucket: bucket,
      Prefix: "Package/",
    });

    const response = await s3Client.send(command);
    const packages = response.Contents?.map((item) => {
      const key = item.Key;
      const id = key?.split("/")[1].split(".")[0];
      const url = `https://${bucket}.s3.ap-southeast-2.amazonaws.com/${item.Key}`;

      return {
        id: id,
        url: url,
      };
    });

    // Store the response in the cache
    cacheManager.set(cachePrefix, packages, CACHE_CONFIG.CACHE_20_TTL.TTL);

    // Return a success response
    return Response.json({ packages });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return Response.json(
      {
        error: "Failed to fetch packages",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

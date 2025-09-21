import { ListObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";

const ListObjects = async (
  s3Client: S3Client,
  bucket: string,
  prefix: string,
  language: string
) => {
  const command = new ListObjectsCommand({
    Bucket: bucket,
    Prefix: prefix,
  });
  const response = await s3Client.send(command);

  const filteredContents =
    response.Contents?.filter((item) => item.Key?.includes(language)) || [];
  return filteredContents.map((item) => {
    const key = item.Key;
    const id = key?.split("/")[1].split(".")[0];
    const url = `https://${bucket}.s3.ap-southeast-2.amazonaws.com/${item.Key}`;

    return {
      id: id,
      url: url,
    };
  });
};

export async function GET() {
  try {
    const cachePrefix = "search";

    // Get the response from the cache
    const cached = cacheManager.get(cachePrefix);

    // Check if the response is cached and not expired
    if (cached) {
      return Response.json(cached);
    }

    // Connect to s3
    const s3Client = new S3Client({
      region: "ap-southeast-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET_KEY as string,
      },
    });

    const bucket = "pokemon-tcg-pocket-data";

    // Fetch all resources in parallel
    const [types, rarity, package_icons, Boosters_icon, specific_effect] =
      await Promise.all([
        ListObjects(s3Client, bucket, "Types/", ""),
        ListObjects(s3Client, bucket, "Rarity/", ""),
        ListObjects(s3Client, bucket, "Packages-Title-Icon/", "zh_TW"),
        ListObjects(s3Client, bucket, "Booster-Pack-Icon/", "zh_TW"),
        ListObjects(s3Client, bucket, "Special-Effect/", ""),
      ]);

    const result = {
      types,
      rarity,
      package_icons,
      Boosters_icon,
      specific_effect,
    };

    // Store the response in the cache
    cacheManager.set(cachePrefix, result, CACHE_CONFIG.CACHE_20_TTL.TTL);

    return Response.json(result);
  } catch (error) {
    console.error("Error fetching types icon:", error);
    return Response.json(
      {
        error: "Failed to fetch types icon",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

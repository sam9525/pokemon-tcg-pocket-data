import { GetObjectCommand } from "@aws-sdk/client-s3";
import { cacheManager } from "@/utils/cache";
import { CACHE_CONFIG } from "@/utils/cacheConfig";
import { getS3Client, S3_BUCKET } from "@/lib/s3Client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "en_US";

    const cachePrefix = `packages_metadata_${language}`;

    // Get the response from the cache
    const cached = cacheManager.get(cachePrefix);

    // Check if the response is cached and not expired
    if (cached) {
      return Response.json({ packages: cached });
    }

    const s3Client = getS3Client();
    const bucket = S3_BUCKET;

    // Fetch Card-List-Json/package-metadata.json from S3
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: "Card-List-Json/package-metadata.json",
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return Response.json(
        { error: "Metadata file not found" },
        { status: 404 },
      );
    }

    // Parse the JSON body
    const bodyContents = await response.Body.transformToString();
    const allMetadata: Record<string, Record<string, string>> = JSON.parse(
      bodyContents,
    );

    // Convert to array format with localized names
    const packages = Object.entries(allMetadata).map(([id, names]) => ({
      id,
      name: names[language] || names["en_US"] || id,
    }));

    // Sort by id
    packages.sort((a, b) => a.id.localeCompare(b.id));

    // Store the response in the cache
    cacheManager.set(cachePrefix, packages, CACHE_CONFIG.CACHE_20_TTL.TTL);

    return Response.json({ packages });
  } catch (error) {
    console.error("Error fetching packages metadata:", error);
    return Response.json(
      {
        error: "Failed to fetch packages metadata",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

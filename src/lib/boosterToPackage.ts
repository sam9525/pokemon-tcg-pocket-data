import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, S3_BUCKET } from "@/lib/s3Client";
import { cacheManager } from "@/utils/cache";

const BOOSTER_TO_PACKAGE_KEY = "Card-List-Json/booster-to-package.json";
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes in ms

let cachedMapping: Record<string, string> | null = null;

export async function getBoosterToPackageMapping(): Promise<
  Record<string, string>
> {
  // Return cached version if available
  if (cachedMapping) {
    return cachedMapping;
  }

  // Check in-memory cache manager
  const cached = cacheManager.get<Record<string, string>>("booster_to_package");
  if (cached) {
    cachedMapping = cached;
    return cached;
  }

  const s3Client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: BOOSTER_TO_PACKAGE_KEY,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("Failed to fetch booster-to-package mapping from S3");
  }

  const bodyContents = await response.Body.transformToString();
  const mapping: Record<string, string> = JSON.parse(bodyContents);

  // Cache the result
  cachedMapping = mapping;
  cacheManager.set("booster_to_package", mapping, CACHE_TTL);

  return mapping;
}

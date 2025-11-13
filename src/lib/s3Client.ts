import { S3Client } from "@aws-sdk/client-s3";

const AWS_REGION = "ap-southeast-2";

// Singleton S3 client instance
let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "Please define AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
    );
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3ClientInstance;
}

// Export bucket name constant
export const S3_BUCKET = "pokemon-tcg-pocket-data";

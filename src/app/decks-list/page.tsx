import type { Metadata } from "next";
import DecksListClient from "./DecklistPageClient";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, S3_BUCKET } from "@/lib/s3Client";

async function getFirstPackageId(): Promise<string> {
  try {
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: "Card-List-Json/package-metadata.json",
    });
    const response = await s3Client.send(command);
    if (!response.Body) return "A1_Genetic-Apex";

    const bodyContents = await response.Body.transformToString();
    const allMetadata: Record<string, Record<string, string>> = JSON.parse(
      bodyContents,
    );
    const packages = Object.keys(allMetadata);
    return packages[0] || "A1_Genetic-Apex";
  } catch {
    return "A1_Genetic-Apex";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const packageId = await getFirstPackageId();
  const packageName = packageId.replace(/_/g, " ").replace(/-/g, " ");

  return {
    title: `${packageName} Deck Lists`,
    description: `Browse ${packageName} deck lists for Pokemon TCG Pocket.`,
    openGraph: {
      title: `${packageName} Deck Lists | Pokemon TCG Pocket Data`,
      description: `Browse ${packageName} deck lists for Pokemon TCG Pocket.`,
    },
  };
}

export default async function DecksList() {
  const language = "en_US";
  const firstPackage = await getFirstPackageId();

  const response = await fetch(
    `${process.env.AUTH_URL}/api/decks-list?packages=${firstPackage}&language=${language}`,
    {
      cache: "no-cache",
    },
  );
  const data = await response.json();

  return <DecksListClient defaultDeckList={data.decklists} />;
}

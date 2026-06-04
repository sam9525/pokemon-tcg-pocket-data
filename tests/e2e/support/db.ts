// tests/e2e/support/db.ts
import fsSync from "node:fs";
import mongoose from "mongoose";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { User } from "../../../src/models/User";
import { UserDeck } from "../../../src/models/UserDeck";
import { Card } from "../../../src/models/Card";

/** Dedicated test DB. Name MUST contain "test" — guarded below. */
export const TEST_MONGO_URL =
  process.env.E2E_MONGO_URL || "mongodb://127.0.0.1:27017/pokemon_e2e_test";

/** Identity baked into the JWT cookie AND seeded into Mongo. Keep in sync. */
export const SEED_USER = {
  name: "E2E Tester",
  email: "e2e-tester@example.com",
  isAdmin: false,
};
export const SEED_ADMIN = {
  name: "E2E Admin",
  email: "e2e-admin@example.com",
  isAdmin: true,
};

export const SEED_LANGUAGE = "en_US";

/** Mirror of the package-id → query-package derivation in /api/cards/[id]. */
export function deriveQueryPackage(packageId: string): string {
  const parts = packageId.split("_");
  const isPromo = parts[0] === "promo";
  const isExtended = parts.length >= 3;
  if (isPromo) return `${parts[0]}-${parts[1]}`;
  return `${parts[0]}_${isExtended ? parts[2] : parts[1]}`;
}

/** Read the real (read-only) package metadata from S3 to learn the first id. */
async function fetchFirstPackageId(): Promise<string> {
  const region = process.env.AWS_REGION || "ap-southeast-2";
  const bucket = process.env.S3_BUCKET || "pokemon-tcg-pocket-data";
  const s3 = new S3Client({ region });
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: "Card-List-Json/package-metadata.json",
    }),
  );
  const body = await res.Body!.transformToString();
  const meta = JSON.parse(body) as Record<string, Record<string, string>>;
  const first = Object.keys(meta)[0];
  if (!first) throw new Error("No packages found in S3 package-metadata.json");
  return first;
}

function guardTestUri(uri: string): void {
  if (!/test/i.test(uri)) {
    throw new Error(
      `Refusing to seed: MONGO_URL "${uri}" does not look like a test DB ` +
        `(must contain "test"). Set E2E_MONGO_URL to a dedicated test database.`,
    );
  }
}

export async function connectTestDb(): Promise<void> {
  guardTestUri(TEST_MONGO_URL);
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URL, { bufferCommands: false });
  }
}

/** Wipe ONLY suite-owned collections. NEVER deletes Card — the restored real
 *  catalog is expensive and shared across runs. */
export async function cleanUserData(): Promise<void> {
  guardTestUri(TEST_MONGO_URL);
  await Promise.all([User.deleteMany({}), UserDeck.deleteMany({})]);
}

export interface SeedResult {
  packageId: string; // real first package id (used by the grid by default)
  cardIds: string[]; // seeded card ids under that package
  userId: string; // seeded SEED_USER _id
  adminId: string; // seeded SEED_ADMIN _id
  deckId: string; // a deck owned by SEED_USER (version 1)
  deckVersion: number;
}

/** Seed suite-owned data ON TOP OF the restored real catalog. Wipes
 *  users/decks (not Card), verifies the catalog is present, and builds a deck
 *  from two real cards under the first package. */
export async function seedTestDb(): Promise<SeedResult> {
  await connectTestDb();
  await cleanUserData();

  const packageId = await fetchFirstPackageId();
  const pkg = deriveQueryPackage(packageId);

  // Require the real catalog to have been restored (see Prerequisites).
  const realCards = (await Card.find({ package: pkg, language: SEED_LANGUAGE })
    .select("cardId")
    .limit(2)
    .lean()) as unknown as { cardId: string }[];
  if (realCards.length < 2) {
    throw new Error(
      `Test catalog missing: found ${realCards.length} cards for package ` +
        `"${pkg}" (${SEED_LANGUAGE}). Restore the real Card collection into ` +
        `the test DB (see docs/e2e-testing.md) before running e2e.`,
    );
  }
  const cardIds = realCards.map((c) => c.cardId);

  const user = await User.create({ ...SEED_USER, deckCount: 1 });
  const admin = await User.create({ ...SEED_ADMIN, deckCount: 0 });

  const deck = await UserDeck.create({
    userId: user._id,
    name: "Seeded Deck",
    cards: [
      { cardId: cardIds[0], quantity: 2 },
      { cardId: cardIds[1], quantity: 1 },
    ],
    source: "builder",
    version: 1,
  });

  return {
    packageId,
    cardIds,
    userId: String(user._id),
    adminId: String(admin._id),
    deckId: String(deck._id),
    deckVersion: 1,
  };
}

/** Disconnect WITHOUT dropping — preserves the restored catalog across runs. */
export async function disconnectTestDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/** Read the seed snapshot written by global-setup. */
export function readSeed(): SeedResult {
  const p = `${process.cwd()}/tests/e2e/.auth/seed.json`;
  return JSON.parse(fsSync.readFileSync(p, "utf-8")) as SeedResult;
}

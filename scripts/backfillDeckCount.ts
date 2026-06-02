/**
 * One-time migration: backfill `User.deckCount` from the actual number of
 * UserDeck documents each user owns.
 *
 * Why: the deck-creation limit filters on `deckCount: { $lt: 30 }`. Documents
 * created before the `deckCount` field existed have no value, which does NOT
 * match `$lt`, locking those users out of creating decks. This script sets an
 * accurate count for every user and is idempotent (safe to run repeatedly).
 *
 * Run with MONGO_URL in the environment: npx tsx scripts/backfillDeckCount.ts
 * (matches the existing scripts/deckCrawler.ts convention — env supplied
 * externally, @/ alias resolved by tsx via tsconfig paths.)
 */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { UserDeck } from "@/models/UserDeck";

/**
 * Pure mapping: given all user ids and the per-user deck counts from an
 * aggregation, produce the {userId, deckCount} updates (0 when a user has no
 * decks). Extracted so it can be unit-tested without a database.
 */
export function buildDeckCountUpdates(
  userIds: string[],
  deckCounts: { _id: string; count: number }[],
): { userId: string; deckCount: number }[] {
  const countMap = new Map(deckCounts.map((d) => [d._id, d.count]));
  return userIds.map((userId) => ({
    userId,
    deckCount: countMap.get(userId) ?? 0,
  }));
}

async function main() {
  await connectDB();

  const users = await User.find({}, { _id: 1 }).lean();
  const userIds = users.map((u) => String(u._id));

  const grouped = await UserDeck.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const deckCounts = grouped.map((g) => ({
    _id: String(g._id),
    count: g.count,
  }));

  const updates = buildDeckCountUpdates(userIds, deckCounts);

  let changed = 0;
  for (const { userId, deckCount } of updates) {
    const res = await User.updateOne({ _id: userId }, { $set: { deckCount } });
    if (res.modifiedCount > 0) changed++;
  }

  console.log(
    `Backfill complete: ${updates.length} users processed, ${changed} updated.`,
  );
  await mongoose.disconnect();
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && process.argv[1].includes("backfillDeckCount")) {
  main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}

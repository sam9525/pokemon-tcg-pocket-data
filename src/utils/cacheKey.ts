import { createHash } from "node:crypto";

const MAX_KEY_LENGTH = 200;
const SEPARATOR = "|";

export interface BuildCacheKeyOptions {
  /** Sort parts before joining (makes key order-independent). */
  sort?: boolean;
}

/**
 * Build a cache key from parts, with safety bounds:
 * - Joins with a separator.
 * - If any individual part exceeds MAX_KEY_LENGTH, replaces it with its SHA-1.
 * - Optionally sorts parts first.
 *
 * This prevents cache exhaustion via attacker-controlled unbounded input
 * (e.g., crafted `id` or `cardIds` query parameters) and ensures key
 * canonicalization.
 */
export function buildCacheKey(
  parts: string[],
  options: BuildCacheKeyOptions = {},
): string {
  const { sort = false } = options;
  const normalized = sort ? [...parts].sort() : parts;

  const safeParts = normalized.map((p) =>
    p.length > MAX_KEY_LENGTH ? `sha1:${hashCacheKey(p)}` : p,
  );

  const joined = safeParts.join(SEPARATOR);
  if (joined.length > MAX_KEY_LENGTH) {
    return `sha1:${hashCacheKey(joined)}`;
  }
  return joined;
}

export function hashCacheKey(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

/**
 * Rarity ordering from highest to lowest.
 * Used for sorting cards in My Decks.
 */
export const RARITY_ORDER = [
  "Crown",         // ultra rare cards (cardinal, ditto, mewtwo, etc.)
  "Ultra Rare",    // ex cards (charizard ex, pikachu ex, etc.)
  "Super Rare",    // special art / ACE cards
  "Rare",          // regular rare
  "Common",        // common / uncommon
  "Pokemon",       // basic pokemon (lowest)
] as const;

export type RarityLevel = (typeof RARITY_ORDER)[number];

/**
 * Map of card type filter names to display order.
 * These match the filter buttons in FilteringTabs.
 */
export const FILTER_TO_RARITY: Record<string, RarityLevel> = {
  crown: "Crown",
  "ultra-rare": "Ultra Rare",
  "super-rare": "Super Rare",
  rare: "Rare",
  common: "Common",
  pokemon: "Pokemon",
};

/**
 * Get the sort priority for a rarity string.
 * Lower number = higher priority (shown first).
 */
export function getRarityPriority(rarity: string): number {
  const normalizedRarity = rarity.trim();
  const index = RARITY_ORDER.findIndex(
    (r) => normalizedRarity.toLowerCase().includes(r.toLowerCase()),
  );
  return index === -1 ? RARITY_ORDER.length : index;
}
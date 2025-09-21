// Global caches
const cardListCache = new Map();
const specialCardListCache = new Map();
const cardLookupCache = new Map();
const specialCardLookupCache = new Map();

// Cache clearing timers
const cacheClearTimers = new Map<string, NodeJS.Timeout>();

// Load card list data
async function getCardList(packageCode: string, special: boolean = false) {
  const cache = special ? specialCardListCache : cardListCache;
  const suffix = special ? "_special" : "";

  if (!cache.has(packageCode)) {
    try {
      const path = `../cards-list/${packageCode}${suffix}.json`;
      const importedModule = await import(path);
      cache.set(packageCode, importedModule.default || importedModule);
    } catch (error) {
      console.error("Error loading card list:", error);
      if (special) {
        console.log("No special cards file found for:", packageCode);
        cache.set(packageCode, null);
      } else {
        throw new Error(`Card list not found for package: ${packageCode}`);
      }
    }
  }
  return cache.get(packageCode);
}

// Create lookup map for regular cards
function createCardLookupMap(
  cardList: Record<string, Record<string, string[]>>
) {
  const lookup = new Map<
    string,
    { type: string; boosterName: string; isSpecial: boolean }
  >();

  for (const [boosterName, cardTypes] of Object.entries(cardList)) {
    for (const [type, cards] of Object.entries(
      cardTypes as Record<string, string[]>
    )) {
      if (Array.isArray(cards)) {
        cards.forEach((cardId) => {
          lookup.set(cardId, {
            type,
            boosterName,
            isSpecial: false,
          });
        });
      }
    }
  }

  return lookup;
}

// Create lookup map for special cards
function createSpecialCardLookupMap(
  specialCardList: Record<string, Record<string, Record<string, string>>> | null
) {
  const lookup = new Map();

  if (!specialCardList) return lookup;

  for (const [specialCardId, cardData] of Object.entries(specialCardList)) {
    lookup.set(specialCardId, {
      ...cardData,
      isSpecial: true,
    });
  }

  return lookup;
}

// Get or create lookup maps for a package
export async function getCardLookupMaps(packageCode: string) {
  const cacheKey = packageCode;

  if (!cardLookupCache.has(cacheKey)) {
    // Load both regular and special card lists
    const [cardList, specialCardList] = await Promise.all([
      getCardList(packageCode, false),
      getCardList(packageCode, true),
    ]);

    // Create lookup maps
    const regularLookup = createCardLookupMap(cardList);
    const specialLookup = createSpecialCardLookupMap(specialCardList);

    // Cache the lookup maps
    cardLookupCache.set(cacheKey, {
      regular: regularLookup,
      special: specialLookup,
    });
  }

  return cardLookupCache.get(cacheKey);
}

// Clear cache
export function clearCardLookupCache(packageCode?: string) {
  if (packageCode) {
    // Clear specific package cache
    cardListCache.delete(packageCode);
    specialCardListCache.delete(packageCode);
    cardLookupCache.delete(packageCode);
    specialCardLookupCache.delete(packageCode);

    // Clear any existing timer for this package
    if (cacheClearTimers.has(packageCode)) {
      clearTimeout(cacheClearTimers.get(packageCode)!);
      cacheClearTimers.delete(packageCode);
    }
  } else {
    // Clear all caches
    cardListCache.clear();
    specialCardListCache.clear();
    cardLookupCache.clear();
    specialCardLookupCache.clear();

    // Clear all timers
    cacheClearTimers.forEach((timer) => clearTimeout(timer));
    cacheClearTimers.clear();
  }
}

// Schedule cache clearing for a specific package
export function scheduleCacheClear(
  packageCode: string,
  delayMinutes: number = 10
) {
  const delayMs = delayMinutes * 60 * 1000; // Convert minutes to milliseconds

  // Clear any existing timer for this package
  if (cacheClearTimers.has(packageCode)) {
    clearTimeout(cacheClearTimers.get(packageCode)!);
  }

  // Set new timer
  const timer = setTimeout(() => {
    console.log(
      `Clearing cache for package: ${packageCode} after ${delayMinutes} minutes`
    );
    clearCardLookupCache(packageCode);
  }, delayMs);

  cacheClearTimers.set(packageCode, timer);

  console.log(
    `Scheduled cache clear for package: ${packageCode} in ${delayMinutes} minutes`
  );
}

// Get cache status (useful for debugging)
export function getCacheStatus() {
  return {
    cardListCacheSize: cardListCache.size,
    specialCardListCacheSize: specialCardListCache.size,
    cardLookupCacheSize: cardLookupCache.size,
    specialCardLookupCacheSize: specialCardLookupCache.size,
    scheduledClears: Array.from(cacheClearTimers.keys()),
  };
}

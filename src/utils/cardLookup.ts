// Global caches
const cardListCache = new Map();
const specialCardListCache = new Map();
const cardLookupCache = new Map();
const specialCardLookupCache = new Map();
const cardNamesListCache = new Map();
const cardNamesLookupCache = new Map();

// Cache clearing timers
const cacheClearTimers = new Map<string, NodeJS.Timeout>();

// S3 bucket configuration
const S3_BASE_URL = `${process.env.NEXT_PUBLIC_S3_URL}Card-List-Json`;

// Load card list data from S3
async function getCardList(packageCode: string, special: boolean = false) {
  const cache = special ? specialCardListCache : cardListCache;

  if (!cache.has(packageCode)) {
    let cardData = null;

    try {
      const fileName = `${packageCode}${special ? "_special" : ""}.json`;
      const response = await fetch(`${S3_BASE_URL}/${fileName}`);

      if (response.ok) {
        cardData = await response.json();
      } else {
        console.warn(
          `Failed to fetch ${fileName} from S3. Status: ${response.status}.`
        );
      }
    } catch (error) {
      console.warn(
        `Error fetching from S3 for package: ${packageCode}.`,
        error
      );
    }

    if (!cardData) {
      if (special) {
        console.log("No special cards file found for:", packageCode);
        cache.set(packageCode, null);
        return null;
      } else {
        throw new Error(`Card list not found (S3) for package: ${packageCode}`);
      }
    }

    cache.set(packageCode, cardData);
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

export async function getCardNamesList() {
  const cache = cardNamesListCache;

  if (!cache.has("card_names")) {
    let cardNamesData = null;
    const fileName = `card_names.json`;

    try {
      const response = await fetch(`${S3_BASE_URL}/${fileName}`);

      if (response.ok) {
        cardNamesData = await response.json();
      } else {
        console.warn(
          `Failed to fetch ${fileName} from S3. Status: ${response.status}.`
        );
      }
    } catch (error) {
      console.warn(
        `Error fetching from S3 for card names: ${fileName}.`,
        error
      );
    }

    if (!cardNamesData) {
      throw new Error(`Card names list not found from S3: ${fileName}`);
    }

    cache.set("card_names", cardNamesData);
  }
  return cache.get("card_names");
}

function createCardNamesLookupMap(cardList: Record<string, string>) {
  const lookup = new Map<string, Record<string, string>>();

  for (const [cardId, names] of Object.entries(cardList)) {
    lookup.set(cardId, names as unknown as Record<string, string>);
  }

  return lookup;
}

export async function getCardNamesLookupMap() {
  if (!cardNamesLookupCache.has("card_names")) {
    const cardNamesList = await getCardNamesList();
    const cardNamesLookup = createCardNamesLookupMap(cardNamesList);
    cardNamesLookupCache.set("card_names", cardNamesLookup);
  }
  return cardNamesLookupCache.get("card_names");
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

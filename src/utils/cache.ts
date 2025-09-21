export interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  cache: Map<string, CacheEntry>;

  // Initialize the cache
  constructor() {
    this.cache = new Map<string, CacheEntry>();
  }

  // Get a value from the cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    return entry.data as T;
  }

  // Set a value in the cache
  set<T>(key: string, data: T, ttl: number) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttl });
  }

  // Delete a value from the cache
  delete(key: string) {
    this.cache.delete(key);
  }

  // Get all cache keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Schedule to clear the cache every 1 minute
setInterval(() => {
  cacheManager.keys().forEach((prefix) => {
    // Get the entry from the cache
    const entry = cacheManager.cache.get(prefix);
    if (entry && Date.now() - entry.timestamp > entry.ttl) {
      cacheManager.delete(prefix);
    }
  });
}, 1 * 60 * 1000);

export const cacheManager = new CacheManager();

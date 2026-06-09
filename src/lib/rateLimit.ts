import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limit configuration options
 */
export interface RateLimitConfig {
  /** Number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
  /** Skip rate limiting based on request */
  skip?: (request: NextRequest) => boolean;
  /** Custom key generator for rate limiting (default: client IP) */
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Maximum number of distinct keys held in the rate-limit store.
 * Caps memory usage against attackers that flood with unique identifiers
 * (e.g. unique spoofed X-Forwarded-For values). When the cap is reached,
 * the oldest entry is evicted on the next insertion of a new key.
 */
const MAX_KEYS = 10_000;

/**
 * In-memory store for rate limiting
 * Uses Map for O(1) lookups and automatic cleanup
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.startCleanup();
  }

  private startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        const keysToDelete: string[] = [];

        this.store.forEach((entry, key) => {
          if (entry.resetTime < now) {
            keysToDelete.push(key);
          }
        });

        keysToDelete.forEach((key) => this.store.delete(key));
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);

    // Remove expired entries
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    // Cap store size to prevent memory exhaustion via unique-key flooding.
    // When the cap is reached and a new key arrives, evict the oldest entry.
    if (!this.store.has(key) && this.store.size >= MAX_KEYS) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

// Singleton instance
const rateLimitStore = new RateLimitStore();

function isValidIp(s: string): boolean {
  return isIP(s) !== 0;
}

/**
 * Get the client identifier (IP) from the request.
 *
 * On Vercel, `x-forwarded-for` is set to the real client IP by the platform
 * and external IPs are stripped to prevent spoofing, so it can be trusted
 * directly (https://vercel.com/docs/headers/request-headers). `x-real-ip`
 * is identical and used as a fallback. `request.ip` was removed in Next.js
 * 15 and is intentionally not used. Falls back to the host header only when
 * no IP header is present (e.g. local dev).
 */
function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Vercel sets a single client IP; defensively take the first valid entry.
    for (const part of forwardedFor.split(",")) {
      const candidate = part.trim();
      if (candidate && isValidIp(candidate)) return candidate;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) return realIp.trim();

  return request.headers.get("host") || "unknown";
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): Promise<{ success: boolean; response?: NextResponse }> {
  // Bypass rate limiting in testing environment to prevent E2E flakiness / 429s
  // BUT allow it if specifically requested for testing the rate limiter itself
  const isTestRateLimit = request.headers.get("x-test-rate-limit") === "true";
  if (
    !isTestRateLimit &&
    (process.env.NODE_ENV === "test" ||
      (process.env.MONGO_URL && process.env.MONGO_URL.includes("test")))
  ) {
    return { success: true };
  }
  const {
    maxRequests,
    windowMs,
    message = "Too many requests, please try again later.",
    skip,
    keyGenerator,
  } = config;

  // Skip rate limiting if configured
  if (skip && skip(request)) {
    return { success: true };
  }

  const key = keyGenerator
    ? keyGenerator(request)
    : getClientIdentifier(request);
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry) {
    // First request from this client in this window
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return { success: true };
  }

  // Check if we're still within the time window
  if (now < entry.resetTime) {
    // Increment counter
    entry.count++;

    if (entry.count > maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return {
        success: false,
        response: NextResponse.json(
          {
            error: message,
            retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": new Date(entry.resetTime).toISOString(),
            },
          },
        ),
      };
    }

    // Update entry
    rateLimitStore.set(key, entry);
    return { success: true };
  } else {
    // Time window has expired, reset counter
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return { success: true };
  }
}

// Export store for testing purposes
export { rateLimitStore };

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
  /** Custom key generator for rate limiting (default: IP address) */
  keyGenerator?: (request: NextRequest) => string;
  /**
   * List of proxy IPs allowed to set X-Forwarded-For / X-Real-IP.
   * If empty or undefined, those headers are IGNORED and only the
   * connection IP (request.ip) is used. This prevents attackers from
   * spoofing their identifier to bypass per-IP rate limits.
   */
  trustedProxies?: string[];
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
 * Get client identifier from request.
 *
 * Trust is conditional: X-Forwarded-For and X-Real-IP are honored ONLY when
 * the connection IP (request.ip) is in the configured trustedProxies list.
 * Without that, both headers are ignored and the connection IP is used.
 * This is the standard defense against X-Forwarded-For spoofing.
 */
function getClientIdentifier(
  request: NextRequest & { ip?: string },
  trustedProxies: ReadonlySet<string>,
): string {
  const connIp = request.ip;
  const connIpValid = connIp && isValidIp(connIp);

  if (connIpValid && trustedProxies.has(connIp)) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      // Walk the chain right-to-left: the rightmost IP is the one
      // closest to us. Stop at the first invalid (non-IP) entry.
      const parts = forwardedFor
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      for (let i = parts.length - 1; i >= 0; i--) {
        if (isValidIp(parts[i])) {
          return parts[i];
        }
      }
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp && isValidIp(realIp.trim())) {
      return realIp.trim();
    }
  }

  if (connIpValid) return connIp;
  return request.headers.get("host") || "unknown";
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): Promise<{ success: boolean; response?: NextResponse }> {
  const {
    maxRequests,
    windowMs,
    message = "Too many requests, please try again later.",
    skip,
    keyGenerator,
    trustedProxies = [],
  } = config;

  // Skip rate limiting if configured
  if (skip && skip(request)) {
    return { success: true };
  }

  const trustedSet = new Set(trustedProxies);
  const key = keyGenerator
    ? keyGenerator(request)
    : getClientIdentifier(request, trustedSet);
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

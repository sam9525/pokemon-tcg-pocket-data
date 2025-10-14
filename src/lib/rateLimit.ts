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
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

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

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.store.forEach((entry, key) => {
        if (entry.resetTime < now) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach((key) => this.store.delete(key));
    }, 5 * 60 * 1000); // 5 minutes
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
}

// Singleton instance
const rateLimitStore = new RateLimitStore();

/**
 * Get client identifier from request
 * Uses IP address, X-Forwarded-For header, or X-Real-IP header
 */
function getClientIdentifier(request: NextRequest): string {
  // Check X-Forwarded-For header
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the list
    return forwardedFor.split(",")[0].trim();
  }

  // Check X-Real-IP header
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to host header or unknown
  const host = request.headers.get("host") || "unknown";
  return host;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; response?: NextResponse }> {
  const {
    maxRequests,
    windowMs,
    message = "Too many requests, please try again later.",
    skip,
    keyGenerator = getClientIdentifier,
  } = config;

  // Skip rate limiting if configured
  if (skip && skip(request)) {
    return { success: true };
  }

  const key = keyGenerator(request);
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
          }
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

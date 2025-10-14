import { RateLimitConfig } from "@/lib/rateLimit";

/**
 * Authentication endpoints
 * 5 requests per 15 minutes
 */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "Too many authentication attempts. Please try again in 15 minutes.",
};

/**
 * Public API endpoints
 * 100 requests per minute
 */
export const API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many requests. Please try again in a minute.",
};

/**
 * Resource-intensive operations
 * 30 requests per minute
 */
export const RESOURCE_INTENSIVE_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many resource-intensive requests. Please slow down.",
};

/**
 * Search operations
 * 60 requests per minute
 */
export const SEARCH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many search requests. Please try again shortly.",
};

/**
 * Upload operations
 * 10 requests per hour
 */
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Upload limit reached. Please try again in an hour.",
};

/**
 * User profile operations
 * 20 requests per minute
 */
export const PROFILE_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many profile requests. Please try again shortly.",
};

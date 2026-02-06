/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting functionality using Upstash Redis with sliding window algorithm.
 * Supports per-user (authenticated) and per-IP (anonymous) rate limiting.
 *
 * @example
 * ```ts
 * import { rateLimit, rateLimitByIdentifier } from '@/lib/rate-limit';
 *
 * // In Next.js middleware.ts
 * const rateLimitResult = await rateLimit(request);
 * if (!rateLimitResult.allowed) {
 *   return rateLimitResult.response;
 * }
 *
 * // Or by identifier
 * const result = await rateLimitByIdentifier('user_123', 100, 60);
 * if (!result.allowed) {
 *   return new Response('Too many requests', { status: 429 });
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, type RateLimitCheck } from './redis/rate-limiter';

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a unique identifier for the request
  return 'anonymous';
}

/**
 * Rate limit result with optional NextResponse
 */
export interface RateLimitResult extends RateLimitCheck {
  response?: NextResponse;
}

/**
 * Rate limit configuration
 */
export interface RateLimitOptions {
  /** Maximum requests allowed */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Custom identifier (defaults to user ID or IP) */
  identifier?: string;
}

/**
 * Rate limit a request by identifier (user ID, IP, etc.)
 *
 * @param identifier - Unique identifier for rate limiting
 * @param limit - Maximum requests allowed
 * @param window - Time window in seconds
 * @returns Rate limit check result
 */
export async function rateLimitByIdentifier(
  identifier: string,
  limit: number = 100,
  window: number = 60
): Promise<RateLimitCheck> {
  return checkRateLimit(identifier, { limit, window }, 'sliding');
}

/**
 * Get rate limit preset for a specific endpoint
 * Automatically applies stricter limits for authentication endpoints
 *
 * @param pathname - Request pathname
 * @returns Rate limit preset or undefined
 */
function getEndpointRateLimit(
  pathname: string
): { limit: number; window: number } | undefined {
  // Check for exact match first
  if (pathname in ENDPOINT_RATE_LIMITS) {
    const presetName = ENDPOINT_RATE_LIMITS[pathname];
    return RATE_LIMIT[presetName];
  }

  // Check for prefix match (e.g., /api/auth/*)
  for (const [prefix, presetName] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (pathname.startsWith(prefix)) {
      return RATE_LIMIT[presetName];
    }
  }

  return undefined;
}

/**
 * Rate limit middleware for Next.js middleware.ts
 *
 * Automatically detects authenticated users (from Clerk session token)
 * and applies appropriate rate limits:
 * - Authenticated users: 100 requests/minute per user
 * - Anonymous users: 30 requests/minute per IP
 * - Authentication endpoints: stricter limits per IP
 *
 * @param request - NextRequest object
 * @param options - Optional rate limit configuration
 * @returns Rate limit result with 429 response if exceeded
 */
export async function rateLimit(
  request: NextRequest,
  options?: Partial<RateLimitOptions>
): Promise<RateLimitResult> {
  // Check for endpoint-specific rate limits first
  const endpointLimit = getEndpointRateLimit(request.nextUrl.pathname);

  const limit = options?.limit ?? endpointLimit?.limit ?? 100;
  const window = options?.window ?? endpointLimit?.window ?? 60;

  let identifier: string;
  let isAuthenticated = false;

  // Try to get user ID from Clerk session token
  // In middleware, we need to check the session token cookie
  const sessionToken = request.cookies.get('__session')?.value;
  if (sessionToken) {
    // Use session token as identifier for authenticated users
    // Note: In production, you might want to decode the JWT to get the actual userId
    // But for rate limiting purposes, the session token is a valid unique identifier
    identifier = `user:${sessionToken.substring(0, 32)}`; // Use first 32 chars for efficiency
    isAuthenticated = true;
  } else {
    // Fall back to IP-based rate limiting for anonymous users
    const ip = getClientIP(request);
    identifier = `ip:${ip}`;
    isAuthenticated = false;
  }

  // Apply different limits for authenticated vs anonymous users
  const effectiveLimit = isAuthenticated ? limit : Math.min(limit, 30);

  const result = await rateLimitByIdentifier(
    identifier,
    effectiveLimit,
    window
  );

  // Create 429 response if rate limited
  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${result.retryAfter ?? 60} seconds.`,
        retryAfter: result.retryAfter ?? 60,
        resetTime: result.resetTime.toISOString(),
      },
      { status: 429 }
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString());
    response.headers.set('Retry-After', (result.retryAfter ?? 60).toString());

    return { ...result, response };
  }

  return result;
}

/**
 * Add rate limit headers to a response
 *
 * @param response - NextResponse object
 * @param result - Rate limit check result
 * @returns Response with rate limit headers
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitCheck
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString());

  if (result.retryAfter) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }

  return response;
}

/**
 * Create a 429 Too Many Requests response
 *
 * @param result - Rate limit check result
 * @returns NextResponse with 429 status
 */
export function createRateLimitResponse(result: RateLimitCheck): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${result.retryAfter ?? 60} seconds.`,
      retryAfter: result.retryAfter ?? 60,
      resetTime: result.resetTime.toISOString(),
    },
    { status: 429 }
  );

  return addRateLimitHeaders(response, result);
}

/**
 * Rate limit presets for common use cases
 * Following OWASP Rate Limiting 2024 recommendations
 */
export const RATE_LIMIT = {
  /** Strict: 10 requests per minute */
  strict: { limit: 10, window: 60 },

  /** Standard: 100 requests per minute (default) */
  standard: { limit: 100, window: 60 },

  /** Generous: 1000 requests per minute */
  generous: { limit: 1000, window: 60 },

  /** Hourly: 10,000 requests per hour */
  hourly: { limit: 10000, window: 3600 },

  /** Daily: 100,000 requests per day */
  daily: { limit: 100000, window: 86400 },

  // Authentication endpoints - stricter limits to prevent brute force attacks
  /** Authentication: 5 requests per 15 minutes per IP */
  auth: { limit: 5, window: 900 },

  /** Sign in: 3 requests per 15 minutes per IP */
  signIn: { limit: 3, window: 900 },

  /** Sign up: 5 requests per hour per IP */
  signUp: { limit: 5, window: 3600 },

  /** Password reset: 3 requests per hour per IP */
  passwordReset: { limit: 3, window: 3600 },

  /** Sensitive operations: 10 requests per hour */
  sensitive: { limit: 10, window: 3600 },
} as const;

/**
 * Endpoint-specific rate limit configuration
 * Maps API routes to appropriate rate limit presets
 */
export const ENDPOINT_RATE_LIMITS: Record<string, keyof typeof RATE_LIMIT> = {
  // Authentication endpoints
  '/api/sign-in': 'signIn',
  '/api/sign-up': 'signUp',
  '/api/auth': 'auth',
  '/api/forgot-password': 'passwordReset',
  '/api/reset-password': 'passwordReset',

  // Sensitive operations
  '/api/change-password': 'sensitive',
  '/api/change-email': 'sensitive',
  '/api/delete-account': 'sensitive',

  // Standard API endpoints
  '/api/': 'standard',
};

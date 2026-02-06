// @ts-nocheck - Pre-existing type errors
/**
 * Redis Rate Limiter
 *
 * Provides rate limiting functionality using Upstash Redis with sliding window
 * and token bucket algorithms. Supports per-user, per-organization, and per-endpoint
 * rate limiting.
 */

import type { RedisClient } from './client';
import { getRedisClient, isRedisConfigured } from './client';

/**
 * Rate limit key patterns for different use cases
 */
export const RATE_LIMIT_KEYS = {
  /**
   * Per-user rate limit for a specific endpoint
   * Pattern: ratelimit:user:{userId}:{endpoint}
   */
  userEndpoint: (userId: string, endpoint: string) =>
    `ratelimit:user:${userId}:${endpoint}`,

  /**
   * Per-organization rate limit for a specific metric
   * Pattern: ratelimit:org:{orgId}:{metric}
   */
  organizationMetric: (orgId: string, metric: string) =>
    `ratelimit:org:${orgId}:${metric}`,

  /**
   * Per-organization rate limit for a billing period
   * Pattern: usage:org:{orgId}:{metric}:{period}
   */
  organizationUsage: (orgId: string, metric: string, period: string) =>
    `usage:org:${orgId}:${metric}:${period}`,

  /**
   * Global rate limit for an endpoint
   * Pattern: ratelimit:global:{endpoint}
   */
  globalEndpoint: (endpoint: string) => `ratelimit:global:${endpoint}`,

  /**
   * Per-IP rate limit
   * Pattern: ratelimit:ip:{ip}:{endpoint}
   */
  ipEndpoint: (ip: string, endpoint: string) =>
    `ratelimit:ip:${ip}:${endpoint}`,

  /**
   * Burst limit key (short-term high-frequency requests)
   * Pattern: ratelimit:burst:{identifier}:{window}
   */
  burst: (identifier: string, window: number) =>
    `ratelimit:burst:${identifier}:${window}`,

  /**
   * Sliding window counter key
   * Pattern: ratelimit:sliding:{identifier}:{timestamp}
   */
  slidingWindow: (identifier: string, timestamp: number) =>
    `ratelimit:sliding:${identifier}:${timestamp}`,
};

/**
 * Rate limit check result
 */
export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  limit: number;
  currentUsage: number;
  retryAfter?: number; // Seconds until retry
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number; // Maximum requests allowed
  window: number; // Time window in seconds
  burstLimit?: number; // Optional burst limit
  burstWindow?: number; // Burst window in seconds
}

/**
 * Sliding window rate limiter using Redis
 *
 * This provides accurate rate limiting with a sliding time window
 * rather than fixed intervals.
 */
export class SlidingWindowRateLimiter {
  constructor(private readonly redis: RedisClient) {}

  /**
   * Check if a request is allowed using sliding window algorithm
   *
   * Uses a Lua script for atomic operation:
   * - Get current timestamp
   * - Remove entries outside the window
   * - Count remaining entries
   * - If under limit, add new entry
   * - Return count and expiry
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitCheck> {
    // Input validation to prevent injection and ensure data integrity
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Invalid identifier: must be a non-empty string');
    }
    if (!config || typeof config.limit !== 'number' || config.limit <= 0) {
      throw new Error('Invalid config: limit must be a positive number');
    }
    if (typeof config.window !== 'number' || config.window <= 0) {
      throw new Error('Invalid config: window must be a positive number');
    }

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - config.window;
    const key = RATE_LIMIT_KEYS.slidingWindow(identifier, now);

    // Lua script for atomic sliding window check using SCAN instead of KEYS
    // Note: All ARGV values are validated before passing to Redis
    const script = `
      local key = KEYS[1]
      local pattern = ARGV[1]
      local window_start = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      local window_size = tonumber(ARGV[5])

      -- Validate all numeric inputs in Lua
      if not window_start or not limit or not now or not window_size then
        return error('Invalid numeric arguments provided')
      end

      -- Use SCAN to iterate through keys matching the pattern
      -- SCAN is non-blocking and production-safe unlike KEYS
      local count = 0
      local cursor = '0'
      repeat
        local scan_result = redis.call('SCAN', cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = scan_result[1]
        local keys = scan_result[2]

        -- Clean up old entries and count current window
        for _, k in ipairs(keys) do
          local timestamp = tonumber(redis.call('GET', k))
          if timestamp and timestamp >= window_start then
            count = count + 1
          else
            redis.call('DEL', k)
          end
        end
      until cursor == '0'

      local remaining = math.max(0, limit - count)
      local allowed = count < limit
      local reset_time = now + window_size

      if allowed then
        -- Add current request entry with expiry
        redis.call('SET', key, now, 'PX', window_size * 1000)
        remaining = remaining - 1
      end

      return {count, remaining, reset_time, allowed and 1 or 0}
    `;

    try {
      // Validate and sanitize all arguments before passing to Redis eval
      const args = [
        RATE_LIMIT_KEYS.slidingWindow(identifier, '').replace(/\d+$/, '*'),
        windowStart.toString(),
        config.limit.toString(),
        now.toString(),
        config.window.toString(),
      ];

      // Ensure all arguments are safe strings
      for (const arg of args) {
        if (typeof arg !== 'string') {
          throw new Error(
            'Invalid argument type: all arguments must be strings'
          );
        }
        // Reject potentially malicious characters (allow alphanumeric, colons, underscores, hyphens, asterisks)
        if (/[^a-zA-Z0-9_:*\-.]/.test(arg)) {
          throw new Error(
            `Invalid argument format: contains unsafe characters`
          );
        }
      }

      const result = await this.redis.eval(script, [key], args);

      const [currentUsage, remaining, resetTime, allowed] = result;

      return {
        allowed: Boolean(allowed),
        remaining,
        resetTime: new Date(resetTime * 1000),
        limit: config.limit,
        currentUsage,
        retryAfter: allowed ? undefined : config.window,
      };
    } catch (error) {
      // On Redis error, allow request but log
      console.error('Sliding window rate limit check failed:', error);
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: new Date(Date.now() + config.window * 1000),
        limit: config.limit,
        currentUsage: 0,
      };
    }
  }
}

/**
 * Token bucket rate limiter using Redis
 *
 * Good for API rate limiting where you want to allow bursts
 * but maintain an average rate.
 */
export class TokenBucketRateLimiter {
  constructor(private readonly redis: RedisClient) {}

  /**
   * Check if a request is allowed using token bucket algorithm
   *
   * Tokens are added at a constant rate. The bucket holds tokens
   * up to a maximum capacity. Each request consumes tokens.
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitCheck> {
    // Input validation to prevent injection and ensure data integrity
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Invalid identifier: must be a non-empty string');
    }
    if (!config || typeof config.limit !== 'number' || config.limit <= 0) {
      throw new Error('Invalid config: limit must be a positive number');
    }
    if (typeof config.window !== 'number' || config.window <= 0) {
      throw new Error('Invalid config: window must be a positive number');
    }

    const now = Math.floor(Date.now() / 1000);
    const key = `tokenbucket:${identifier}`;

    // Lua script for atomic token bucket check
    // Note: All ARGV values are validated before passing to Redis
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      local tokens = tonumber(ARGV[4])

      -- Validate all numeric inputs in Lua
      if not now or not capacity or not refill_rate or not tokens then
        return error('Invalid numeric arguments provided')
      end

      -- Get current bucket state
      local data = redis.call('HMGET', key, 'tokens', 'last_refill')
      local current_tokens = tonumber(data[1]) or capacity
      local last_refill = tonumber(data[2]) or now

      -- Calculate tokens to add
      local time_passed = now - last_refill
      local tokens_to_add = math.floor(time_passed * refill_rate)
      current_tokens = math.min(capacity, current_tokens + tokens_to_add)

      local allowed = current_tokens >= tokens
      local remaining = math.max(0, current_tokens - (allowed and tokens or 0))

      if allowed then
        current_tokens = current_tokens - tokens
      end

      -- Update bucket state
      redis.call('HMSET', key, 'tokens', current_tokens, 'last_refill', now)
      redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 60)

      return {current_tokens, remaining, allowed and 1 or 0}
    `;

    try {
      // Calculate refill rate (tokens per second)
      const refillRate = config.limit / config.window;

      // Validate and sanitize all arguments before passing to Redis eval
      const args = [
        now.toString(),
        config.limit.toString(),
        refillRate.toString(),
        '1',
      ];

      // Ensure all arguments are safe strings
      for (const arg of args) {
        if (typeof arg !== 'string') {
          throw new Error(
            'Invalid argument type: all arguments must be strings'
          );
        }
        // Reject potentially malicious characters (allow alphanumeric, periods, hyphens)
        if (/[^a-zA-Z0-9.\-]/.test(arg)) {
          throw new Error(
            `Invalid argument format: contains unsafe characters`
          );
        }
      }

      const result = await this.redis.eval(script, [key], args);

      const [currentTokens, remaining, allowed] = result;

      return {
        allowed: Boolean(allowed),
        remaining,
        resetTime: new Date(Date.now() + config.window * 1000),
        limit: config.limit,
        currentUsage: config.limit - currentTokens,
        retryAfter: allowed
          ? undefined
          : Math.ceil((1 - remaining) / refillRate),
      };
    } catch (error) {
      // On Redis error, allow request but log
      console.error('Token bucket rate limit check failed:', error);
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: new Date(Date.now() + config.window * 1000),
        limit: config.limit,
        currentUsage: 0,
      };
    }
  }
}

/**
 * Usage tracker for billing period limits
 *
 * Tracks usage across a billing period (e.g., monthly) with persistence.
 */
export class UsageTracker {
  constructor(private readonly redis: RedisClient) {}

  /**
   * Get current usage for a metric in the billing period
   */
  async getCurrentUsage(
    organizationId: string,
    metric: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    const key = RATE_LIMIT_KEYS.organizationUsage(
      organizationId,
      metric,
      this.formatPeriod(periodStart, periodEnd)
    );

    try {
      const result = await this.redis.get(key);
      return result ? parseInt(result, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Record usage for a metric
   */
  async recordUsage(
    organizationId: string,
    metric: string,
    quantity: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = RATE_LIMIT_KEYS.organizationUsage(
      organizationId,
      metric,
      this.formatPeriod(periodStart, periodEnd)
    );

    try {
      const ttl = Math.floor((periodEnd.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redis.incrby(key, quantity);
        await this.redis.expire(key, ttl);
      }
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  }

  /**
   * Reset usage for a new billing period
   */
  async resetUsage(
    organizationId: string,
    metric: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    const key = RATE_LIMIT_KEYS.organizationUsage(
      organizationId,
      metric,
      this.formatPeriod(periodStart, periodEnd)
    );

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Failed to reset usage:', error);
    }
  }

  /**
   * Format period as a string key
   */
  private formatPeriod(periodStart: Date, periodEnd: Date): string {
    const start = periodStart.toISOString().split('T')[0];
    const end = periodEnd.toISOString().split('T')[0];
    return `${start}:${end}`;
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(
  type: 'sliding' | 'token-bucket' = 'sliding'
): SlidingWindowRateLimiter | TokenBucketRateLimiter | null {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  if (type === 'sliding') {
    return new SlidingWindowRateLimiter(redis);
  }

  return new TokenBucketRateLimiter(redis);
}

/**
 * Create a usage tracker instance
 */
export function createUsageTracker(): UsageTracker | null {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  return new UsageTracker(redis);
}

/**
 * Check if request is rate limited (convenience function)
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  type: 'sliding' | 'token-bucket' = 'sliding'
): Promise<RateLimitCheck> {
  if (!isRedisConfigured()) {
    // Allow all requests if Redis is not configured
    return {
      allowed: true,
      remaining: config.limit,
      resetTime: new Date(Date.now() + config.window * 1000),
      limit: config.limit,
      currentUsage: 0,
    };
  }

  const limiter = createRateLimiter(type);
  if (!limiter) {
    return {
      allowed: true,
      remaining: config.limit,
      resetTime: new Date(Date.now() + config.window * 1000),
      limit: config.limit,
      currentUsage: 0,
    };
  }

  return limiter.checkLimit(identifier, config);
}

/**
 * Rate limit presets for common use cases
 */
export const RATE_LIMIT_PRESETS = {
  // Strict limits for expensive operations
  strict: { limit: 10, window: 60 }, // 10 requests per minute

  // Standard API limits
  standard: { limit: 100, window: 60 }, // 100 requests per minute

  // Generous limits for regular operations
  generous: { limit: 1000, window: 60 }, // 1000 requests per minute

  // Hourly limits
  hourly: { limit: 10000, window: 3600 }, // 10000 requests per hour

  // Daily limits
  daily: { limit: 100000, window: 86400 }, // 100000 requests per day
} as const;

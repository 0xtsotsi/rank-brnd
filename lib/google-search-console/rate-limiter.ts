/**
 * Google Search Console API Rate Limiter
 *
 * Tracks API quota usage for Google Search Console API.
 * Google API has a daily quota limit:
 * - 25,000 units per day per property
 * - Most queries cost 1 unit
 * - Real-time reports cost 10 units
 *
 * This tracker uses Redis to persist quota usage across requests.
 */

import type { RedisClient } from '@/lib/redis/client';
import { getRedisClient, isRedisConfigured } from '@/lib/redis/client';

/**
 * GSC API quota limits
 */
export const GSC_QUOTA_LIMITS = {
  DAILY_UNITS_PER_PROPERTY: 25000,
  HOURLY_REQUESTS: 100,
  RESERVED_UNITS: 2500, // Keep 10% buffer
  QUOTA_RESET_HOUR: 0, // UTC hour when quota resets
} as const;

/**
 * Rate limit keys for GSC API
 */
const GSC_RATE_LIMIT_KEYS = {
  dailyUnits: (orgId: string, siteUrl: string, date: string) =>
    `gsc:quota:daily:${orgId}:${siteUrl}:${date}`,
  hourlyRequests: (orgId: string, siteUrl: string, hour: string) =>
    `gsc:quota:hourly:${orgId}:${siteUrl}:${hour}`,
  lastSyncTime: (orgId: string, siteUrl: string) =>
    `gsc:last_sync:${orgId}:${siteUrl}`,
};

/**
 * Quota usage information
 */
export interface GscQuotaUsage {
  dailyUnitsUsed: number;
  dailyUnitsRemaining: number;
  hourlyRequestsUsed: number;
  hourlyRequestsRemaining: number;
  canMakeRequest: boolean;
  resetTime: Date;
  reason?: string;
}

/**
 * Google Search Console API Rate Limiter
 */
export class GscRateLimiter {
  constructor(private readonly redis: RedisClient) {}

  /**
   * Check if a request can be made based on quota limits
   */
  async checkQuota(
    organizationId: string,
    siteUrl: string,
    units: number = 1
  ): Promise<GscQuotaUsage> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = `${today}:${String(now.getUTCHours()).padStart(2, '0')}`;

    // Get current usage
    const [dailyUnits, hourlyRequests] = await Promise.all([
      this.getCurrentDailyUnits(organizationId, siteUrl, today),
      this.getCurrentHourlyRequests(organizationId, siteUrl, currentHour),
    ]);

    const dailyUnitsRemaining =
      GSC_QUOTA_LIMITS.DAILY_UNITS_PER_PROPERTY -
      dailyUnits -
      GSC_QUOTA_LIMITS.RESERVED_UNITS;
    const hourlyRequestsRemaining =
      GSC_QUOTA_LIMITS.HOURLY_REQUESTS - hourlyRequests;

    const canMakeRequest =
      dailyUnitsRemaining >= units && hourlyRequestsRemaining > 0;

    // Calculate reset time (next day at midnight UTC)
    const resetTime = new Date(now);
    resetTime.setUTCHours(24, 0, 0, 0);

    return {
      dailyUnitsUsed: dailyUnits,
      dailyUnitsRemaining: Math.max(0, dailyUnitsRemaining - units),
      hourlyRequestsUsed: hourlyRequests,
      hourlyRequestsRemaining: Math.max(0, hourlyRequestsRemaining - 1),
      canMakeRequest,
      resetTime,
      reason: canMakeRequest
        ? undefined
        : dailyUnitsRemaining < units
          ? 'Daily quota exceeded'
          : 'Hourly request limit exceeded',
    };
  }

  /**
   * Record API quota usage after a successful request
   */
  async recordUsage(
    organizationId: string,
    siteUrl: string,
    units: number = 1
  ): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = `${today}:${String(now.getUTCHours()).padStart(2, '0')}`;

    await Promise.all([
      this.incrementDailyUnits(organizationId, siteUrl, today, units),
      this.incrementHourlyRequests(organizationId, siteUrl, currentHour),
      this.updateLastSyncTime(organizationId, siteUrl, now),
    ]);
  }

  /**
   * Get current daily units used
   */
  private async getCurrentDailyUnits(
    organizationId: string,
    siteUrl: string,
    date: string
  ): Promise<number> {
    const key = GSC_RATE_LIMIT_KEYS.dailyUnits(organizationId, siteUrl, date);
    try {
      const result = await this.redis.get(key);
      return result ? parseInt(result, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get current hourly requests used
   */
  private async getCurrentHourlyRequests(
    organizationId: string,
    siteUrl: string,
    hour: string
  ): Promise<number> {
    const key = GSC_RATE_LIMIT_KEYS.hourlyRequests(
      organizationId,
      siteUrl,
      hour
    );
    try {
      const result = await this.redis.get(key);
      return result ? parseInt(result, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Increment daily units counter
   */
  private async incrementDailyUnits(
    organizationId: string,
    siteUrl: string,
    date: string,
    units: number
  ): Promise<void> {
    const key = GSC_RATE_LIMIT_KEYS.dailyUnits(organizationId, siteUrl, date);
    try {
      // Set expiry to end of day (48 hours to be safe for UTC changes)
      const ttl = 48 * 60 * 60;
      await this.redis.incrby(key, units);
      await this.redis.expire(key, ttl);
    } catch (error) {
      console.error('Failed to increment daily units:', error);
    }
  }

  /**
   * Increment hourly requests counter
   */
  private async incrementHourlyRequests(
    organizationId: string,
    siteUrl: string,
    hour: string
  ): Promise<void> {
    const key = GSC_RATE_LIMIT_KEYS.hourlyRequests(
      organizationId,
      siteUrl,
      hour
    );
    try {
      // Set expiry to 2 hours to be safe
      const ttl = 2 * 60 * 60;
      await this.redis.incrby(key, 1);
      await this.redis.expire(key, ttl);
    } catch (error) {
      console.error('Failed to increment hourly requests:', error);
    }
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(
    organizationId: string,
    siteUrl: string,
    time: Date
  ): Promise<void> {
    const key = GSC_RATE_LIMIT_KEYS.lastSyncTime(organizationId, siteUrl);
    try {
      // Set with 7 day expiration (PX = milliseconds)
      await (this.redis as any).set(
        key,
        time.toISOString(),
        'PX',
        7 * 24 * 60 * 60 * 1000
      );
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  /**
   * Get last sync time for a site
   */
  async getLastSyncTime(
    organizationId: string,
    siteUrl: string
  ): Promise<Date | null> {
    const key = GSC_RATE_LIMIT_KEYS.lastSyncTime(organizationId, siteUrl);
    try {
      const result = await this.redis.get(key);
      return result ? new Date(result) : null;
    } catch {
      return null;
    }
  }

  /**
   * Reset quota tracking (for testing or manual intervention)
   */
  async resetQuota(organizationId: string, siteUrl: string): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = `${today}:${String(now.getUTCHours()).padStart(2, '0')}`;

    const keys = [
      GSC_RATE_LIMIT_KEYS.dailyUnits(organizationId, siteUrl, today),
      GSC_RATE_LIMIT_KEYS.hourlyRequests(organizationId, siteUrl, currentHour),
      GSC_RATE_LIMIT_KEYS.lastSyncTime(organizationId, siteUrl),
    ];

    try {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    } catch (error) {
      console.error('Failed to reset quota:', error);
    }
  }

  /**
   * Get quota usage summary for all sites in an organization
   */
  async getOrgQuotaSummary(
    organizationId: string,
    siteUrls: string[]
  ): Promise<
    Array<{
      siteUrl: string;
      quotaUsage: GscQuotaUsage;
    }>
  > {
    const results = await Promise.all(
      siteUrls.map(async (siteUrl) => {
        const quotaUsage = await this.checkQuota(organizationId, siteUrl, 0);
        return { siteUrl, quotaUsage };
      })
    );

    return results;
  }
}

/**
 * Create a GSC rate limiter instance
 */
export function createGscRateLimiter(): GscRateLimiter | null {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  return new GscRateLimiter(redis);
}

/**
 * Check if GSC request is allowed (convenience function)
 */
export async function checkGscQuota(
  organizationId: string,
  siteUrl: string,
  units: number = 1
): Promise<GscQuotaUsage> {
  if (!isRedisConfigured()) {
    // Allow all requests if Redis is not configured
    return {
      dailyUnitsUsed: 0,
      dailyUnitsRemaining: GSC_QUOTA_LIMITS.DAILY_UNITS_PER_PROPERTY,
      hourlyRequestsUsed: 0,
      hourlyRequestsRemaining: GSC_QUOTA_LIMITS.HOURLY_REQUESTS,
      canMakeRequest: true,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  const limiter = createGscRateLimiter();
  if (!limiter) {
    return {
      dailyUnitsUsed: 0,
      dailyUnitsRemaining: GSC_QUOTA_LIMITS.DAILY_UNITS_PER_PROPERTY,
      hourlyRequestsUsed: 0,
      hourlyRequestsRemaining: GSC_QUOTA_LIMITS.HOURLY_REQUESTS,
      canMakeRequest: true,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  return limiter.checkQuota(organizationId, siteUrl, units);
}

/**
 * Record GSC API usage (convenience function)
 */
export async function recordGscUsage(
  organizationId: string,
  siteUrl: string,
  units: number = 1
): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  const limiter = createGscRateLimiter();
  if (!limiter) {
    return;
  }

  await limiter.recordUsage(organizationId, siteUrl, units);
}

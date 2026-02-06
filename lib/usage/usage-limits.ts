/**
 * Usage Limits Service
 *
 * This service provides functionality to check and enforce usage limits
 * based on subscription plans. It integrates with the subscription system
 * to track usage across different features.
 *
 * Storage backend:
 * - Uses Upstash Redis when configured (production)
 * - Falls back to in-memory storage when Redis is unavailable (development)
 */

import type {
  UsageMetric,
  UsageLimitCheck,
  UsageContext,
  UsageAggregate,
  UsageQuotaInfo,
  MetricFeatureMapping,
  BulkUsageCheck,
  UsageWarningLevel,
} from '@/types/usage';
import type {
  FeatureKey,
  UsageLimits as PlanUsageLimits,
} from '@/types/subscription';
import { getPlan, canUseFeature as checkPlanFeature } from '@/lib/stripe/plans';
import {
  createUsageTracker as createRedisUsageTracker,
  isRedisConfigured,
} from '@/lib/redis';

/**
 * Mapping of usage metrics to feature keys and plan limit fields
 */
const METRIC_FEATURE_MAP: Record<UsageMetric, MetricFeatureMapping> = {
  // Content metrics
  articles_created: {
    metric: 'articles_created',
    featureKey: 'ai_content_generation',
    limitField: 'articlesPerMonth',
  },
  ai_words_generated: {
    metric: 'ai_words_generated',
    featureKey: 'ai_content_generation',
    limitField: 'aiWordsPerMonth',
  },
  images_generated: {
    metric: 'images_generated',
    featureKey: 'ai_content_generation',
    limitField: 'imagesPerMonth',
  },

  // SEO metrics
  keyword_research_queries: {
    metric: 'keyword_research_queries',
    featureKey: 'keyword_research',
    limitField: 'keywordResearchPerMonth',
  },
  serp_analyses: {
    metric: 'serp_analyses',
    featureKey: 'serp_analysis',
    limitField: 'serpAnalysisPerMonth',
  },
  backlink_requests: {
    metric: 'backlink_requests',
    featureKey: 'backlink_exchange',
    limitField: 'backlinkExchangeRequests',
  },

  // Publishing metrics
  articles_published: {
    metric: 'articles_published',
    featureKey: 'cms_publishing',
    limitField: 'publishedArticlesPerMonth',
  },
  scheduled_articles: {
    metric: 'scheduled_articles',
    featureKey: 'scheduled_publishing',
    limitField: 'scheduledArticles',
  },

  // API metrics
  api_requests: {
    metric: 'api_requests',
    featureKey: 'api_access',
    limitField: 'apiRequestsPerMonth',
  },
  webhook_events: {
    metric: 'webhook_events',
    featureKey: 'webhooks',
    limitField: 'webhookEventsPerMonth',
  },

  // Team metrics (not monthly, but total)
  team_members: {
    metric: 'team_members',
    featureKey: 'team_members',
    limitField: 'teamMembers',
  },
  cms_integrations: {
    metric: 'cms_integrations',
    featureKey: 'cms_integrations',
    limitField: 'organizations', // Reuse organizations limit for CMS integrations
  },
};

/**
 * Storage for usage tracking
 *
 * Uses Upstash Redis when configured, falls back to in-memory storage
 * for development/testing scenarios.
 */
class UsageTracker {
  private memory: Map<string, UsageAggregate[]> = new Map();
  private useRedis: boolean;

  constructor() {
    this.useRedis = isRedisConfigured();
  }

  private getRedisTracker() {
    return createRedisUsageTracker();
  }

  /**
   * Get current usage for a metric in the billing period
   */
  async getCurrentUsage(
    organizationId: string,
    metric: UsageMetric,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    // Try Redis first
    if (this.useRedis) {
      const redisTracker = this.getRedisTracker();
      if (redisTracker) {
        return redisTracker.getCurrentUsage(
          organizationId,
          metric,
          periodStart,
          periodEnd
        );
      }
    }

    // Fall back to in-memory storage
    const key = this.getKey(organizationId, metric, periodStart, periodEnd);
    const records = this.memory.get(key) || [];

    return records.reduce((total, record) => total + record.totalUsage, 0);
  }

  /**
   * Record usage for a metric
   */
  async recordUsage(
    organizationId: string,
    metric: UsageMetric,
    quantity: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    // Try Redis first
    if (this.useRedis) {
      const redisTracker = this.getRedisTracker();
      if (redisTracker) {
        await redisTracker.recordUsage(
          organizationId,
          metric,
          quantity,
          periodStart,
          periodEnd
        );
        return;
      }
    }

    // Fall back to in-memory storage
    const key = this.getKey(organizationId, metric, periodStart, periodEnd);
    const records = this.memory.get(key) || [];

    // Find existing aggregate or create new one
    let aggregate = records.find(
      (r) =>
        r.periodStart.getTime() === periodStart.getTime() &&
        r.periodEnd.getTime() === periodEnd.getTime()
    );

    if (aggregate) {
      aggregate.totalUsage += quantity;
    } else {
      aggregate = {
        organizationId,
        metric,
        totalUsage: quantity,
        periodStart,
        periodEnd,
        lastResetAt: new Date(),
      };
      records.push(aggregate);
    }

    this.memory.set(key, records);
  }

  /**
   * Reset usage for a new billing period
   */
  async resetUsage(
    organizationId: string,
    metric: UsageMetric,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    // Try Redis first
    if (this.useRedis) {
      const redisTracker = this.getRedisTracker();
      if (redisTracker) {
        await redisTracker.resetUsage(
          organizationId,
          metric,
          periodStart,
          periodEnd
        );
        return;
      }
    }

    // Fall back to in-memory storage
    const key = this.getKey(organizationId, metric, periodStart, periodEnd);
    this.memory.set(key, []);
  }

  /**
   * Generate a cache key
   */
  private getKey(
    organizationId: string,
    metric: UsageMetric,
    periodStart: Date,
    periodEnd: Date
  ): string {
    return `${organizationId}:${metric}:${periodStart.toISOString()}:${periodEnd.toISOString()}`;
  }

  /**
   * Get all usage records for an organization
   */
  async getAllUsage(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageAggregate[]> {
    const results: UsageAggregate[] = [];

    // If using Redis, we need to query each metric
    if (this.useRedis) {
      const redisTracker = this.getRedisTracker();
      if (redisTracker) {
        for (const metric of Object.keys(METRIC_FEATURE_MAP) as UsageMetric[]) {
          const usage = await redisTracker.getCurrentUsage(
            organizationId,
            metric,
            periodStart,
            periodEnd
          );
          if (usage > 0) {
            results.push({
              organizationId,
              metric,
              totalUsage: usage,
              periodStart,
              periodEnd,
              lastResetAt: new Date(),
            });
          }
        }
        return results;
      }
    }

    // Fall back to in-memory storage
    for (const metric of Object.keys(METRIC_FEATURE_MAP) as UsageMetric[]) {
      const key = this.getKey(organizationId, metric, periodStart, periodEnd);
      const records = this.memory.get(key);
      if (records && records.length > 0) {
        results.push(...records);
      }
    }

    return results;
  }
}

// Singleton instance
const usageTracker = new UsageTracker();

/**
 * Get billing period dates based on subscription
 */
export function getBillingPeriod(
  periodStart?: Date,
  periodEnd?: Date
): { start: Date; end: Date } {
  // If provided, use those dates
  if (periodStart && periodEnd) {
    return { start: periodStart, end: periodEnd };
  }

  // Default to current month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return { start, end };
}

/**
 * Calculate warning level based on usage percentage
 */
export function calculateWarningLevel(percentage: number): UsageWarningLevel {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'critical';
  if (percentage >= 80) return 'warning';
  return 'ok';
}

/**
 * Check if usage is within limits
 */
export async function checkUsageLimit(
  organizationId: string,
  planId: string,
  metric: UsageMetric,
  quantity: number = 1,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
  }
): Promise<UsageLimitCheck> {
  const plan = getPlan(planId);

  if (!plan) {
    return {
      allowed: false,
      metric,
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      resetDate: new Date(),
      warningLevel: 'exceeded',
      reason: 'Plan not found',
    };
  }

  const mapping = METRIC_FEATURE_MAP[metric];
  const limit = plan.limits[mapping.limitField];

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      metric,
      currentUsage: 0,
      limit: -1,
      remaining: -1,
      resetDate: new Date(),
      warningLevel: 'ok',
    };
  }

  const { start: periodStart, end: periodEnd } = getBillingPeriod(
    options?.periodStart,
    options?.periodEnd
  );

  const currentUsage = await usageTracker.getCurrentUsage(
    organizationId,
    metric,
    periodStart,
    periodEnd
  );

  const newUsage = currentUsage + quantity;
  const remaining = Math.max(0, limit - currentUsage);
  const percentage = (currentUsage / limit) * 100;
  const warningLevel = calculateWarningLevel(percentage);

  const result: UsageLimitCheck = {
    allowed: newUsage <= limit,
    metric,
    currentUsage,
    limit,
    remaining,
    resetDate: periodEnd,
    warningLevel,
    reason:
      newUsage > limit ? `${mapping.featureKey} limit exceeded` : undefined,
  };

  return result;
}

/**
 * Record usage for a metric
 */
export async function recordUsage(
  organizationId: string,
  planId: string,
  metric: UsageMetric,
  quantity: number = 1,
  context?: Partial<UsageContext>,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
    strict?: boolean;
  }
): Promise<{ success: boolean; check: UsageLimitCheck }> {
  const { start: periodStart, end: periodEnd } = getBillingPeriod(
    options?.periodStart,
    options?.periodEnd
  );

  // Check limit first
  const check = await checkUsageLimit(
    organizationId,
    planId,
    metric,
    quantity,
    {
      periodStart,
      periodEnd,
    }
  );

  // If strict mode and not allowed, don't record
  if (options?.strict && !check.allowed) {
    return { success: false, check };
  }

  // Record the usage
  await usageTracker.recordUsage(
    organizationId,
    metric,
    quantity,
    periodStart,
    periodEnd
  );

  return { success: true, check };
}

/**
 * Check multiple usage limits at once
 */
export async function checkBulkUsageLimits(
  organizationId: string,
  planId: string,
  checks: Array<{ metric: UsageMetric; quantity: number }>,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
  }
): Promise<BulkUsageCheck> {
  const results = await Promise.all(
    checks.map(({ metric, quantity }) =>
      checkUsageLimit(organizationId, planId, metric, quantity, options)
    )
  );

  const allowed = results.every((r) => r.allowed);
  const blockingReason = allowed
    ? undefined
    : results.find((r) => !r.allowed)?.reason;

  return {
    allowed,
    checks: checks.map(({ metric }, index) => ({
      metric,
      result: results[index],
    })),
    blockingReason,
  };
}

/**
 * Get usage quota information for UI display
 */
export async function getUsageQuotaInfo(
  organizationId: string,
  planId: string,
  metric: UsageMetric,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
  }
): Promise<UsageQuotaInfo> {
  const plan = getPlan(planId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  const mapping = METRIC_FEATURE_MAP[metric];
  const feature = plan.features.find((f) => f === mapping.featureKey);

  if (!feature) {
    throw new Error('Feature not available in plan');
  }

  const { start: periodStart, end: periodEnd } = getBillingPeriod(
    options?.periodStart,
    options?.periodEnd
  );

  const currentUsage = await usageTracker.getCurrentUsage(
    organizationId,
    metric,
    periodStart,
    periodEnd
  );

  const limit = plan.limits[mapping.limitField];
  const isUnlimited = limit === -1;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - currentUsage);
  const percentage = isUnlimited ? 0 : (currentUsage / limit) * 100;
  const warningLevel = calculateWarningLevel(percentage);

  return {
    metric,
    featureKey: mapping.featureKey,
    featureName: mapping.featureKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    current: currentUsage,
    limit,
    remaining,
    percentage,
    resetDate: periodEnd,
    isUnlimited,
    warningLevel,
  };
}

/**
 * Get all usage quotas for an organization
 */
export async function getAllUsageQuotas(
  organizationId: string,
  planId: string,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
  }
): Promise<UsageQuotaInfo[]> {
  const quotas: UsageQuotaInfo[] = [];

  for (const metric of Object.keys(METRIC_FEATURE_MAP) as UsageMetric[]) {
    try {
      const quota = await getUsageQuotaInfo(
        organizationId,
        planId,
        metric,
        options
      );
      quotas.push(quota);
    } catch (error) {
      // Skip metrics not available in plan
      continue;
    }
  }

  return quotas;
}

/**
 * Reset usage for a new billing period
 */
export async function resetBillingPeriodUsage(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  for (const metric of Object.keys(METRIC_FEATURE_MAP) as UsageMetric[]) {
    await usageTracker.resetUsage(
      organizationId,
      metric,
      periodStart,
      periodEnd
    );
  }
}

/**
 * Check if a feature can be used
 */
export async function canUseFeature(
  organizationId: string,
  planId: string,
  featureKey: FeatureKey,
  quantity: number = 1
): Promise<UsageLimitCheck> {
  const planFeatureCheck = checkPlanFeature(planId, featureKey);

  if (!planFeatureCheck.allowed) {
    return {
      allowed: false,
      metric: 'articles_created', // Default metric
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      resetDate: new Date(),
      warningLevel: 'exceeded',
      reason: planFeatureCheck.reason,
    };
  }

  // Find the metric for this feature
  const mapping = Object.values(METRIC_FEATURE_MAP).find(
    (m) => m.featureKey === featureKey
  );

  if (!mapping) {
    // Feature doesn't have usage tracking
    return {
      allowed: true,
      metric: 'articles_created',
      currentUsage: 0,
      limit: -1,
      remaining: -1,
      resetDate: new Date(),
      warningLevel: 'ok',
    };
  }

  return checkUsageLimit(organizationId, planId, mapping.metric, quantity);
}

/**
 * Get usage statistics for dashboard
 */
export async function getUsageStats(
  organizationId: string,
  planId: string,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
  }
) {
  const quotas = await getAllUsageQuotas(organizationId, planId, options);
  const { start: periodStart, end: periodEnd } = getBillingPeriod(
    options?.periodStart,
    options?.periodEnd
  );

  const daysRemaining = Math.ceil(
    (periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    periodStart,
    periodEnd,
    daysRemaining,
    metrics: quotas.map((quota) => ({
      metric: quota.metric,
      usage: quota.current,
      limit: quota.limit,
      percentage: quota.percentage,
      warningLevel: quota.warningLevel,
    })),
  };
}

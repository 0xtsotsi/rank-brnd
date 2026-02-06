/**
 * Subscription Plan Validation Utilities
 *
 * This file provides validation utilities for subscription plans,
 * feature checks, and usage limit enforcement.
 *
 * Usage:
 * import {
 *   validateFeatureAccess,
 *   checkUsageLimits,
 *   getSubscriptionWarnings
 * } from '@/lib/stripe/validation';
 */

import type {
  FeatureKey,
  SubscriptionPlan,
  UsageLimits,
  UsageWarning,
  UsageWarningLevel,
  UsageStats,
  FeatureAvailability,
} from '@/types/subscription';
import {
  getPlan,
  getFeatureLimit,
  canUseFeature as checkFeature,
} from './plans';

/**
 * Validation error types
 */
export class FeatureNotAvailableError extends Error {
  constructor(feature: FeatureKey, planId: string) {
    super(`Feature '${feature}' is not available in plan '${planId}'`);
    this.name = 'FeatureNotAvailableError';
  }
}

export class UsageLimitExceededError extends Error {
  constructor(feature: FeatureKey, limit: number, usage: number) {
    super(
      `Usage limit exceeded for '${feature}': ${usage}/${limit} (resets at month end)`
    );
    this.name = 'UsageLimitExceededError';
  }
}

export class PlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan '${planId}' not found`);
    this.name = 'PlanNotFoundError';
  }
}

/**
 * Validate feature access for a plan
 *
 * @param planId - The plan ID to check
 * @param featureKey - The feature to validate
 * @param currentUsage - Current usage count (optional)
 * @returns Result with allowed status and reason if not allowed
 */
export function validateFeatureAccess(
  planId: string,
  featureKey: FeatureKey,
  currentUsage?: number
): {
  allowed: boolean;
  limit: number;
  remaining?: number;
  reason?: string;
  warningLevel: UsageWarningLevel;
} {
  const plan = getPlan(planId);

  if (!plan) {
    return {
      allowed: false,
      limit: 0,
      reason: 'Plan not found',
      warningLevel: 'exceeded',
    };
  }

  // Check if feature is included in plan
  if (!plan.features.includes(featureKey)) {
    return {
      allowed: false,
      limit: 0,
      reason: 'Feature not included in plan',
      warningLevel: 'exceeded',
    };
  }

  // Get the limit for this feature
  const limit = getFeatureLimit(planId, featureKey);

  // Unlimited features (-1) are always allowed
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      remaining: -1,
      warningLevel: 'ok',
    };
  }

  // If no usage provided, just return the limit
  if (currentUsage === undefined) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      warningLevel: 'ok',
    };
  }

  // Calculate remaining and warning level
  const remaining = Math.max(0, limit - currentUsage);
  const percentage = (currentUsage / limit) * 100;

  let warningLevel: UsageWarningLevel = 'ok';
  if (currentUsage >= limit) {
    warningLevel = 'exceeded';
  } else if (percentage >= 90) {
    warningLevel = 'critical';
  } else if (percentage >= 75) {
    warningLevel = 'warning';
  }

  return {
    allowed: currentUsage < limit,
    limit,
    remaining,
    reason: currentUsage >= limit ? 'Monthly limit exceeded' : undefined,
    warningLevel,
  };
}

/**
 * Check if user can perform an action based on usage limits
 *
 * @param planId - The plan ID to check
 * @param featureKey - The feature to check
 * @param currentUsage - Current usage count
 * @param increment - Number of units to add (default: 1)
 * @throws FeatureNotAvailableError if feature not available
 * @throws UsageLimitExceededError if limit exceeded
 */
export function checkUsageLimits(
  planId: string,
  featureKey: FeatureKey,
  currentUsage: number,
  increment: number = 1
): void {
  const validation = validateFeatureAccess(planId, featureKey, currentUsage);

  if (!validation.allowed) {
    if (validation.limit === 0) {
      throw new FeatureNotAvailableError(featureKey, planId);
    }
    throw new UsageLimitExceededError(
      featureKey,
      validation.limit,
      currentUsage
    );
  }

  // Check if increment would exceed limit
  if (validation.remaining !== undefined && validation.remaining < increment) {
    throw new UsageLimitExceededError(
      featureKey,
      validation.limit,
      currentUsage + increment
    );
  }
}

/**
 * Get usage warnings for a plan based on current usage
 *
 * @param planId - The plan ID to check
 * @param usageStats - Current usage statistics
 * @returns Array of usage warnings
 */
export function getSubscriptionWarnings(
  planId: string,
  usageStats: Partial<UsageStats>
): UsageWarning[] {
  const warnings: UsageWarning[] = [];
  const plan = getPlan(planId);

  if (!plan) {
    return warnings;
  }

  const featuresToCheck: Array<{
    key: FeatureKey;
    usage: number;
    limit: number;
    name: string;
  }> = [
    {
      key: 'ai_content_generation',
      usage: usageStats.articlesUsed || 0,
      limit: plan.limits.articlesPerMonth,
      name: 'Articles generated',
    },
    {
      key: 'keyword_research',
      usage: usageStats.keywordResearchUsed || 0,
      limit: plan.limits.keywordResearchPerMonth,
      name: 'Keyword research queries',
    },
    {
      key: 'serp_analysis',
      usage: usageStats.serpAnalysisUsed || 0,
      limit: plan.limits.serpAnalysisPerMonth,
      name: 'SERP analyses',
    },
    {
      key: 'cms_publishing',
      usage: usageStats.publishedArticlesUsed || 0,
      limit: plan.limits.publishedArticlesPerMonth,
      name: 'Published articles',
    },
    {
      key: 'api_access',
      usage: usageStats.apiRequestsUsed || 0,
      limit: plan.limits.apiRequestsPerMonth,
      name: 'API requests',
    },
  ];

  featuresToCheck.forEach(({ key, usage, limit, name }) => {
    // Skip if limit is unlimited (-1) or 0 (not included)
    if (limit <= 0) return;

    const percentage = (usage / limit) * 100;
    const remaining = Math.max(0, limit - usage);

    let level: UsageWarningLevel = 'ok';
    let message = '';

    if (usage >= limit) {
      level = 'exceeded';
      message = `You've reached your monthly limit for ${name.toLowerCase()}. Upgrade to continue.`;
    } else if (percentage >= 90) {
      level = 'critical';
      message = `You've used ${percentage.toFixed(0)}% of your monthly ${name.toLowerCase()} (${remaining} remaining).`;
    } else if (percentage >= 75) {
      level = 'warning';
      message = `You've used ${percentage.toFixed(0)}% of your monthly ${name.toLowerCase()}.`;
    }

    if (level !== 'ok') {
      warnings.push({
        feature: key,
        level,
        current: usage,
        limit,
        percentage,
        message,
      });
    }
  });

  return warnings;
}

/**
 * Get feature availability with full details
 *
 * @param planId - The plan ID to check
 * @param featureKey - The feature to check
 * @param currentUsage - Current usage count
 * @param resetDate - Date when usage resets
 * @returns Feature availability details
 */
export function getFeatureAvailability(
  planId: string,
  featureKey: FeatureKey,
  currentUsage: number,
  resetDate: Date
): FeatureAvailability {
  const validation = validateFeatureAccess(planId, featureKey, currentUsage);

  return {
    feature: featureKey,
    available: validation.allowed,
    limit: validation.limit,
    used: currentUsage,
    remaining: validation.remaining || 0,
    resetsAt: resetDate,
    warningLevel: validation.warningLevel,
  };
}

/**
 * Validate plan upgrade/downgrade
 *
 * @param currentPlanId - Current plan ID
 * @param newPlanId - New plan ID
 * @returns Validation result
 */
export function validatePlanChange(
  currentPlanId: string,
  newPlanId: string
): {
  allowed: boolean;
  reason?: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
} {
  const currentPlan = getPlan(currentPlanId);
  const newPlan = getPlan(newPlanId);

  if (!currentPlan || !newPlan) {
    return {
      allowed: false,
      reason: 'One or both plans not found',
      isUpgrade: false,
      isDowngrade: false,
    };
  }

  // Check if it's the same plan
  if (currentPlan.id === newPlan.id) {
    return {
      allowed: false,
      reason: 'Already on this plan',
      isUpgrade: false,
      isDowngrade: false,
    };
  }

  const planOrder = ['free', 'starter', 'pro', 'agency'];
  const currentIndex = planOrder.indexOf(currentPlan.metadata.tier);
  const newIndex = planOrder.indexOf(newPlan.metadata.tier);

  if (currentIndex === -1 || newIndex === -1) {
    return {
      allowed: false,
      reason: 'Invalid plan tier',
      isUpgrade: false,
      isDowngrade: false,
    };
  }

  return {
    allowed: true,
    isUpgrade: newIndex > currentIndex,
    isDowngrade: newIndex < currentIndex,
  };
}

/**
 * Check if plan has reached any critical limits
 *
 * @param planId - The plan ID to check
 * @param usageStats - Current usage statistics
 * @returns True if any critical limits reached
 */
export function hasCriticalLimits(
  planId: string,
  usageStats: Partial<UsageStats>
): boolean {
  const warnings = getSubscriptionWarnings(planId, usageStats);
  return warnings.some((w) => w.level === 'critical' || w.level === 'exceeded');
}

/**
 * Get recommended plan based on usage
 *
 * @param currentPlanId - Current plan ID
 * @param usageStats - Current usage statistics
 * @returns Recommended plan ID or null
 */
export function getRecommendedPlan(
  currentPlanId: string,
  usageStats: Partial<UsageStats>
): string | null {
  const currentPlan = getPlan(currentPlanId);
  if (!currentPlan) return null;

  // Check if any limits are exceeded
  const warnings = getSubscriptionWarnings(currentPlanId, usageStats);
  if (warnings.length === 0) return null;

  // If any limits exceeded, recommend upgrade
  if (warnings.some((w) => w.level === 'exceeded')) {
    const nextUpgrade = getNextPlanUpgrade(currentPlanId);
    return nextUpgrade;
  }

  // If critical warnings, consider upgrade
  if (warnings.some((w) => w.level === 'critical')) {
    const nextUpgrade = getNextPlanUpgrade(currentPlanId);
    return nextUpgrade;
  }

  return null;
}

/**
 * Get next plan upgrade
 */
function getNextPlanUpgrade(currentPlanId: string): string | null {
  const planOrder = ['free', 'starter', 'pro', 'agency'];
  const currentIndex = planOrder.indexOf(currentPlanId);

  if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
    return null;
  }

  return planOrder[currentIndex + 1];
}

/**
 * Validate team size limit
 *
 * @param planId - The plan ID to check
 * @param currentTeamSize - Current number of team members
 * @param newMembers - Number of members to add
 * @returns Validation result
 */
export function validateTeamSize(
  planId: string,
  currentTeamSize: number,
  newMembers: number = 1
): {
  allowed: boolean;
  limit: number;
  reason?: string;
} {
  const plan = getPlan(planId);

  if (!plan) {
    return {
      allowed: false,
      limit: 0,
      reason: 'Plan not found',
    };
  }

  const limit = plan.limits.teamMembers;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
    };
  }

  const newTotal = currentTeamSize + newMembers;

  if (newTotal > limit) {
    return {
      allowed: false,
      limit,
      reason: `Team size limit reached (${limit} members). Upgrade to add more members.`,
    };
  }

  return {
    allowed: true,
    limit,
  };
}

/**
 * Calculate usage percentage for a feature
 *
 * @param planId - The plan ID to check
 * @param featureKey - The feature to check
 * @param currentUsage - Current usage count
 * @returns Percentage (0-100+) or -1 for unlimited
 */
export function calculateUsagePercentage(
  planId: string,
  featureKey: FeatureKey,
  currentUsage: number
): number {
  const limit = getFeatureLimit(planId, featureKey);

  if (limit <= 0) return -1; // Unlimited or not available

  return (currentUsage / limit) * 100;
}

/**
 * Get all feature availabilities for a plan
 *
 * @param planId - The plan ID to check
 * @param usageStats - Current usage statistics
 * @param resetDate - Date when usage resets
 * @returns Array of feature availabilities
 */
export function getAllFeatureAvailabilities(
  planId: string,
  usageStats: Partial<UsageStats>,
  resetDate: Date
): FeatureAvailability[] {
  const plan = getPlan(planId);
  if (!plan) return [];

  const availabilities: FeatureAvailability[] = [];

  // Map usage stats to feature keys - only metered features have usage tracking
  const featureUsageMap: Partial<Record<FeatureKey, number>> = {
    ai_content_generation: usageStats.articlesUsed || 0,
    keyword_research: usageStats.keywordResearchUsed || 0,
    serp_analysis: usageStats.serpAnalysisUsed || 0,
    cms_publishing: usageStats.publishedArticlesUsed || 0,
    api_access: usageStats.apiRequestsUsed || 0,
  };

  plan.features.forEach((featureKey) => {
    const usage = featureUsageMap[featureKey] || 0;
    availabilities.push(
      getFeatureAvailability(planId, featureKey, usage, resetDate)
    );
  });

  return availabilities;
}

/**
 * Check if organization can create new resource
 *
 * @param planId - The plan ID to check
 * @param resourceType - Type of resource to create
 * @param currentCount - Current resource count
 * @returns Validation result
 */
export function canCreateResource(
  planId: string,
  resourceType: 'article' | 'keyword' | 'backlink' | 'scheduled_article',
  currentCount: number
): {
  allowed: boolean;
  limit: number;
  reason?: string;
} {
  const plan = getPlan(planId);
  if (!plan) {
    return {
      allowed: false,
      limit: 0,
      reason: 'Plan not found',
    };
  }

  let limit: number;
  let featureKey: FeatureKey;

  switch (resourceType) {
    case 'article':
      limit = plan.limits.articlesPerMonth;
      featureKey = 'ai_content_generation';
      break;
    case 'keyword':
      limit = plan.limits.keywordResearchPerMonth;
      featureKey = 'keyword_research';
      break;
    case 'backlink':
      limit = plan.limits.backlinkExchangeRequests;
      featureKey = 'backlink_exchange';
      break;
    case 'scheduled_article':
      limit = plan.limits.scheduledArticles;
      featureKey = 'scheduled_publishing';
      break;
    default:
      return {
        allowed: false,
        limit: 0,
        reason: 'Unknown resource type',
      };
  }

  if (limit === 0) {
    return {
      allowed: false,
      limit,
      reason: `Resource type not available in plan`,
    };
  }

  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
    };
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      reason: `Monthly limit reached for ${resourceType}`,
    };
  }

  return {
    allowed: true,
    limit,
  };
}

/**
 * Usage Tracking Types
 *
 * This file contains TypeScript types for tracking and enforcing usage limits
 * across different features and resources.
 */

import type { FeatureKey, UsageWarningLevel } from './subscription';

// Re-export for convenience
export type { UsageWarningLevel };

/**
 * Usage metric types that can be tracked
 */
export type UsageMetric =
  // Content metrics
  | 'articles_created'
  | 'ai_words_generated'
  | 'images_generated'
  // SEO metrics
  | 'keyword_research_queries'
  | 'serp_analyses'
  | 'backlink_requests'
  // Publishing metrics
  | 'articles_published'
  | 'scheduled_articles'
  // API metrics
  | 'api_requests'
  | 'webhook_events'
  // Team metrics
  | 'team_members'
  | 'cms_integrations';

/**
 * Usage record for tracking consumption
 */
export interface UsageRecord {
  id: string;
  organizationId: string;
  metric: UsageMetric;
  quantity: number; // Amount consumed (usually 1, but can be more for bulk operations)
  periodStart: Date; // Start of billing period
  periodEnd: Date; // End of billing period
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Usage aggregation for current billing period
 */
export interface UsageAggregate {
  organizationId: string;
  metric: UsageMetric;
  totalUsage: number;
  periodStart: Date;
  periodEnd: Date;
  lastResetAt: Date;
}

/**
 * Usage limit check result
 */
export interface UsageLimitCheck {
  allowed: boolean;
  metric: UsageMetric;
  currentUsage: number;
  limit: number;
  remaining: number;
  resetDate: Date;
  warningLevel: UsageWarningLevel;
  reason?: string;
}

/**
 * Usage enforcement options
 */
export interface UsageEnforcementOptions {
  strict?: boolean; // If true, block operations when limit exceeded
  warnThreshold?: number; // Percentage (0-100) to show warnings (default: 80)
  showUpgradePrompt?: boolean; // Show upgrade prompt when limit exceeded
}

/**
 * Usage tracking context
 */
export interface UsageContext {
  organizationId: string;
  userId?: string;
  resourceId?: string; // ID of the resource being operated on
  operation: 'create' | 'read' | 'update' | 'delete' | 'bulk';
  metadata?: Record<string, any>;
}

/**
 * Usage quota information for UI display
 */
export interface UsageQuotaInfo {
  metric: UsageMetric;
  featureKey: FeatureKey;
  featureName: string;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  resetDate: Date;
  isUnlimited: boolean;
  warningLevel: UsageWarningLevel;
}

/**
 * Usage alert configuration
 */
export interface UsageAlert {
  id: string;
  organizationId: string;
  metric: UsageMetric;
  threshold: number; // Percentage
  alertType: 'warning' | 'critical' | 'exceeded';
  dismissed: boolean;
  createdAt: Date;
}

/**
 * Metric to feature mapping
 */
export interface MetricFeatureMapping {
  metric: UsageMetric;
  featureKey: FeatureKey;
  limitField: keyof import('./subscription').UsageLimits;
}

/**
 * Usage statistics summary
 */
export interface UsageStatsSummary {
  periodStart: Date;
  periodEnd: Date;
  daysRemaining: number;
  metrics: Array<{
    metric: UsageMetric;
    usage: number;
    limit: number;
    percentage: number;
    warningLevel: UsageWarningLevel;
  }>;
}

/**
 * Bulk usage check result
 */
export interface BulkUsageCheck {
  allowed: boolean;
  checks: Array<{
    metric: UsageMetric;
    result: UsageLimitCheck;
  }>;
  blockingReason?: string;
}

/**
 * Usage tracking event
 */
export interface UsageEvent {
  eventType:
    | 'usage_recorded'
    | 'limit_exceeded'
    | 'warning_triggered'
    | 'quota_reset';
  organizationId: string;
  metric: UsageMetric;
  data: Record<string, any>;
  timestamp: Date;
}

// @ts-nocheck - Database types need to be regenerated with Supabase CLI
/**
 * Publishing Queue Types
 *
 * Type definitions for the publishing queue feature
 */

import type { Database } from './database';

type PublishingQueueRow =
  Database['public']['Tables']['publishing_queue']['Row'];
type PublishingQueueInsert =
  Database['public']['Tables']['publishing_queue']['Insert'];
type PublishingQueueUpdateType =
  Database['public']['Tables']['publishing_queue']['Update'];

/**
 * Publishing queue status
 */
export type PublishingQueueStatus =
  | 'pending'
  | 'queued'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

/**
 * Publishing platform
 */
export type PublishingPlatform =
  | 'wordpress'
  | 'webflow'
  | 'shopify'
  | 'ghost'
  | 'notion'
  | 'squarespace'
  | 'wix'
  | 'contentful'
  | 'strapi'
  | 'custom';

/**
 * Error types for retry classification
 */
export type PublishingErrorType =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'auth'
  | 'validation'
  | 'server_error'
  | 'unknown';

/**
 * Publishing Queue Item (from database)
 */
export interface PublishingQueue extends Omit<PublishingQueueRow, 'id'> {
  id: string;
  articleTitle?: string;
  articleSlug?: string;
  integrationName?: string;
}

/**
 * Publishing Queue Item for Create
 */
export interface PublishingQueueCreate extends Omit<
  PublishingQueueInsert,
  'article_id' | 'integration_id'
> {
  article_id?: string;
  integration_id?: string;
}

/**
 * Publishing Queue Item for Update
 */
export type PublishingQueueUpdate = Partial<PublishingQueueUpdateType>;

/**
 * Publishing Queue Filters
 */
export interface PublishingQueueFilters {
  productId?: string;
  articleId?: string;
  status?: PublishingQueueStatus;
  platform?: PublishingPlatform;
  search?: string;
}

/**
 * Publishing Queue Sort Options
 */
export type PublishingQueueSort =
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'platform'
  | 'priority'
  | 'scheduled_for'
  | 'completed_at';

/**
 * Publishing Queue Statistics
 */
export interface PublishingQueueStats {
  total: number;
  byStatus: Record<PublishingQueueStatus, number>;
  byPlatform: Record<PublishingPlatform, number>;
  failedCount: number;
  publishingCount: number;
  avgRetryCount: number;
}

/**
 * Publishing Queue Item Status Badge
 */
export interface PublishingQueueStatusBadge {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Platform Label and Colors
 */
export interface PlatformInfo {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

/**
 * Status Labels and Colors
 */
export const PUBLISHING_QUEUE_STATUS_LABELS: Record<
  PublishingQueueStatus,
  string
> = {
  pending: 'Pending',
  queued: 'Queued',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  cancelled: 'Cancelled',
} as const;

/**
 * Status Colors
 */
export const PUBLISHING_QUEUE_STATUS_COLORS: Record<
  PublishingQueueStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
  },
  queued: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  publishing: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  published: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  failed: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  cancelled: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
} as const;

/**
 * Platform Labels and Info
 */
export const PUBLISHING_PLATFORM_LABELS: Record<PublishingPlatform, string> = {
  wordpress: 'WordPress',
  webflow: 'Webflow',
  shopify: 'Shopify',
  ghost: 'Ghost',
  notion: 'Notion',
  squarespace: 'Squarespace',
  wix: 'Wix',
  contentful: 'Contentful',
  strapi: 'Strapi',
  custom: 'Custom',
} as const;

/**
 * Platform Colors
 */
export const PUBLISHING_PLATFORM_COLORS: Record<
  PublishingPlatform,
  { bg: string; text: string; icon: string }
> = {
  wordpress: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'W',
  },
  webflow: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'Wf',
  },
  shopify: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    icon: 'Sh',
  },
  ghost: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: 'Gh',
  },
  notion: {
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    text: 'text-slate-700 dark:text-slate-300',
    icon: 'N',
  },
  squarespace: {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    icon: 'Sq',
  },
  wix: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    icon: 'Wi',
  },
  contentful: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'Cf',
  },
  strapi: {
    bg: 'bg-sky-50 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    icon: 'St',
  },
  custom: {
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
    icon: 'Cu',
  },
} as const;

/**
 * Default values for publishing queue items
 */
export const DEFAULT_PUBLISHING_QUEUE_VALUES = {
  status: 'pending' as PublishingQueueStatus,
  retry_count: 0,
  max_retries: 3,
  priority: 0,
  metadata: {},
  published_data: {},
};

/**
 * Priority levels
 */
export type PublishingPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Priority labels and values
 */
export const PUBLISHING_PRIORITY_VALUES: Record<PublishingPriority, number> = {
  low: 0,
  normal: 5,
  high: 10,
  urgent: 20,
} as const;

/**
 * Priority labels
 */
export const PUBLISHING_PRIORITY_LABELS: Record<PublishingPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
} as const;

/**
 * Priority colors
 */
export const PUBLISHING_PRIORITY_COLORS: Record<
  PublishingPriority,
  { bg: string; text: string; border: string }
> = {
  low: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
  },
  normal: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  high: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  urgent: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
} as const;

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Error type labels
 */
export const PUBLISHING_ERROR_TYPE_LABELS: Record<PublishingErrorType, string> =
  {
    network: 'Network Error',
    timeout: 'Timeout',
    rate_limit: 'Rate Limited',
    auth: 'Authentication Error',
    validation: 'Validation Error',
    server_error: 'Server Error',
    unknown: 'Unknown Error',
  } as const;

/**
 * Error type colors
 */
export const PUBLISHING_ERROR_TYPE_COLORS: Record<
  PublishingErrorType,
  { bg: string; text: string; border: string }
> = {
  network: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  timeout: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  rate_limit: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  auth: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  validation: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  server_error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  unknown: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  },
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  BASE_DELAY_MS: 1000, // 1 second
  MAX_DELAY_MS: 60000, // 60 seconds
  MAX_RETRIES: 3,
} as const;

/**
 * Calculate exponential backoff delay
 */
export function calculateRetryDelay(retryCount: number): number {
  const { BASE_DELAY_MS, MAX_DELAY_MS } = RETRY_CONFIG;
  return Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
}

/**
 * Check if error type is retriable
 */
export function isRetriableError(errorType: PublishingErrorType): boolean {
  // Auth and validation errors are not retriable by default
  return !['auth', 'validation'].includes(errorType);
}

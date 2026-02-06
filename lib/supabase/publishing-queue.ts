// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Publishing Queue Utilities
 *
 * Helper functions for working with the publishing queue.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';
import type {
  PublishingQueue,
  PublishingQueueCreate,
  PublishingQueueUpdate,
  PublishingQueueStatus,
  PublishingPlatform,
  PublishingQueueStats,
  PublishingErrorType,
} from '@/types/publishing-queue';
import { classifyError } from '@/lib/publishing/retry-service';

type PublishingQueueRow =
  Database['public']['Tables']['publishing_queue']['Row'];
type PublishingQueueInsert =
  Database['public']['Tables']['publishing_queue']['Insert'];
type PublishingQueueUpdate =
  Database['public']['Tables']['publishing_queue']['Update'];

/**
 * Result type for publishing queue operations
 */
export type PublishingQueueResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default values for optional fields
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
 * Get a publishing queue item by ID
 */
export async function getPublishingQueueItemById(
  client: SupabaseClient<Database>,
  itemId: string
): Promise<PublishingQueueResult<PublishingQueueRow>> {
  try {
    const { data, error } = await client
      .from('publishing_queue')
      .select('*')
      .eq('id', itemId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Publishing queue item not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch publishing queue item',
    };
  }
}

/**
 * Get all publishing queue items for an organization
 */
export async function getOrganizationPublishingQueue(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    includeDeleted?: boolean;
    productId?: string;
    articleId?: string;
    status?: PublishingQueueStatus;
    platform?: PublishingPlatform;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?:
      | 'created_at'
      | 'updated_at'
      | 'status'
      | 'platform'
      | 'priority'
      | 'scheduled_for'
      | 'completed_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<PublishingQueueResult<PublishingQueueRow[]>> {
  try {
    let query = client
      .from('publishing_queue')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.articleId) {
      query = query.eq('article_id', options.articleId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options.search) {
      query = query.or(
        `last_error.ilike.%${options.search}%,published_url.ilike.%${options.search}%`
      );
    }

    // Apply sorting
    const sortColumn = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        (options.offset || 0) + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No publishing queue items found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch publishing queue items',
    };
  }
}

/**
 * Get publishing queue items for an article
 */
export async function getArticlePublishingQueue(
  client: SupabaseClient<Database>,
  articleId: string,
  options: {
    includeDeleted?: boolean;
    status?: PublishingQueueStatus;
    limit?: number;
  } = {}
): Promise<PublishingQueueResult<PublishingQueueRow[]>> {
  try {
    let query = client
      .from('publishing_queue')
      .select('*')
      .eq('article_id', articleId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No publishing queue items found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article publishing queue',
    };
  }
}

/**
 * Get pending items ready for processing
 */
export async function getPendingPublishingItems(
  client: SupabaseClient<Database>,
  options: {
    platform?: PublishingPlatform;
    limit?: number;
  } = {}
): Promise<PublishingQueueResult<PublishingQueueRow[]>> {
  try {
    const result = await client.rpc('get_pending_publishing_items', {
      p_platform: options.platform || null,
      p_limit: options.limit || 10,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data || [] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch pending publishing items',
    };
  }
}

/**
 * Create a new publishing queue item
 */
export async function createPublishingQueueItem(
  client: SupabaseClient<Database>,
  item: PublishingQueueInsert
): Promise<PublishingQueueResult<PublishingQueueRow>> {
  try {
    const { data, error } = await client
      .from('publishing_queue')
      .insert({
        organization_id: item.organization_id,
        product_id: item.product_id || null,
        article_id: item.article_id || null,
        integration_id: item.integration_id || null,
        platform: item.platform,
        status: item.status || DEFAULT_PUBLISHING_QUEUE_VALUES.status,
        retry_count:
          item.retry_count ?? DEFAULT_PUBLISHING_QUEUE_VALUES.retry_count,
        max_retries:
          item.max_retries ?? DEFAULT_PUBLISHING_QUEUE_VALUES.max_retries,
        priority: item.priority ?? DEFAULT_PUBLISHING_QUEUE_VALUES.priority,
        scheduled_for: item.scheduled_for || null,
        metadata: (item.metadata ||
          DEFAULT_PUBLISHING_QUEUE_VALUES.metadata) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create publishing queue item');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create publishing queue item',
    };
  }
}

/**
 * Queue an article for publishing
 */
export async function queueArticleForPublishing(
  client: SupabaseClient<Database>,
  organizationId: string,
  articleId: string,
  platform: PublishingPlatform,
  options: {
    integrationId?: string;
    priority?: number;
    scheduledFor?: string;
    productId?: string;
  } = {}
): Promise<PublishingQueueResult<PublishingQueueRow>> {
  try {
    const result = await client.rpc('queue_article_for_publishing', {
      p_organization_id: organizationId,
      p_article_id: articleId,
      p_platform: platform,
      p_integration_id: options.integrationId || null,
      p_priority: options.priority || 0,
      p_scheduled_for: options.scheduledFor || null,
    });

    if (result.error) throw result.error;

    // Fetch the created item
    const newItem = await getPublishingQueueItemById(
      client,
      result.data as string
    );
    return newItem;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to queue article for publishing',
    };
  }
}

/**
 * Update a publishing queue item
 */
export async function updatePublishingQueueItem(
  client: SupabaseClient<Database>,
  itemId: string,
  updates: PublishingQueueUpdate
): Promise<PublishingQueueResult<PublishingQueueRow>> {
  try {
    const { data, error } = await client
      .from('publishing_queue')
      .update(updates)
      .eq('id', itemId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Publishing queue item not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update publishing queue item',
    };
  }
}

/**
 * Mark item as publishing
 */
export async function markPublishingItemStarted(
  client: SupabaseClient<Database>,
  itemId: string
): Promise<PublishingQueueResult<boolean>> {
  try {
    const result = await client.rpc('mark_publishing_item_started', {
      p_item_id: itemId,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark publishing item as started',
    };
  }
}

/**
 * Mark item as completed
 */
export async function markPublishingItemCompleted(
  client: SupabaseClient<Database>,
  itemId: string,
  options: {
    publishedUrl?: string;
    publishedPostId?: string;
    publishedData?: Record<string, unknown>;
  } = {}
): Promise<PublishingQueueResult<boolean>> {
  try {
    const result = await client.rpc('mark_publishing_item_completed', {
      p_item_id: itemId,
      p_published_url: options.publishedUrl || null,
      p_published_post_id: options.publishedPostId || null,
      p_published_data: (options.publishedData || {}) as Json,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark publishing item as completed',
    };
  }
}

/**
 * Mark item as failed with error classification
 */
export async function markPublishingItemFailed(
  client: SupabaseClient<Database>,
  itemId: string,
  errorMessage: string,
  errorType?: PublishingErrorType
): Promise<PublishingQueueResult<boolean>> {
  try {
    // Classify error if not provided
    const classification = errorType
      ? { type: errorType }
      : classifyError(errorMessage);

    const result = await client.rpc('mark_publishing_item_failed', {
      p_item_id: itemId,
      p_error_message: errorMessage,
      p_error_type: classification.type,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark publishing item as failed',
    };
  }
}

/**
 * Get items ready for retry (whose retry_after time has passed)
 */
export async function getItemsReadyForRetry(
  client: SupabaseClient<Database>,
  options: {
    platform?: PublishingPlatform;
    limit?: number;
  } = {}
): Promise<PublishingQueueResult<PublishingQueueRow[]>> {
  try {
    const result = await client.rpc('get_items_ready_for_retry', {
      p_platform: options.platform || null,
      p_limit: options.limit || 50,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data || [] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get items ready for retry',
    };
  }
}

/**
 * Cancel a queued item
 */
export async function cancelPublishingItem(
  client: SupabaseClient<Database>,
  itemId: string
): Promise<PublishingQueueResult<boolean>> {
  try {
    const result = await client.rpc('cancel_publishing_item', {
      p_item_id: itemId,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to cancel publishing item',
    };
  }
}

/**
 * Retry a failed item
 */
export async function retryPublishingItem(
  client: SupabaseClient<Database>,
  itemId: string
): Promise<PublishingQueueResult<boolean>> {
  try {
    const result = await client.rpc('retry_publishing_item', {
      p_item_id: itemId,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to retry publishing item',
    };
  }
}

/**
 * Soft delete a publishing queue item
 */
export async function softDeletePublishingQueueItem(
  client: SupabaseClient<Database>,
  itemId: string
): Promise<PublishingQueueResult<void>> {
  try {
    const { error } = await client
      .from('publishing_queue')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', itemId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete publishing queue item',
    };
  }
}

/**
 * Permanently delete a publishing queue item (use with caution)
 */
export async function deletePublishingQueueItem(
  client: SupabaseClient<Database>,
  itemId: string
): Promise<PublishingQueueResult<void>> {
  try {
    const { error } = await client
      .from('publishing_queue')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete publishing queue item',
    };
  }
}

/**
 * Get publishing queue statistics for an organization
 */
export async function getPublishingQueueStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string
): Promise<PublishingQueueResult<PublishingQueueStats>> {
  try {
    let query = client
      .from('publishing_queue')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No publishing queue items found');

    const byStatus: Record<PublishingQueueStatus, number> = {
      pending: 0,
      queued: 0,
      publishing: 0,
      published: 0,
      failed: 0,
      cancelled: 0,
    };

    const byPlatform: Record<PublishingPlatform, number> = {
      wordpress: 0,
      webflow: 0,
      shopify: 0,
      ghost: 0,
      notion: 0,
      squarespace: 0,
      wix: 0,
      contentful: 0,
      strapi: 0,
      custom: 0,
    };

    let totalRetryCount = 0;

    for (const item of data) {
      byStatus[item.status as PublishingQueueStatus]++;
      byPlatform[item.platform as PublishingPlatform]++;
      totalRetryCount += item.retry_count || 0;
    }

    return {
      success: true,
      data: {
        total: data.length,
        byStatus,
        byPlatform,
        failedCount: byStatus.failed,
        publishingCount: byStatus.publishing,
        avgRetryCount: data.length > 0 ? totalRetryCount / data.length : 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch publishing queue stats',
    };
  }
}

/**
 * Validate publishing queue item data
 */
export function validatePublishingQueueItem(item: {
  platform?: string;
  priority?: number;
  max_retries?: number;
  scheduled_for?: string;
  published_url?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validPlatforms: PublishingPlatform[] = [
    'wordpress',
    'webflow',
    'shopify',
    'ghost',
    'notion',
    'squarespace',
    'wix',
    'contentful',
    'strapi',
    'custom',
  ];

  if (
    item.platform !== undefined &&
    !validPlatforms.includes(item.platform as PublishingPlatform)
  ) {
    errors.push('Invalid platform');
  }

  if (
    item.priority !== undefined &&
    (typeof item.priority !== 'number' ||
      item.priority < 0 ||
      item.priority > 100)
  ) {
    errors.push('Priority must be a number between 0 and 100');
  }

  if (
    item.max_retries !== undefined &&
    (typeof item.max_retries !== 'number' || item.max_retries < 0)
  ) {
    errors.push('Max retries must be a non-negative number');
  }

  if (item.scheduled_for !== undefined && item.scheduled_for !== '') {
    try {
      new Date(item.scheduled_for);
    } catch {
      errors.push('Scheduled for must be a valid date');
    }
  }

  if (item.published_url !== undefined && item.published_url !== '') {
    try {
      new URL(item.published_url);
    } catch {
      errors.push('Published URL must be a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

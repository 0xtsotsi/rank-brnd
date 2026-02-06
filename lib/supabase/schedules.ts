// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Schedules Utilities
 *
 * Helper functions for working with scheduled articles.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type Article = Database['public']['Tables']['articles']['Row'];

/**
 * Schedule status types
 */
export type ScheduleStatus =
  | 'pending'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

/**
 * Recurrence types for recurring schedules
 */
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Schedule data structure (virtual, based on articles with scheduled_at)
 */
export interface Schedule {
  id: string; // article_id
  article_id: string;
  organization_id: string;
  product_id: string | null;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  scheduled_at: string | null;
  published_at: string | null;
  author_id: string | null;
  tags: string[];
  category: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  // Computed schedule properties
  schedule_status?: ScheduleStatus;
  recurrence?: RecurrenceType;
  recurrence_end_date?: string | null;
  notes?: string | null;
}

/**
 * Schedule insert/update data
 */
export interface ScheduleInsert {
  article_id: string;
  scheduled_at: string;
  status?: ScheduleStatus;
  recurrence?: RecurrenceType;
  recurrence_end_date?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ScheduleUpdate {
  article_id?: string;
  scheduled_at?: string;
  status?: ScheduleStatus;
  recurrence?: RecurrenceType;
  recurrence_end_date?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Result type for schedule operations
 */
export type ScheduleResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get all scheduled articles for an organization
 */
export async function getScheduledArticles(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    productId?: string;
    status?: ScheduleStatus;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'scheduled_at' | 'created_at' | 'title' | 'status';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ScheduleResult<Schedule[]>> {
  try {
    let query = client
      .from('articles')
      .select('*')
      .eq('organization_id', organizationId)
      .not('scheduled_at', 'is', null)
      .is('deleted_at', null);

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    // Date range filtering
    if (options.dateFrom) {
      query = query.gte('scheduled_at', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.lte('scheduled_at', options.dateTo);
    }

    // Search in title and content
    if (options.search) {
      query = query.or(
        `title.ilike.%${options.search}%,content.ilike.%${options.search}%,slug.ilike.%${options.search}%`
      );
    }

    // Apply sorting
    const sortColumn = options.sortBy || 'scheduled_at';
    const sortOrder = options.sortOrder || 'asc';
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
    if (!data) throw new Error('No scheduled articles found');

    // Map articles to schedule format
    const schedules: Schedule[] = data.map((article) => ({
      id: article.id,
      article_id: article.id,
      organization_id: article.organization_id,
      product_id: article.product_id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      featured_image_url: article.featured_image_url,
      status: article.status as 'draft' | 'published' | 'archived',
      scheduled_at: article.scheduled_at,
      published_at: article.published_at,
      author_id: article.author_id,
      tags: (article.tags as unknown as string[]) || [],
      category: article.category,
      metadata: article.metadata as Json,
      created_at: article.created_at,
      updated_at: article.updated_at,
      schedule_status: getScheduleStatus(article),
    }));

    return { success: true, data: schedules };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch scheduled articles',
    };
  }
}

/**
 * Get a scheduled article by ID
 */
export async function getScheduledArticleById(
  client: SupabaseClient<Database>,
  scheduleId: string,
  organizationId: string
): Promise<ScheduleResult<Schedule>> {
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)
      .not('scheduled_at', 'is', null)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Scheduled article not found');

    const schedule: Schedule = {
      id: data.id,
      article_id: data.id,
      organization_id: data.organization_id,
      product_id: data.product_id,
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      featured_image_url: data.featured_image_url,
      status: data.status as 'draft' | 'published' | 'archived',
      scheduled_at: data.scheduled_at,
      published_at: data.published_at,
      author_id: data.author_id,
      tags: (data.tags as unknown as string[]) || [],
      category: data.category,
      metadata: data.metadata as Json,
      created_at: data.created_at,
      updated_at: data.updated_at,
      schedule_status: getScheduleStatus(data),
    };

    return { success: true, data: schedule };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch scheduled article',
    };
  }
}

/**
 * Schedule an article
 */
export async function scheduleArticle(
  client: SupabaseClient<Database>,
  articleId: string,
  scheduledAt: string,
  options: {
    status?: ScheduleStatus;
    recurrence?: RecurrenceType;
    recurrenceEndDate?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<ScheduleResult<Schedule>> {
  try {
    // Get the article first to verify it exists
    const { data: article, error: fetchError } = await client
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .is('deleted_at', null)
      .single();

    if (fetchError) throw fetchError;
    if (!article) throw new Error('Article not found');

    // Update the article with scheduled_at and store schedule metadata
    const metadata = {
      ...((article.metadata as Record<string, unknown>) || {}),
      schedule: {
        recurrence: options.recurrence || 'none',
        recurrence_end_date: options.recurrenceEndDate || null,
        notes: options.notes || null,
        ...options.metadata,
      },
    };

    const { data, error } = await client
      .from('articles')
      .update({
        scheduled_at: scheduledAt,
        metadata: metadata as Json,
      })
      .eq('id', articleId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to schedule article');

    const schedule: Schedule = {
      id: data.id,
      article_id: data.id,
      organization_id: data.organization_id,
      product_id: data.product_id,
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      featured_image_url: data.featured_image_url,
      status: data.status as 'draft' | 'published' | 'archived',
      scheduled_at: data.scheduled_at,
      published_at: data.published_at,
      author_id: data.author_id,
      tags: (data.tags as unknown as string[]) || [],
      category: data.category,
      metadata: data.metadata as Json,
      created_at: data.created_at,
      updated_at: data.updated_at,
      schedule_status: options.status || 'scheduled',
      recurrence: options.recurrence || 'none',
      recurrence_end_date: options.recurrenceEndDate || null,
      notes: options.notes || null,
    };

    return { success: true, data: schedule };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to schedule article',
    };
  }
}

/**
 * Update a scheduled article
 */
export async function updateScheduledArticle(
  client: SupabaseClient<Database>,
  scheduleId: string,
  organizationId: string,
  updates: ScheduleUpdate
): Promise<ScheduleResult<Schedule>> {
  try {
    // Get current article to preserve existing metadata
    const { data: current } = await client
      .from('articles')
      .select('metadata')
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)
      .single();

    if (!current) {
      throw new Error('Scheduled article not found');
    }

    // Merge metadata
    const existingMetadata =
      (current.metadata as Record<string, unknown>) || {};
    const scheduleMetadata = {
      ...((existingMetadata.schedule as Record<string, unknown>) || {}),
      recurrence: updates.recurrence,
      recurrence_end_date: updates.recurrenceEndDate,
      notes: updates.notes,
      ...updates.metadata,
    };

    const newMetadata = {
      ...existingMetadata,
      schedule: scheduleMetadata,
    };

    // Update the article
    const updateData: Record<string, unknown> = {
      metadata: newMetadata as Json,
    };

    if (updates.scheduled_at !== undefined) {
      updateData.scheduled_at = updates.scheduled_at;
    }

    const { data, error } = await client
      .from('articles')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update scheduled article');

    const schedule: Schedule = {
      id: data.id,
      article_id: data.id,
      organization_id: data.organization_id,
      product_id: data.product_id,
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      featured_image_url: data.featured_image_url,
      status: data.status as 'draft' | 'published' | 'archived',
      scheduled_at: data.scheduled_at,
      published_at: data.published_at,
      author_id: data.author_id,
      tags: (data.tags as unknown as string[]) || [],
      category: data.category,
      metadata: data.metadata as Json,
      created_at: data.created_at,
      updated_at: data.updated_at,
      schedule_status: updates.status,
      recurrence: updates.recurrence,
      recurrence_end_date: updates.recurrenceEndDate,
      notes: updates.notes,
    };

    return { success: true, data: schedule };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update scheduled article',
    };
  }
}

/**
 * Cancel a scheduled article
 */
export async function cancelScheduledArticle(
  client: SupabaseClient<Database>,
  scheduleId: string,
  organizationId: string,
  reason?: string
): Promise<ScheduleResult<void>> {
  try {
    // Get current article to preserve existing metadata
    const { data: current } = await client
      .from('articles')
      .select('metadata')
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)
      .single();

    if (!current) {
      throw new Error('Scheduled article not found');
    }

    // Update metadata to mark as cancelled
    const existingMetadata =
      (current.metadata as Record<string, unknown>) || {};
    const scheduleMetadata = {
      ...((existingMetadata.schedule as Record<string, unknown>) || {}),
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || null,
    };

    const newMetadata = {
      ...existingMetadata,
      schedule: scheduleMetadata,
    };

    // Remove scheduled_at to cancel the schedule
    const { error } = await client
      .from('articles')
      .update({
        scheduled_at: null,
        metadata: newMetadata as Json,
      })
      .eq('id', scheduleId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to cancel scheduled article',
    };
  }
}

/**
 * Delete a scheduled article (removes schedule, not the article itself)
 */
export async function removeSchedule(
  client: SupabaseClient<Database>,
  scheduleId: string,
  organizationId: string
): Promise<ScheduleResult<void>> {
  try {
    // Get current article to preserve existing metadata
    const { data: current } = await client
      .from('articles')
      .select('metadata')
      .eq('id', scheduleId)
      .eq('organization_id', organizationId)
      .single();

    if (!current) {
      throw new Error('Scheduled article not found');
    }

    // Remove schedule metadata
    const existingMetadata =
      (current.metadata as Record<string, unknown>) || {};
    const newMetadata = { ...existingMetadata };
    delete (newMetadata as Record<string, unknown>).schedule;

    // Remove scheduled_at
    const { error } = await client
      .from('articles')
      .update({
        scheduled_at: null,
        metadata: newMetadata as Json,
      })
      .eq('id', scheduleId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to remove schedule',
    };
  }
}

/**
 * Bulk update scheduled articles
 */
export async function bulkUpdateSchedules(
  client: SupabaseClient<Database>,
  scheduleIds: string[],
  organizationId: string,
  updates: {
    scheduled_at?: string;
    status?: ScheduleStatus;
    notes?: string;
  }
): Promise<
  ScheduleResult<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }>
> {
  const successful: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const scheduleId of scheduleIds) {
    try {
      const result = await updateScheduledArticle(
        client,
        scheduleId,
        organizationId,
        updates
      );
      if (result.success) {
        successful.push(scheduleId);
      } else {
        failed.push({ id: scheduleId, error: result.error });
      }
    } catch (error) {
      failed.push({
        id: scheduleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: true,
    data: { successful, failed },
  };
}

/**
 * Get schedule statistics for an organization
 */
export async function getScheduleStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string
): Promise<
  ScheduleResult<{
    total: number;
    pending: number;
    scheduled: number;
    published: number;
    failed: number;
    cancelled: number;
    thisMonth: number;
    nextWeek: number;
  }>
> {
  try {
    let query = client
      .from('articles')
      .select('*')
      .eq('organization_id', organizationId)
      .not('scheduled_at', 'is', null)
      .is('deleted_at', null);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No scheduled articles found');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let pending = 0;
    let scheduled = 0;
    let published = 0;
    let failed = 0;
    let cancelled = 0;
    let thisMonth = 0;
    let nextWeekCount = 0;

    for (const article of data) {
      if (!article.scheduled_at) continue;

      const scheduledDate = new Date(article.scheduled_at);
      const scheduleStatus = getScheduleStatus(article);

      switch (scheduleStatus) {
        case 'pending':
          pending++;
          break;
        case 'scheduled':
          scheduled++;
          break;
        case 'published':
          published++;
          break;
        case 'failed':
          failed++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }

      if (scheduledDate >= startOfMonth && scheduledDate <= endOfMonth) {
        thisMonth++;
      }

      if (scheduledDate <= nextWeek && scheduledDate > now) {
        nextWeekCount++;
      }
    }

    return {
      success: true,
      data: {
        total: data.length,
        pending,
        scheduled,
        published,
        failed,
        cancelled,
        thisMonth,
        nextWeek: nextWeekCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch schedule stats',
    };
  }
}

/**
 * Determine schedule status based on article state
 */
function getScheduleStatus(article: Article): ScheduleStatus {
  if (!article.scheduled_at) {
    return 'cancelled';
  }

  const now = new Date();
  const scheduledDate = new Date(article.scheduled_at);

  if (article.published_at && new Date(article.published_at) <= now) {
    return 'published';
  }

  if (scheduledDate < now) {
    return article.status === 'published' ? 'published' : 'failed';
  }

  const scheduleMetadata = (article.metadata as Record<string, unknown>)
    ?.schedule as Record<string, unknown> | undefined;

  if (scheduleMetadata?.status === 'cancelled') {
    return 'cancelled';
  }

  return 'scheduled';
}

/**
 * Check if a user can access a scheduled article (via organization membership)
 */
export async function canUserAccessSchedule(
  client: SupabaseClient<Database>,
  scheduleId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc(
      'can_access_article' as any,
      {
        p_article_id: scheduleId,
        p_user_id: userId,
      } as any
    );

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get upcoming scheduled articles
 */
export async function getUpcomingSchedules(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    productId?: string;
    days?: number;
    limit?: number;
  } = {}
): Promise<ScheduleResult<Schedule[]>> {
  try {
    const days = options.days || 7;
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    let query = client
      .from('articles')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', endDate.toISOString())
      .is('deleted_at', null);

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    query = query.order('scheduled_at', { ascending: true });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No upcoming scheduled articles found');

    const schedules: Schedule[] = data.map((article) => ({
      id: article.id,
      article_id: article.id,
      organization_id: article.organization_id,
      product_id: article.product_id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      featured_image_url: article.featured_image_url,
      status: article.status as 'draft' | 'published' | 'archived',
      scheduled_at: article.scheduled_at,
      published_at: article.published_at,
      author_id: article.author_id,
      tags: (article.tags as unknown as string[]) || [],
      category: article.category,
      metadata: article.metadata as Json,
      created_at: article.created_at,
      updated_at: article.updated_at,
      schedule_status: getScheduleStatus(article),
    }));

    return { success: true, data: schedules };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch upcoming schedules',
    };
  }
}

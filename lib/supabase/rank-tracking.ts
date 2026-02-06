// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Rank Tracking Utilities
 *
 * Helper functions for working with rank tracking data.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type RankTracking = Database['public']['Tables']['rank_tracking']['Row'];
type RankTrackingInsert =
  Database['public']['Tables']['rank_tracking']['Insert'];
type RankTrackingUpdate =
  Database['public']['Tables']['rank_tracking']['Update'];

type RankDevice = 'desktop' | 'mobile' | 'tablet';

/**
 * Result type for rank tracking operations
 */
export type RankTrackingResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default values for optional fields
 */
export const DEFAULT_RANK_TRACKING_VALUES = {
  device: 'desktop' as RankDevice,
  location: 'us',
  search_volume: 0,
  impressions: 0,
  clicks: 0,
  metadata: {},
};

/**
 * Get a rank tracking record by ID
 */
export async function getRankTrackingById(
  client: SupabaseClient<Database>,
  rankTrackingId: string
): Promise<RankTrackingResult<RankTracking>> {
  try {
    const { data, error } = await client
      .from('rank_tracking')
      .select('*')
      .eq('id', rankTrackingId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Rank tracking record not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch rank tracking record',
    };
  }
}

/**
 * Get all rank tracking records for an organization
 */
export async function getOrganizationRankTracking(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    productId?: string;
    keywordId?: string;
    device?: RankDevice;
    location?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minPosition?: number;
    maxPosition?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'position' | 'device' | 'location' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<RankTrackingResult<RankTracking[]>> {
  try {
    let query = client
      .from('rank_tracking')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.keywordId) {
      query = query.eq('keyword_id', options.keywordId);
    }

    if (options.device) {
      query = query.eq('device', options.device);
    }

    if (options.location) {
      query = query.eq('location', options.location);
    }

    if (options.dateFrom) {
      query = query.gte('date', options.dateFrom.toISOString().split('T')[0]);
    }

    if (options.dateTo) {
      query = query.lte('date', options.dateTo.toISOString().split('T')[0]);
    }

    if (options.minPosition) {
      query = query.lte('position', options.minPosition);
    }

    if (options.maxPosition) {
      query = query.gte('position', options.maxPosition);
    }

    // Apply sorting
    const sortColumn = options.sortBy || 'date';
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
    if (!data) throw new Error('No rank tracking records found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch rank tracking records',
    };
  }
}

/**
 * Get rank history for a keyword
 */
export async function getKeywordRankHistory(
  client: SupabaseClient<Database>,
  keywordId: string,
  options: {
    device?: RankDevice;
    location?: string;
    days?: number;
    endDate?: Date;
  } = {}
): Promise<RankTrackingResult<RankTracking[]>> {
  try {
    const { data, error } = await client.rpc('get_keyword_rank_history', {
      p_keyword_id: keywordId,
      p_device: options.device || DEFAULT_RANK_TRACKING_VALUES.device,
      p_location: options.location || DEFAULT_RANK_TRACKING_VALUES.location,
      p_days: options.days || 30,
      p_end_date:
        options.endDate?.toISOString().split('T')[0] ||
        new Date().toISOString().split('T')[0],
    });

    if (error) throw error;
    if (!data) throw new Error('No rank history found');

    return { success: true, data: data as unknown as RankTracking[] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch rank history',
    };
  }
}

/**
 * Get current rank for a keyword
 */
export async function getKeywordCurrentRank(
  client: SupabaseClient<Database>,
  keywordId: string,
  options: {
    device?: RankDevice;
    location?: string;
  } = {}
): Promise<
  RankTrackingResult<{
    keyword_id: string;
    position: number;
    url: string | null;
    date: string;
  } | null>
> {
  try {
    const { data, error } = await client.rpc('get_keyword_current_rank', {
      p_keyword_id: keywordId,
      p_device: options.device || DEFAULT_RANK_TRACKING_VALUES.device,
      p_location: options.location || DEFAULT_RANK_TRACKING_VALUES.location,
    });

    if (error) throw error;

    return {
      success: true,
      data: data as {
        keyword_id: string;
        position: number;
        url: string | null;
        date: string;
      } | null,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch current rank',
    };
  }
}

/**
 * Get rank statistics for a keyword
 */
export async function getKeywordRankStats(
  client: SupabaseClient<Database>,
  keywordId: string,
  options: {
    device?: RankDevice;
    location?: string;
    days?: number;
  } = {}
): Promise<
  RankTrackingResult<{
    avg_position: number;
    min_position: number;
    max_position: number;
    current_position: number | null;
    position_change: number | null;
    total_records: number;
    first_tracked: string;
    last_tracked: string;
  }>
> {
  try {
    const { data, error } = await client.rpc('get_keyword_rank_stats', {
      p_keyword_id: keywordId,
      p_device: options.device || DEFAULT_RANK_TRACKING_VALUES.device,
      p_location: options.location || DEFAULT_RANK_TRACKING_VALUES.location,
      p_days: options.days || 30,
    });

    if (error) throw error;
    if (!data) throw new Error('No rank stats found');

    type RankStatsResult = {
      avg_position: number;
      min_position: number;
      max_position: number;
      current_position: number | null;
      position_change: number | null;
      total_records: number;
      first_tracked: string;
      last_tracked: string;
    };
    return { success: true, data: data as unknown as RankStatsResult };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch rank statistics',
    };
  }
}

/**
 * Create a new rank tracking record
 */
export async function createRankTracking(
  client: SupabaseClient<Database>,
  rankTracking: RankTrackingInsert
): Promise<RankTrackingResult<RankTracking>> {
  try {
    const { data, error } = await client
      .from('rank_tracking')
      .insert({
        organization_id: rankTracking.organization_id,
        product_id: rankTracking.product_id || null,
        keyword_id: rankTracking.keyword_id,
        position: rankTracking.position,
        device: rankTracking.device || DEFAULT_RANK_TRACKING_VALUES.device,
        location:
          rankTracking.location || DEFAULT_RANK_TRACKING_VALUES.location,
        url: rankTracking.url || null,
        date: rankTracking.date || new Date().toISOString().split('T')[0],
        search_volume:
          rankTracking.search_volume ??
          DEFAULT_RANK_TRACKING_VALUES.search_volume,
        ctr: rankTracking.ctr || null,
        impressions:
          rankTracking.impressions ?? DEFAULT_RANK_TRACKING_VALUES.impressions,
        clicks: rankTracking.clicks ?? DEFAULT_RANK_TRACKING_VALUES.clicks,
        metadata: (rankTracking.metadata ||
          DEFAULT_RANK_TRACKING_VALUES.metadata) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create rank tracking record');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create rank tracking record',
    };
  }
}

/**
 * Upsert a rank tracking record (insert or update if exists)
 */
export async function upsertRankTracking(
  client: SupabaseClient<Database>,
  record: {
    organization_id: string;
    product_id?: string;
    keyword_id: string;
    position: number;
    device?: RankDevice;
    location?: string;
    url?: string;
    date?: string;
    search_volume?: number;
    ctr?: number;
    impressions?: number;
    clicks?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<RankTrackingResult<RankTracking>> {
  try {
    const { data, error } = await client.rpc('upsert_rank_tracking', {
      p_organization_id: record.organization_id,
      p_product_id: record.product_id || null,
      p_keyword_id: record.keyword_id,
      p_position: record.position,
      p_device: record.device || DEFAULT_RANK_TRACKING_VALUES.device,
      p_location: record.location || DEFAULT_RANK_TRACKING_VALUES.location,
      p_url: record.url || null,
      p_date:
        record.date?.toISOString().split('T')[0] ||
        new Date().toISOString().split('T')[0],
      p_search_volume:
        record.search_volume ?? DEFAULT_RANK_TRACKING_VALUES.search_volume,
      p_ctr: record.ctr || null,
      p_impressions:
        record.impressions ?? DEFAULT_RANK_TRACKING_VALUES.impressions,
      p_clicks: record.clicks ?? DEFAULT_RANK_TRACKING_VALUES.clicks,
      p_metadata: (record.metadata ||
        DEFAULT_RANK_TRACKING_VALUES.metadata) as unknown as Json,
    });

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert rank tracking record');

    return { success: true, data: data as unknown as RankTracking };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to upsert rank tracking record',
    };
  }
}

/**
 * Bulk insert rank tracking records
 */
export async function bulkInsertRankTracking(
  client: SupabaseClient<Database>,
  records: Array<{
    organization_id: string;
    product_id?: string;
    keyword_id: string;
    position: number;
    device?: RankDevice;
    location?: string;
    url?: string;
    date?: string;
    search_volume?: number;
    ctr?: number;
    impressions?: number;
    clicks?: number;
    metadata?: Record<string, unknown>;
  }>
): Promise<
  RankTrackingResult<{ successful: number; failed: number; errors: string[] }>
> {
  try {
    const formattedRecords = records.map((r) => ({
      organization_id: r.organization_id,
      product_id: r.product_id || null,
      keyword_id: r.keyword_id,
      position: r.position,
      device: r.device || DEFAULT_RANK_TRACKING_VALUES.device,
      location: r.location || DEFAULT_RANK_TRACKING_VALUES.location,
      url: r.url || null,
      date: r.date || new Date().toISOString().split('T')[0],
      search_volume:
        r.search_volume ?? DEFAULT_RANK_TRACKING_VALUES.search_volume,
      ctr: r.ctr || null,
      impressions: r.impressions ?? DEFAULT_RANK_TRACKING_VALUES.impressions,
      clicks: r.clicks ?? DEFAULT_RANK_TRACKING_VALUES.clicks,
      metadata: (r.metadata ||
        DEFAULT_RANK_TRACKING_VALUES.metadata) as unknown as Json,
    }));

    const { data, error } = await client.rpc('bulk_insert_rank_tracking', {
      p_records: formattedRecords as unknown as Json,
    });

    if (error) throw error;

    const results = data as unknown as Array<{
      success: boolean;
      id: string | null;
      error_message: string | null;
    }>;
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const errors = results
      .filter((r) => !r.success && r.error_message)
      .map((r) => r.error_message || 'Unknown error');

    return {
      success: true,
      data: {
        successful,
        failed,
        errors,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to bulk insert rank tracking records',
    };
  }
}

/**
 * Update a rank tracking record
 */
export async function updateRankTracking(
  client: SupabaseClient<Database>,
  rankTrackingId: string,
  updates: RankTrackingUpdate
): Promise<RankTrackingResult<RankTracking>> {
  try {
    const { data, error } = await client
      .from('rank_tracking')
      .update(updates)
      .eq('id', rankTrackingId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Rank tracking record not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update rank tracking record',
    };
  }
}

/**
 * Delete a rank tracking record
 */
export async function deleteRankTracking(
  client: SupabaseClient<Database>,
  rankTrackingId: string
): Promise<RankTrackingResult<void>> {
  try {
    const { error } = await client
      .from('rank_tracking')
      .delete()
      .eq('id', rankTrackingId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete rank tracking record',
    };
  }
}

/**
 * Check if a user can access rank tracking data (via organization membership)
 */
export async function canUserAccessRankTracking(
  client: SupabaseClient<Database>,
  rankTrackingId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_rank_tracking', {
      p_rank_tracking_id: rankTrackingId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get rank tracking summary for multiple keywords
 */
export async function getKeywordsRankSummary(
  client: SupabaseClient<Database>,
  keywordIds: string[],
  options: {
    device?: RankDevice;
    location?: string;
    days?: number;
  } = {}
): Promise<
  RankTrackingResult<
    Map<
      string,
      {
        current_position: number | null;
        avg_position: number;
        position_change: number | null;
      }
    >
  >
> {
  try {
    const summary = new Map<
      string,
      {
        current_position: number | null;
        avg_position: number;
        position_change: number | null;
      }
    >();

    for (const keywordId of keywordIds) {
      const statsResult = await getKeywordRankStats(client, keywordId, options);

      if (statsResult.success && statsResult.data) {
        summary.set(keywordId, {
          current_position: statsResult.data.current_position,
          avg_position: statsResult.data.avg_position,
          position_change: statsResult.data.position_change,
        });
      }
    }

    return { success: true, data: summary };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch keywords rank summary',
    };
  }
}

/**
 * Validate rank tracking data
 */
export function validateRankTracking(data: {
  position?: number;
  device?: string;
  location?: string;
  date?: Date;
  ctr?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.position !== undefined) {
    if (typeof data.position !== 'number') {
      errors.push('Position must be a number');
    } else if (data.position < 1) {
      errors.push('Position must be at least 1');
    }
  }

  if (data.device !== undefined) {
    const validDevices = ['desktop', 'mobile', 'tablet'];
    if (!validDevices.includes(data.device)) {
      errors.push(`Device must be one of: ${validDevices.join(', ')}`);
    }
  }

  if (data.location !== undefined && data.location.length > 10) {
    errors.push('Location code must be 10 characters or less');
  }

  if (data.ctr !== undefined) {
    if (typeof data.ctr !== 'number') {
      errors.push('CTR must be a number');
    } else if (data.ctr < 0 || data.ctr > 1) {
      errors.push('CTR must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

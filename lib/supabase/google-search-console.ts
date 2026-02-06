// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Google Search Console Utilities
 *
 * Helper functions for working with Google Search Console data.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type SearchConsoleData =
  Database['public']['Tables']['google_search_console_data']['Row'];
type SearchConsoleDataInsert =
  Database['public']['Tables']['google_search_console_data']['Insert'];
type SearchConsoleDataUpdate =
  Database['public']['Tables']['google_search_console_data']['Update'];

/**
 * Result type for search console operations
 */
export type SearchConsoleResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Google Search Console metrics
 */
export interface SearchConsoleMetrics {
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  avg_position: number;
  unique_keywords: number;
}

/**
 * Get a search console data record by ID
 */
export async function getSearchConsoleDataById(
  client: SupabaseClient<Database>,
  dataId: string
): Promise<SearchConsoleResult<SearchConsoleData>> {
  try {
    const { data, error } = await client
      .from('google_search_console_data')
      .select('*')
      .eq('id', dataId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Search console data not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch search console data',
    };
  }
}

/**
 * Get all search console data for a product
 */
export async function getProductSearchConsoleData(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    keyword?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?:
      | 'date'
      | 'impressions'
      | 'clicks'
      | 'ctr'
      | 'avg_position'
      | 'keyword';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}
): Promise<SearchConsoleResult<SearchConsoleData[]>> {
  try {
    let query = client
      .from('google_search_console_data')
      .select('*')
      .eq('product_id', productId);

    if (options.keyword) {
      query = query.ilike('keyword', `%${options.keyword}%`);
    }

    if (options.startDate) {
      query = query.gte('date', options.startDate.toISOString().split('T')[0]);
    }

    if (options.endDate) {
      query = query.lte('date', options.endDate.toISOString().split('T')[0]);
    }

    const sortBy = options.sortBy ?? 'date';
    const sortOrder = options.sortOrder ?? 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        (options.offset ?? 0) + (options.limit ?? 100) - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No search console data found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch search console data',
    };
  }
}

/**
 * Get aggregated metrics for a product
 */
export async function getProductSearchConsoleMetrics(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<SearchConsoleResult<SearchConsoleMetrics>> {
  try {
    const startDate = options.startDate?.toISOString().split('T')[0];
    const endDate = options.endDate?.toISOString().split('T')[0];

    const { data, error } = await client.rpc(
      'get_product_search_console_metrics',
      {
        p_product_id: productId,
        p_start_date: startDate ?? null,
        p_end_date: endDate ?? null,
      }
    );

    if (error) throw error;
    if (!data || data.length === 0) {
      // Return empty metrics if no data
      return {
        success: true,
        data: {
          total_impressions: 0,
          total_clicks: 0,
          avg_ctr: 0,
          avg_position: 0,
          unique_keywords: 0,
        },
      };
    }

    // The function returns a single row
    const metrics = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: {
        total_impressions: metrics.total_impressions ?? 0,
        total_clicks: metrics.total_clicks ?? 0,
        avg_ctr: metrics.avg_ctr ?? 0,
        avg_position: metrics.avg_position ?? 0,
        unique_keywords: metrics.unique_keywords ?? 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch search console metrics',
    };
  }
}

/**
 * Create a new search console data record
 */
export async function createSearchConsoleData(
  client: SupabaseClient<Database>,
  data: SearchConsoleDataInsert
): Promise<SearchConsoleResult<SearchConsoleData>> {
  try {
    const { data: result, error } = await client
      .from('google_search_console_data')
      .insert({
        organization_id: data.organization_id,
        product_id: data.product_id,
        keyword: data.keyword,
        impressions: data.impressions ?? 0,
        clicks: data.clicks ?? 0,
        ctr: data.ctr ?? 0,
        avg_position: data.avg_position ?? 0,
        date: data.date,
        metadata: (data.metadata ?? {}) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!result) throw new Error('Failed to create search console data');

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create search console data',
    };
  }
}

/**
 * Bulk upsert search console data records
 */
export async function bulkUpsertSearchConsoleData(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId: string,
  dataArray: Array<{
    keyword: string;
    impressions: number;
    clicks: number;
    ctr: number;
    avg_position: number;
    date: string;
    metadata?: Record<string, unknown>;
  }>
): Promise<SearchConsoleResult<number>> {
  try {
    // Format data for the RPC function
    const formattedData = dataArray.map((item) => ({
      keyword: item.keyword,
      impressions: item.impressions,
      clicks: item.clicks,
      ctr: item.ctr,
      avg_position: item.avg_position,
      date: item.date,
      metadata: item.metadata ?? {},
    }));

    const { data, error } = await client.rpc('upsert_search_console_data', {
      p_organization_id: organizationId,
      p_product_id: productId,
      p_data: formattedData as unknown as Json,
    });

    if (error) throw error;

    return { success: true, data: data ?? 0 };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to bulk upsert search console data',
    };
  }
}

/**
 * Update a search console data record
 */
export async function updateSearchConsoleData(
  client: SupabaseClient<Database>,
  dataId: string,
  updates: SearchConsoleDataUpdate
): Promise<SearchConsoleResult<SearchConsoleData>> {
  try {
    const { data, error } = await client
      .from('google_search_console_data')
      .update(updates)
      .eq('id', dataId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Search console data not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update search console data',
    };
  }
}

/**
 * Delete a search console data record
 */
export async function deleteSearchConsoleData(
  client: SupabaseClient<Database>,
  dataId: string
): Promise<SearchConsoleResult<void>> {
  try {
    const { error } = await client
      .from('google_search_console_data')
      .delete()
      .eq('id', dataId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete search console data',
    };
  }
}

/**
 * Delete all search console data for a product
 */
export async function deleteProductSearchConsoleData(
  client: SupabaseClient<Database>,
  productId: string
): Promise<SearchConsoleResult<void>> {
  try {
    const { error } = await client
      .from('google_search_console_data')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete product search console data',
    };
  }
}

/**
 * Delete search console data for a product within a date range
 */
export async function deleteProductSearchConsoleDataByDateRange(
  client: SupabaseClient<Database>,
  productId: string,
  startDate: Date,
  endDate: Date
): Promise<SearchConsoleResult<void>> {
  try {
    const { error } = await client
      .from('google_search_console_data')
      .delete()
      .eq('product_id', productId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete search console data by date range',
    };
  }
}

/**
 * Check if a user can access search console data (via organization membership)
 */
export async function canUserAccessSearchConsoleData(
  client: SupabaseClient<Database>,
  dataId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_search_console_data', {
      p_data_id: dataId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get top keywords by impressions for a product
 */
export async function getTopKeywordsByImpressions(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
): Promise<SearchConsoleResult<SearchConsoleData[]>> {
  try {
    let query = client
      .from('google_search_console_data')
      .select('*')
      .eq('product_id', productId);

    if (options.startDate) {
      query = query.gte('date', options.startDate.toISOString().split('T')[0]);
    }

    if (options.endDate) {
      query = query.lte('date', options.endDate.toISOString().split('T')[0]);
    }

    query = query.order('impressions', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No search console data found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch top keywords',
    };
  }
}

/**
 * Get search console data trends over time for a product
 */
export async function getSearchConsoleTrends(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month';
  } = {}
): Promise<
  SearchConsoleResult<
    Array<{ date: string; impressions: number; clicks: number; ctr: number }>
  >
> {
  try {
    let query = client
      .from('google_search_console_data')
      .select('date, impressions, clicks, ctr')
      .eq('product_id', productId);

    if (options.startDate) {
      query = query.gte('date', options.startDate.toISOString().split('T')[0]);
    }

    if (options.endDate) {
      query = query.lte('date', options.endDate.toISOString().split('T')[0]);
    }

    query = query.order('date', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No search console data found');

    // Group by date and aggregate
    const trends = new Map<
      string,
      { impressions: number; clicks: number; ctr_sum: number; count: number }
    >();

    for (const row of data) {
      const date = row.date;
      const existing = trends.get(date) ?? {
        impressions: 0,
        clicks: 0,
        ctr_sum: 0,
        count: 0,
      };

      existing.impressions += row.impressions ?? 0;
      existing.clicks += row.clicks ?? 0;
      existing.ctr_sum += row.ctr ?? 0;
      existing.count += 1;

      trends.set(date, existing);
    }

    // Convert to array and calculate average CTR
    const result = Array.from(trends.entries()).map(([date, values]) => ({
      date,
      impressions: values.impressions,
      clicks: values.clicks,
      ctr: values.count > 0 ? values.ctr_sum / values.count : 0,
    }));

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch search console trends',
    };
  }
}

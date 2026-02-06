// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Keywords Utilities
 *
 * Helper functions for working with keywords tracked by organizations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type Keyword = Database['public']['Tables']['keywords']['Row'];
type KeywordInsert = Database['public']['Tables']['keywords']['Insert'];
type KeywordUpdate = Database['public']['Tables']['keywords']['Update'];

type KeywordStatus = 'tracking' | 'paused' | 'opportunity' | 'ignored';
type SearchIntent =
  | 'informational'
  | 'navigational'
  | 'transactional'
  | 'commercial';
type DifficultyLevel = 'very-easy' | 'easy' | 'medium' | 'hard' | 'very-hard';

/**
 * Result type for keyword operations
 */
export type KeywordResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default values for optional fields
 */
export const DEFAULT_KEYWORD_VALUES = {
  search_volume: 0,
  difficulty: 'medium' as DifficultyLevel,
  intent: 'informational' as SearchIntent,
  opportunity_score: 0,
  status: 'tracking' as KeywordStatus,
  tags: [],
  metadata: {},
};

/**
 * Get a keyword by ID
 */
export async function getKeywordById(
  client: SupabaseClient<Database>,
  keywordId: string
): Promise<KeywordResult<Keyword>> {
  try {
    const { data, error } = await client
      .from('keywords')
      .select('*')
      .eq('id', keywordId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Keyword not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch keyword',
    };
  }
}

/**
 * Get all keywords for an organization
 */
export async function getOrganizationKeywords(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    includeDeleted?: boolean;
    productId?: string;
    status?: KeywordStatus;
    intent?: SearchIntent;
    difficulty?: DifficultyLevel;
    minOpportunityScore?: number;
    maxOpportunityScore?: number;
    minSearchVolume?: number;
    maxSearchVolume?: number;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?:
      | 'keyword'
      | 'search_volume'
      | 'difficulty'
      | 'intent'
      | 'status'
      | 'opportunity_score'
      | 'current_rank'
      | 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<KeywordResult<Keyword[]>> {
  try {
    let query = client
      .from('keywords')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.intent) {
      query = query.eq('intent', options.intent);
    }

    if (options.difficulty) {
      query = query.eq('difficulty', options.difficulty);
    }

    if (options.minOpportunityScore !== undefined) {
      query = query.gte('opportunity_score', options.minOpportunityScore);
    }

    if (options.maxOpportunityScore !== undefined) {
      query = query.lte('opportunity_score', options.maxOpportunityScore);
    }

    if (options.minSearchVolume !== undefined) {
      query = query.gte('search_volume', options.minSearchVolume);
    }

    if (options.maxSearchVolume !== undefined) {
      query = query.lte('search_volume', options.maxSearchVolume);
    }

    if (options.search) {
      query = query.ilike('keyword', `%${options.search}%`);
    }

    if (options.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
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
    if (!data) throw new Error('No keywords found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch keywords',
    };
  }
}

/**
 * Get all keywords for a product
 */
export async function getProductKeywords(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    includeDeleted?: boolean;
    status?: KeywordStatus;
    limit?: number;
  } = {}
): Promise<KeywordResult<Keyword[]>> {
  try {
    let query = client.from('keywords').select('*').eq('product_id', productId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('opportunity_score', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No keywords found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch keywords',
    };
  }
}

/**
 * Create a new keyword
 */
export async function createKeyword(
  client: SupabaseClient<Database>,
  keyword: KeywordInsert
): Promise<KeywordResult<Keyword>> {
  try {
    const { data, error } = await client
      .from('keywords')
      .insert({
        organization_id: keyword.organization_id,
        product_id: keyword.product_id || null,
        keyword: keyword.keyword,
        search_volume:
          keyword.search_volume ?? DEFAULT_KEYWORD_VALUES.search_volume,
        difficulty: keyword.difficulty || DEFAULT_KEYWORD_VALUES.difficulty,
        intent: keyword.intent || DEFAULT_KEYWORD_VALUES.intent,
        opportunity_score:
          keyword.opportunity_score ?? DEFAULT_KEYWORD_VALUES.opportunity_score,
        status: keyword.status || DEFAULT_KEYWORD_VALUES.status,
        current_rank: keyword.current_rank || null,
        target_url: keyword.target_url || null,
        cpc: keyword.cpc || null,
        competition: keyword.competition || null,
        notes: keyword.notes || null,
        tags: (keyword.tags || DEFAULT_KEYWORD_VALUES.tags) as unknown as Json,
        metadata: (keyword.metadata ||
          DEFAULT_KEYWORD_VALUES.metadata) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create keyword');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create keyword',
    };
  }
}

/**
 * Bulk create keywords
 */
export async function bulkCreateKeywords(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId: string | null,
  keywords: Array<{
    keyword: string;
    search_volume?: number;
    difficulty?: DifficultyLevel;
    intent?: SearchIntent;
    tags?: string[];
    target_url?: string;
    notes?: string;
  }>
): Promise<
  KeywordResult<{ successful: number; failed: number; errors: string[] }>
> {
  const errors: string[] = [];
  let successful = 0;

  for (const kw of keywords) {
    try {
      const result = await createKeyword(client, {
        organization_id: organizationId,
        product_id: productId || undefined,
        keyword: kw.keyword,
        search_volume: kw.search_volume,
        difficulty: kw.difficulty,
        intent: kw.intent,
        tags: kw.tags,
        target_url: kw.target_url,
        notes: kw.notes,
      });

      if (result.success) {
        successful++;
      } else {
        errors.push(`${kw.keyword}: ${result.error}`);
      }
    } catch (error) {
      errors.push(
        `${kw.keyword}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return {
    success: true,
    data: {
      successful,
      failed: errors.length,
      errors,
    },
  };
}

/**
 * Update a keyword
 */
export async function updateKeyword(
  client: SupabaseClient<Database>,
  keywordId: string,
  updates: KeywordUpdate
): Promise<KeywordResult<Keyword>> {
  try {
    const { data, error } = await client
      .from('keywords')
      .update(updates)
      .eq('id', keywordId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Keyword not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update keyword',
    };
  }
}

/**
 * Update keyword status
 */
export async function updateKeywordStatus(
  client: SupabaseClient<Database>,
  keywordId: string,
  status: KeywordStatus
): Promise<KeywordResult<Keyword>> {
  return updateKeyword(client, keywordId, { status });
}

/**
 * Update keyword rank
 */
export async function updateKeywordRank(
  client: SupabaseClient<Database>,
  keywordId: string,
  currentRank: number
): Promise<KeywordResult<Keyword>> {
  return updateKeyword(client, keywordId, { current_rank: currentRank });
}

/**
 * Soft delete a keyword
 */
export async function softDeleteKeyword(
  client: SupabaseClient<Database>,
  keywordId: string
): Promise<KeywordResult<void>> {
  try {
    const { error } = await client
      .from('keywords')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', keywordId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete keyword',
    };
  }
}

/**
 * Permanently delete a keyword (use with caution)
 */
export async function deleteKeyword(
  client: SupabaseClient<Database>,
  keywordId: string
): Promise<KeywordResult<void>> {
  try {
    const { error } = await client
      .from('keywords')
      .delete()
      .eq('id', keywordId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete keyword',
    };
  }
}

/**
 * Check if a user can access a keyword (via organization membership)
 */
export async function canUserAccessKeyword(
  client: SupabaseClient<Database>,
  keywordId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_keyword', {
      p_keyword_id: keywordId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Calculate opportunity score using the database function
 */
export async function calculateOpportunityScore(
  client: SupabaseClient<Database>,
  searchVolume: number,
  difficulty: DifficultyLevel,
  currentRank?: number
): Promise<KeywordResult<number>> {
  try {
    const { data, error } = await client.rpc('calculate_opportunity_score', {
      p_search_volume: searchVolume,
      p_difficulty: difficulty,
      p_current_rank: currentRank || null,
    });

    if (error) throw error;
    if (data === null) throw new Error('Failed to calculate opportunity score');

    return { success: true, data: data as number };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to calculate opportunity score',
    };
  }
}

/**
 * Get keyword statistics for an organization
 */
export async function getKeywordStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string
): Promise<
  KeywordResult<{
    total: number;
    byStatus: Record<KeywordStatus, number>;
    byIntent: Record<SearchIntent, number>;
    byDifficulty: Record<DifficultyLevel, number>;
    avgOpportunityScore: number;
    totalSearchVolume: number;
  }>
> {
  try {
    let query = client
      .from('keywords')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No keywords found');

    const byStatus: Record<KeywordStatus, number> = {
      tracking: 0,
      paused: 0,
      opportunity: 0,
      ignored: 0,
    };

    const byIntent: Record<SearchIntent, number> = {
      informational: 0,
      navigational: 0,
      transactional: 0,
      commercial: 0,
    };

    const byDifficulty: Record<DifficultyLevel, number> = {
      'very-easy': 0,
      easy: 0,
      medium: 0,
      hard: 0,
      'very-hard': 0,
    };

    let totalOpportunityScore = 0;
    let totalSearchVolume = 0;

    for (const keyword of data) {
      byStatus[keyword.status as KeywordStatus]++;
      byIntent[keyword.intent as SearchIntent]++;
      byDifficulty[keyword.difficulty as DifficultyLevel]++;
      totalOpportunityScore += keyword.opportunity_score || 0;
      totalSearchVolume += keyword.search_volume || 0;
    }

    return {
      success: true,
      data: {
        total: data.length,
        byStatus,
        byIntent,
        byDifficulty,
        avgOpportunityScore:
          data.length > 0 ? totalOpportunityScore / data.length : 0,
        totalSearchVolume,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch keyword stats',
    };
  }
}

/**
 * Validate keyword data
 */
export function validateKeyword(keyword: {
  keyword?: string;
  target_url?: string;
  cpc?: number;
  competition?: number;
  opportunity_score?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (keyword.keyword !== undefined) {
    if (typeof keyword.keyword !== 'string') {
      errors.push('Keyword must be a string');
    } else if (keyword.keyword.length === 0) {
      errors.push('Keyword cannot be empty');
    } else if (keyword.keyword.length > 500) {
      errors.push('Keyword cannot exceed 500 characters');
    }
  }

  if (keyword.target_url !== undefined && keyword.target_url !== '') {
    try {
      new URL(keyword.target_url);
    } catch {
      errors.push('Target URL must be a valid URL');
    }
  }

  if (
    keyword.cpc !== undefined &&
    (typeof keyword.cpc !== 'number' || keyword.cpc < 0 || keyword.cpc > 100)
  ) {
    errors.push('CPC must be a number between 0 and 100');
  }

  if (
    keyword.competition !== undefined &&
    (typeof keyword.competition !== 'number' ||
      keyword.competition < 0 ||
      keyword.competition > 1)
  ) {
    errors.push('Competition must be a number between 0 and 1');
  }

  if (
    keyword.opportunity_score !== undefined &&
    (typeof keyword.opportunity_score !== 'number' ||
      keyword.opportunity_score < 0 ||
      keyword.opportunity_score > 100)
  ) {
    errors.push('Opportunity score must be a number between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Article Outlines Utilities
 *
 * Helper functions for working with article outlines stored in Supabase.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Json } from '@/types/database';
import type {
  ArticleOutline,
  SerpInsights,
  BrandVoiceSummary,
  OutlineMetadata,
  OutlineStatus,
} from '@/types/article-outline-generator';

// Define row and update types inline
interface ArticleOutlineRow {
  id: string;
  organization_id: string;
  product_id: string | null;
  user_id: string | null;
  keyword_id: string | null;
  keyword: string;
  content_type: string;
  outline: Json | null;
  serp_insights: Json | null;
  brand_voice_applied: Json | null;
  seo_recommendations: string[] | null;
  target_word_count: number | null;
  estimated_word_count: number;
  status: OutlineStatus;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

type ArticleOutlineInsert = Omit<
  ArticleOutlineRow,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type ArticleOutlineUpdate = Partial<Omit<ArticleOutlineRow, 'id'>>;

/**
 * Result type for article outline operations
 */
export type ArticleOutlineResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get an article outline by ID
 */
export async function getArticleOutlineById(
  client: SupabaseClient,
  outlineId: string,
  organizationId: string
): Promise<ArticleOutlineResult<ArticleOutlineRow>> {
  try {
    const { data, error } = await client
      .from('article_outlines')
      .select('*')
      .eq('id', outlineId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Article outline not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article outline',
    };
  }
}

/**
 * Get article outlines for an organization
 */
export async function getOrganizationArticleOutlines(
  client: SupabaseClient,
  organizationId: string,
  options: {
    productId?: string;
    keywordId?: string;
    contentType?: string;
    status?: OutlineStatus;
    limit?: number;
    offset?: number;
    sortBy?: 'created_at' | 'updated_at' | 'keyword';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ArticleOutlineResult<ArticleOutlineRow[]>> {
  try {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    let query = client
      .from('article_outlines')
      .select('*')
      .eq('organization_id', organizationId);

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }
    if (options.keywordId) {
      query = query.eq('keyword_id', options.keywordId);
    }
    if (options.contentType) {
      query = query.eq('content_type', options.contentType);
    }
    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No article outlines found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article outlines',
    };
  }
}

/**
 * Get article outlines for a keyword
 */
export async function getKeywordArticleOutlines(
  client: SupabaseClient,
  keywordId: string,
  options: {
    status?: OutlineStatus;
    limit?: number;
    sortBy?: 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ArticleOutlineResult<ArticleOutlineRow[]>> {
  try {
    const { limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = options;

    let query = client
      .from('article_outlines')
      .select('*')
      .eq('keyword_id', keywordId);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'desc' });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No article outlines found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article outlines',
    };
  }
}

/**
 * Get the latest completed outline for a keyword
 */
export async function getLatestArticleOutline(
  client: SupabaseClient,
  keywordId: string
): Promise<ArticleOutlineResult<ArticleOutlineRow | null>> {
  try {
    const { data, error } = await client
      .from('article_outlines')
      .select('*')
      .eq('keyword_id', keywordId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch latest article outline',
    };
  }
}

/**
 * Create a new article outline record
 */
export async function createArticleOutline(
  client: SupabaseClient,
  outline: ArticleOutlineInsert
): Promise<ArticleOutlineResult<ArticleOutlineRow>> {
  try {
    const insertData = {
      organization_id: outline.organization_id,
      product_id: outline.product_id || null,
      user_id: outline.user_id || null,
      keyword_id: outline.keyword_id || null,
      keyword: outline.keyword,
      content_type: outline.content_type,
      outline: outline.outline || null,
      serp_insights: outline.serp_insights || null,
      brand_voice_applied: outline.brand_voice_applied || null,
      seo_recommendations: outline.seo_recommendations || [],
      target_word_count: outline.target_word_count || null,
      estimated_word_count: outline.estimated_word_count || 0,
      status: outline.status || 'pending',
      error_message: outline.error_message || null,
      metadata: outline.metadata || null,
    };

    const { data, error } = await client
      .from('article_outlines')
      .insert(insertData as any)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create article outline');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create article outline',
    };
  }
}

/**
 * Update an article outline
 */
export async function updateArticleOutline(
  client: SupabaseClient,
  outlineId: string,
  updates: ArticleOutlineUpdate
): Promise<ArticleOutlineResult<ArticleOutlineRow>> {
  try {
    const { data, error } = await client
      .from('article_outlines')
      .update(updates)
      .eq('id', outlineId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Article outline not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update article outline',
    };
  }
}

/**
 * Update article outline status
 */
export async function updateArticleOutlineStatus(
  client: SupabaseClient,
  outlineId: string,
  status: OutlineStatus,
  errorMessage?: string
): Promise<ArticleOutlineResult<ArticleOutlineRow>> {
  const updates: ArticleOutlineUpdate = {
    status,
    ...(errorMessage && { error_message: errorMessage }),
  };

  return updateArticleOutline(client, outlineId, updates);
}

/**
 * Delete an article outline
 */
export async function deleteArticleOutline(
  client: SupabaseClient,
  outlineId: string,
  organizationId: string
): Promise<ArticleOutlineResult<void>> {
  try {
    const { error } = await client
      .from('article_outlines')
      .delete()
      .eq('id', outlineId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete article outline',
    };
  }
}

/**
 * Get article outline statistics for an organization
 */
export async function getArticleOutlineStats(
  client: SupabaseClient,
  organizationId: string,
  productId?: string
): Promise<
  ArticleOutlineResult<{
    total: number;
    byStatus: Record<OutlineStatus, number>;
    byContentType: Record<string, number>;
    avgEstimatedWordCount: number;
  }>
> {
  try {
    let query = client
      .from('article_outlines')
      .select('*')
      .eq('organization_id', organizationId);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          total: 0,
          byStatus: {
            pending: 0,
            generating: 0,
            completed: 0,
            failed: 0,
          },
          byContentType: {},
          avgEstimatedWordCount: 0,
        },
      };
    }

    const byStatus: Record<OutlineStatus, number> = {
      pending: 0,
      generating: 0,
      completed: 0,
      failed: 0,
    };

    const byContentType: Record<string, number> = {};
    let totalWordCount = 0;

    for (const outline of data as ArticleOutlineRow[]) {
      const status = outline.status as OutlineStatus;
      if (byStatus[status] !== undefined) {
        byStatus[status]++;
      }

      const ct = outline.content_type;
      if (ct) {
        byContentType[ct] = (byContentType[ct] || 0) + 1;
      }

      totalWordCount += outline.estimated_word_count || 0;
    }

    return {
      success: true,
      data: {
        total: data.length,
        byStatus,
        byContentType,
        avgEstimatedWordCount:
          data.length > 0 ? totalWordCount / data.length : 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article outline stats',
    };
  }
}

/**
 * Check if a user can access an article outline (via organization membership)
 */
export async function canUserAccessArticleOutline(
  client: SupabaseClient,
  outlineId: string,
  userId: string
): Promise<boolean> {
  try {
    // First get the outline to find the organization
    const outlineResult = await getArticleOutlineById(client, outlineId, '');
    if (!outlineResult.success) return false;

    // Then check if user is a member of that organization
    const { data, error } = await client
      .from('organization_members')
      .select('id')
      .eq('organization_id', outlineResult.data.organization_id)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Validate article outline data
 */
export function validateArticleOutline(outline: {
  keyword?: string;
  content_type?: string;
  outline?: unknown;
  estimated_word_count?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (outline.keyword !== undefined) {
    if (typeof outline.keyword !== 'string') {
      errors.push('Keyword must be a string');
    } else if (outline.keyword.length === 0) {
      errors.push('Keyword cannot be empty');
    } else if (outline.keyword.length > 200) {
      errors.push('Keyword cannot exceed 200 characters');
    }
  }

  if (outline.estimated_word_count !== undefined) {
    if (typeof outline.estimated_word_count !== 'number') {
      errors.push('Estimated word count must be a number');
    } else if (outline.estimated_word_count < 0) {
      errors.push('Estimated word count must be non-negative');
    }
  }

  if (outline.content_type !== undefined) {
    const validTypes = [
      'blog_post',
      'guide',
      'tutorial',
      'listicle',
      'review',
      'comparison',
      'case_study',
      'news_article',
      'opinion',
      'faq',
      'how_to',
    ];
    if (
      typeof outline.content_type !== 'string' ||
      !validTypes.includes(outline.content_type)
    ) {
      errors.push(`Content type must be one of: ${validTypes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

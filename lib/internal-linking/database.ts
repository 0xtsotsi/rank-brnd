// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Internal Linking - Database Service
 *
 * Database operations for internal link suggestions.
 */

import type { Database } from '@/types/database';
import type {
  InternalLinkSuggestion,
  InternalLinkStats,
  ArticleForMatching,
} from './types';
import type {
  CreateInternalLinkSuggestion,
  UpdateInternalLinkSuggestion,
} from '@/lib/schemas/internal-linking';

type InternalLinkSuggestionRow =
  Database['public']['Tables']['internal_link_suggestions']['Row'];
type InternalLinkSuggestionInsert =
  Database['public']['Tables']['internal_link_suggestions']['Insert'];

type InternalLinkingResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Create internal link suggestions from analysis results
 */
export async function createInternalLinkSuggestions(
  db: Database,
  suggestions: Array<{
    organization_id: string;
    product_id: string | null;
    source_article_id: string | null;
    target_article_id: string;
    keyword: string | null;
    suggested_anchor_text: string;
    context_snippet: string;
    position_in_content: number | null;
    relevance_score: number;
    link_type: 'contextual' | 'related' | 'see_also' | 'further_reading';
    metadata?: Record<string, any>;
  }>
): Promise<InternalLinkingResult<InternalLinkSuggestion[]>> {
  try {
    const { data, error } = await db
      .from('internal_link_suggestions')
      .insert(
        suggestions.map((s) => ({
          organization_id: s.organization_id,
          product_id: s.product_id,
          source_article_id: s.source_article_id,
          target_article_id: s.target_article_id,
          keyword: s.keyword,
          suggested_anchor_text: s.suggested_anchor_text,
          context_snippet: s.context_snippet,
          position_in_content: s.position_in_content,
          relevance_score: s.relevance_score,
          link_type: s.link_type,
          metadata: s.metadata || {},
        }))
      )
      .select()
      .returns<InternalLinkSuggestionRow[]>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map((row) => mapRowToSuggestion(row)),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Get internal link suggestions for an article
 */
export async function getArticleInternalLinkSuggestions(
  db: Database,
  articleId: string,
  options?: {
    status?: 'pending' | 'approved' | 'rejected' | 'applied';
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<InternalLinkingResult<InternalLinkSuggestion[]>> {
  try {
    let query = db
      .from('internal_link_suggestions')
      .select('*')
      .eq('source_article_id', articleId);

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (!options?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    query = query.order('relevance_score', { ascending: false });
    query = query.order('suggested_at', { ascending: false });

    const { data, error } = await query.returns<InternalLinkSuggestionRow[]>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map((row) => mapRowToSuggestion(row)),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Get articles that link to a given article (inbound links)
 */
export async function getArticleInboundInternalLinks(
  db: Database,
  articleId: string,
  options?: {
    status?: 'pending' | 'approved' | 'rejected' | 'applied';
    includeDeleted?: boolean;
  }
): Promise<InternalLinkingResult<InternalLinkSuggestion[]>> {
  try {
    let query = db
      .from('internal_link_suggestions')
      .select('*')
      .eq('target_article_id', articleId);

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (!options?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    query = query.order('relevance_score', { ascending: false });

    const { data, error } = await query.returns<InternalLinkSuggestionRow[]>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map((row) => mapRowToSuggestion(row)),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Get internal link suggestions for a product
 */
export async function getProductInternalLinkSuggestions(
  db: Database,
  productId: string,
  options?: {
    status?: 'pending' | 'approved' | 'rejected' | 'applied';
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<InternalLinkingResult<InternalLinkSuggestion[]>> {
  try {
    let query = db
      .from('internal_link_suggestions')
      .select('*')
      .eq('product_id', productId);

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (!options?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    query = query.order('relevance_score', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query.returns<InternalLinkSuggestionRow[]>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map((row) => mapRowToSuggestion(row)),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Get internal link suggestions with article details
 */
export async function getInternalLinkSuggestionsWithArticles(
  db: Database,
  organizationId: string,
  options?: {
    sourceArticleId?: string;
    targetArticleId?: string;
    productId?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'applied';
    minRelevanceScore?: number;
    limit?: number;
    offset?: number;
  }
): Promise<
  InternalLinkingResult<
    Array<
      InternalLinkSuggestion & {
        target_article?: {
          id: string;
          title: string;
          slug: string;
          status: string;
        };
        source_article?: {
          id: string;
          title: string;
          slug: string;
          status: string;
        };
      }
    >
  >
> {
  try {
    let query = db
      .from('internal_link_suggestions')
      .select(
        `
        *,
        target_article:articles!internal_link_suggestions_target_article_id_fkey(
          id,
          title,
          slug,
          status
        ),
        source_article:articles!internal_link_suggestions_source_article_id_fkey(
          id,
          title,
          slug,
          status
        )
      `
      )
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (options?.sourceArticleId) {
      query = query.eq('source_article_id', options.sourceArticleId);
    }

    if (options?.targetArticleId) {
      query = query.eq('target_article_id', options.targetArticleId);
    }

    if (options?.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.minRelevanceScore !== undefined) {
      query = query.gte('relevance_score', options.minRelevanceScore);
    }

    query = query.order('relevance_score', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data as any[]).map((row) => ({
        ...mapRowToSuggestion(row),
        target_article: row.target_article?.[0],
        source_article: row.source_article?.[0],
      })),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Get a single internal link suggestion by ID
 */
export async function getInternalLinkSuggestion(
  db: Database,
  suggestionId: string
): Promise<InternalLinkingResult<InternalLinkSuggestion>> {
  try {
    const { data, error } = await db
      .from('internal_link_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .is('deleted_at', null)
      .single()
      .returns<InternalLinkSuggestionRow>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: mapRowToSuggestion(data),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Create a single internal link suggestion
 */
export async function createInternalLinkSuggestion(
  db: Database,
  suggestion: CreateInternalLinkSuggestion
): Promise<InternalLinkingResult<InternalLinkSuggestion>> {
  try {
    const { data, error } = await db
      .from('internal_link_suggestions')
      .insert({
        organization_id: suggestion.organization_id,
        product_id: suggestion.product_id || null,
        source_article_id: suggestion.source_article_id || null,
        target_article_id: suggestion.target_article_id,
        keyword: suggestion.keyword || null,
        suggested_anchor_text: suggestion.suggested_anchor_text || null,
        context_snippet: suggestion.context_snippet || null,
        position_in_content: suggestion.position_in_content || null,
        relevance_score: suggestion.relevance_score || null,
        link_type: suggestion.link_type || 'contextual',
        notes: suggestion.notes || null,
        metadata: suggestion.metadata || {},
      })
      .select()
      .single()
      .returns<InternalLinkSuggestionRow>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: mapRowToSuggestion(data),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Update an internal link suggestion
 */
export async function updateInternalLinkSuggestion(
  db: Database,
  suggestionId: string,
  updates: UpdateInternalLinkSuggestion
): Promise<InternalLinkingResult<InternalLinkSuggestion>> {
  try {
    const updateData: any = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;
      if (updates.status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
      if (updates.status === 'applied') {
        updateData.applied_at = new Date().toISOString();
      }
    }

    if (updates.suggested_anchor_text !== undefined) {
      updateData.suggested_anchor_text = updates.suggested_anchor_text;
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    const { data, error } = await db
      .from('internal_link_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .select()
      .single()
      .returns<InternalLinkSuggestionRow>();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: mapRowToSuggestion(data),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Update status of multiple suggestions
 */
export async function updateInternalLinkSuggestionStatuses(
  db: Database,
  suggestionIds: string[],
  status: 'pending' | 'approved' | 'rejected' | 'applied'
): Promise<InternalLinkingResult<string[]>> {
  try {
    const updateData: any = { status };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    if (status === 'applied') {
      updateData.applied_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from('internal_link_suggestions')
      .update(updateData)
      .in('id', suggestionIds)
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.map((row) => row.id),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Soft delete an internal link suggestion
 */
export async function softDeleteInternalLinkSuggestion(
  db: Database,
  suggestionId: string
): Promise<InternalLinkingResult<null>> {
  try {
    const { error } = await db
      .from('internal_link_suggestions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', suggestionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Get internal link statistics for an organization
 */
export async function getInternalLinkStats(
  db: Database,
  organizationId: string,
  productId?: string
): Promise<InternalLinkingResult<InternalLinkStats>> {
  try {
    const { data, error } = await db.rpc('get_internal_link_suggestion_stats', {
      p_org_id: organizationId,
      p_product_id: productId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const stats = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      data: {
        total_suggestions: stats?.total_suggestions || 0,
        pending_suggestions: stats?.pending_suggestions || 0,
        approved_suggestions: stats?.approved_suggestions || 0,
        applied_suggestions: stats?.applied_suggestions || 0,
        rejected_suggestions: stats?.rejected_suggestions || 0,
        avg_relevance_score: stats?.avg_relevance_score || 0,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Get candidate articles for internal linking within a product
 */
export async function getCandidateArticles(
  db: Database,
  organizationId: string,
  productId: string,
  options?: {
    status?: ('draft' | 'published' | 'archived')[];
    excludeArticleIds?: string[];
    limit?: number;
  }
): Promise<InternalLinkingResult<ArticleForMatching[]>> {
  try {
    let query = db
      .from('articles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('product_id', productId)
      .is('deleted_at', null);

    if (options?.status && options.status.length > 0) {
      query = query.in('status', options.status);
    }

    if (options?.excludeArticleIds && options.excludeArticleIds.length > 0) {
      query = query.not('id', 'in', `(${options.excludeArticleIds.join(',')})`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        content: row.content,
        excerpt: row.excerpt,
        tags: row.tags || [],
        category: row.category || null,
        status: row.status,
        word_count: row.word_count || null,
        keyword_id: row.keyword_id || null,
        metadata: row.metadata || null,
      })),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Map database row to InternalLinkSuggestion type
 */
function mapRowToSuggestion(
  row: InternalLinkSuggestionRow
): InternalLinkSuggestion {
  return {
    id: row.id,
    organization_id: row.organization_id,
    product_id: row.product_id,
    source_article_id: row.source_article_id,
    target_article_id: row.target_article_id,
    keyword: row.keyword,
    suggested_anchor_text: row.suggested_anchor_text,
    context_snippet: row.context_snippet,
    position_in_content: row.position_in_content,
    relevance_score: row.relevance_score,
    status: row.status,
    link_type: row.link_type,
    notes: row.notes,
    suggested_at: row.suggested_at,
    approved_at: row.approved_at,
    applied_at: row.applied_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

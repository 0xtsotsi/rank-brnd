// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Article Drafts Database Operations
 *
 * Helper functions for working with article drafts in Supabase.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  ArticleDraftGenerationRequest,
  ArticleDraftGenerationResponse,
} from '@/types/article-draft-generator';

type Article = Database['public']['Tables']['articles']['Row'];
type ArticleInsert = Database['public']['Tables']['articles']['Insert'];
type ArticleUpdate = Database['public']['Tables']['articles']['Update'];

/**
 * Result type for article draft operations
 */
export type ArticleDraftResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Article draft metadata stored in article metadata JSONB
 */
export interface ArticleDraftMetadata {
  original_request: ArticleDraftGenerationRequest;
  seo: {
    meta_title: string;
    meta_description: string;
    meta_keywords: string[];
    primary_keyword: string;
    keyword_density: number;
    keyword_count: number;
    suggested_slug: string;
  };
  internal_link_placeholders: Array<{
    anchor_text: string;
    target_keyword: string;
    placement_hint: string;
  }>;
  table_of_contents?: Array<{
    level: number;
    title: string;
    id: string;
  }>;
  brand_voice_applied?: {
    tone?: string[];
    formality_level?: 'formal' | 'informal' | 'neutral';
    vocabulary?: {
      category?: string;
      complexity_level?: 'simple' | 'moderate' | 'complex' | 'academic';
    };
    style?: {
      sentence_structure?: 'simple' | 'compound' | 'complex' | 'varied';
      paragraph_length?: 'short' | 'medium' | 'long' | 'varied';
      use_of_bullets?: boolean;
    };
  };
}

/**
 * Get an article draft by ID
 */
export async function getArticleDraftById(
  client: SupabaseClient<Database>,
  draftId: string,
  organizationId: string
): Promise<
  ArticleDraftResult<Article & { draft_metadata?: ArticleDraftMetadata }>
> {
  try {
    const { data, error } = await (client as any)
      .from('articles')
      .select('*')
      .eq('id', draftId)
      .eq('organization_id', organizationId)
      .eq('status', 'draft')
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Draft not found');

    // Extract draft metadata if present
    const metadata = data.metadata as Record<string, unknown> | null;
    const draftData = data as Article & {
      draft_metadata?: ArticleDraftMetadata;
    };

    if (metadata?.draft_generation) {
      draftData.draft_metadata =
        metadata.draft_generation as ArticleDraftMetadata;
    }

    return { success: true, data: draftData };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article draft',
    };
  }
}

/**
 * List article drafts for an organization
 */
export async function listArticleDrafts(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    productId?: string;
    keywordId?: string;
    minWordCount?: number;
    maxWordCount?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'created_at' | 'updated_at' | 'word_count' | 'title';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ArticleDraftResult<Article[]>> {
  try {
    let query = (client as any)
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'draft')
      .is('deleted_at', null);

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.keywordId) {
      query = query.eq('keyword_id', options.keywordId);
    }

    if (options.minWordCount) {
      query = query.gte('word_count', options.minWordCount);
    }

    if (options.maxWordCount) {
      query = query.lte('word_count', options.maxWordCount);
    }

    // Apply sorting
    const sortColumn = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No drafts found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article drafts',
    };
  }
}

/**
 * Create a new article draft
 */
export async function createArticleDraft(
  client: SupabaseClient<Database>,
  organizationId: string,
  request: ArticleDraftGenerationRequest,
  response: ArticleDraftGenerationResponse
): Promise<ArticleDraftResult<Article>> {
  try {
    const draftId = crypto.randomUUID();
    const now = new Date().toISOString();

    const articleData: ArticleInsert = {
      id: draftId,
      organization_id: organizationId,
      product_id: request.product_id || null,
      keyword_id: request.keyword_id || null,
      title: response.title,
      slug: response.slug,
      content: response.content,
      excerpt: response.excerpt,
      status: 'draft',
      word_count: response.metadata.word_count,
      reading_time_minutes: response.metadata.reading_time_minutes,
      meta_title: response.seo.meta_title,
      meta_description: response.seo.meta_description,
      meta_keywords: response.seo
        .meta_keywords as unknown as Database['public']['Tables']['articles']['Insert']['meta_keywords'],
      metadata: {
        draft_generation: {
          original_request: request,
          seo: response.seo,
          internal_link_placeholders: response.internal_link_placeholders,
          table_of_contents: response.table_of_contents,
          brand_voice_applied: response.brand_voice_applied,
        },
        generation_time_ms: response.metadata.generation_time_ms,
        model_used: response.metadata.model_used,
      } as unknown as Database['public']['Tables']['articles']['Insert']['metadata'],
      tags: [],
      schema_data: {},
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await (client as any)
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create article draft');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create article draft',
    };
  }
}

/**
 * Update an article draft
 */
export async function updateArticleDraft(
  client: SupabaseClient<Database>,
  draftId: string,
  organizationId: string,
  updates: Partial<{
    title: string;
    content: string;
    excerpt: string;
    meta_title: string;
    meta_description: string;
    word_count: number;
    internal_links: Array<{ anchor_text: string; target_keyword: string }>;
    regenerate_metadata: Partial<ArticleDraftMetadata>;
  }>
): Promise<ArticleDraftResult<Article>> {
  try {
    // Get existing draft to preserve metadata
    const existingResult = await getArticleDraftById(
      client,
      draftId,
      organizationId
    );
    if (!existingResult.success) {
      return { success: false, error: existingResult.error };
    }

    const existing = existingResult.data;
    const metadata = (existing.metadata as Record<string, unknown>) || {};

    // Build update object
    const dbUpdates: ArticleUpdate = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.excerpt !== undefined) dbUpdates.excerpt = updates.excerpt;
    if (updates.meta_title !== undefined)
      dbUpdates.meta_title = updates.meta_title;
    if (updates.meta_description !== undefined)
      dbUpdates.meta_description = updates.meta_description;

    if (updates.word_count !== undefined) {
      dbUpdates.word_count = updates.word_count;
      dbUpdates.reading_time_minutes = Math.max(
        1,
        Math.ceil(updates.word_count / 200)
      );
    }

    // Update metadata
    if (updates.internal_links !== undefined) {
      (
        metadata.draft_generation as ArticleDraftMetadata
      ).internal_link_placeholders = updates.internal_links.map((link) => ({
        anchor_text: link.anchor_text,
        target_keyword: link.target_keyword,
        placement_hint: 'manual',
      }));
    }

    if (updates.regenerate_metadata !== undefined) {
      Object.assign(
        metadata.draft_generation || {},
        updates.regenerate_metadata
      );
    }

    dbUpdates.metadata =
      metadata as unknown as Database['public']['Tables']['articles']['Update']['metadata'];
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await (client as any)
      .from('articles')
      .update(dbUpdates)
      .eq('id', draftId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update article draft');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update article draft',
    };
  }
}

/**
 * Delete (soft delete) an article draft
 */
export async function deleteArticleDraft(
  client: SupabaseClient<Database>,
  draftId: string,
  organizationId: string
): Promise<ArticleDraftResult<void>> {
  try {
    const { error } = await (client as any)
      .from('articles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', draftId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete article draft',
    };
  }
}

/**
 * Permanently delete an article draft (use with caution)
 */
export async function permanentDeleteArticleDraft(
  client: SupabaseClient<Database>,
  draftId: string,
  organizationId: string
): Promise<ArticleDraftResult<void>> {
  try {
    const { error } = await (client as any)
      .from('articles')
      .delete()
      .eq('id', draftId)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to permanently delete article draft',
    };
  }
}

/**
 * Get draft statistics for an organization
 */
export async function getDraftStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string
): Promise<
  ArticleDraftResult<{
    total: number;
    total_words: number;
    avg_word_count: number;
    avg_keyword_density: number;
    by_keyword: Array<{ keyword: string; count: number }>;
  }>
> {
  try {
    let query = (client as any)
      .from('articles')
      .select('word_count, metadata')
      .eq('organization_id', organizationId)
      .eq('status', 'draft')
      .is('deleted_at', null);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No drafts found');

    let totalWords = 0;
    let totalDensity = 0;
    let densityCount = 0;
    const keywordCounts: Record<string, number> = {};

    for (const draft of data) {
      totalWords += draft.word_count || 0;

      const metadata = draft.metadata as Record<string, unknown> | null;
      const draftGen = metadata?.draft_generation as
        | ArticleDraftMetadata
        | undefined;

      if (draftGen?.seo?.keyword_density) {
        totalDensity += draftGen.seo.keyword_density;
        densityCount++;
      }

      if (draftGen?.seo?.primary_keyword) {
        const keyword = draftGen.seo.primary_keyword;
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    }

    return {
      success: true,
      data: {
        total: data.length,
        total_words: totalWords,
        avg_word_count:
          data.length > 0 ? Math.round(totalWords / data.length) : 0,
        avg_keyword_density: densityCount > 0 ? totalDensity / densityCount : 0,
        by_keyword: Object.entries(keywordCounts)
          .map(([keyword, count]) => ({ keyword, count }))
          .sort((a, b) => b.count - a.count),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch draft statistics',
    };
  }
}

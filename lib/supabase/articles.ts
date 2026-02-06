// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Articles Utilities
 *
 * Helper functions for working with articles tracked by organizations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type Article = Database['public']['Tables']['articles']['Row'];
type ArticleInsert = Database['public']['Tables']['articles']['Insert'];
type ArticleUpdate = Database['public']['Tables']['articles']['Update'];

type ArticleStatus = 'draft' | 'published' | 'archived';

/**
 * Result type for article operations
 */
export type ArticleResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default values for optional fields
 */
export const DEFAULT_ARTICLE_VALUES = {
  content: '',
  status: 'draft' as ArticleStatus,
  seo_score: null,
  word_count: 0,
  reading_time_minutes: 0,
  tags: [],
  metadata: {},
  schema_data: {},
  meta_keywords: [],
};

/**
 * Get an article by ID
 */
export async function getArticleById(
  client: SupabaseClient<Database>,
  articleId: string
): Promise<ArticleResult<Article>> {
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Article not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch article',
    };
  }
}

/**
 * Get an article by slug and organization
 */
export async function getArticleBySlug(
  client: SupabaseClient<Database>,
  organizationId: string,
  slug: string
): Promise<ArticleResult<Article>> {
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Article not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch article',
    };
  }
}

/**
 * Get all articles for an organization
 */
export async function getOrganizationArticles(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    includeDeleted?: boolean;
    productId?: string;
    keywordId?: string;
    status?: ArticleStatus;
    category?: string;
    minSeoScore?: number;
    maxSeoScore?: number;
    search?: string;
    tags?: string[];
    authorId?: string;
    limit?: number;
    offset?: number;
    sortBy?:
      | 'title'
      | 'slug'
      | 'status'
      | 'seo_score'
      | 'word_count'
      | 'published_at'
      | 'scheduled_at'
      | 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ArticleResult<Article[]>> {
  try {
    let query = client
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.keywordId) {
      query = query.eq('keyword_id', options.keywordId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.minSeoScore !== undefined) {
      query = query.gte('seo_score', options.minSeoScore);
    }

    if (options.maxSeoScore !== undefined) {
      query = query.lte('seo_score', options.maxSeoScore);
    }

    if (options.search) {
      query = query.or(
        `title.ilike.%${options.search}%,content.ilike.%${options.search}%,slug.ilike.%${options.search}%`
      );
    }

    if (options.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }

    if (options.authorId) {
      query = query.eq('author_id', options.authorId);
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
    if (!data) throw new Error('No articles found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch articles',
    };
  }
}

/**
 * Get all articles for a product
 */
export async function getProductArticles(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    includeDeleted?: boolean;
    status?: ArticleStatus;
    limit?: number;
  } = {}
): Promise<ArticleResult<Article[]>> {
  try {
    let query = client.from('articles').select('*').eq('product_id', productId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('published_at', {
      ascending: false,
      nullsFirst: false,
    });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No articles found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch articles',
    };
  }
}

/**
 * Get all articles for a keyword
 */
export async function getKeywordArticles(
  client: SupabaseClient<Database>,
  keywordId: string,
  options: {
    includeDeleted?: boolean;
    status?: ArticleStatus;
    limit?: number;
  } = {}
): Promise<ArticleResult<Article[]>> {
  try {
    let query = client.from('articles').select('*').eq('keyword_id', keywordId);

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
    if (!data) throw new Error('No articles found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch articles',
    };
  }
}

/**
 * Create a new article
 */
export async function createArticle(
  client: SupabaseClient<Database>,
  article: ArticleInsert
): Promise<ArticleResult<Article>> {
  try {
    // Calculate reading time if word count is provided but reading time isn't
    let readingTime = article.reading_time_minutes;
    if (article.word_count && !article.reading_time_minutes) {
      readingTime = Math.max(1, Math.ceil(article.word_count / 200));
    }

    const { data, error } = await client
      .from('articles')
      .insert({
        organization_id: article.organization_id,
        product_id: article.product_id || null,
        keyword_id: article.keyword_id || null,
        title: article.title,
        slug: article.slug,
        content: article.content ?? DEFAULT_ARTICLE_VALUES.content,
        excerpt: article.excerpt || null,
        featured_image_url: article.featured_image_url || null,
        status: article.status || DEFAULT_ARTICLE_VALUES.status,
        seo_score: article.seo_score ?? DEFAULT_ARTICLE_VALUES.seo_score,
        word_count: article.word_count ?? DEFAULT_ARTICLE_VALUES.word_count,
        reading_time_minutes:
          readingTime ?? DEFAULT_ARTICLE_VALUES.reading_time_minutes,
        meta_title: article.meta_title || null,
        meta_description: article.meta_description || null,
        meta_keywords: (article.meta_keywords ||
          DEFAULT_ARTICLE_VALUES.meta_keywords) as unknown as Json,
        canonical_url: article.canonical_url || null,
        schema_type: article.schema_type || null,
        schema_data: (article.schema_data ||
          DEFAULT_ARTICLE_VALUES.schema_data) as unknown as Json,
        scheduled_at: article.scheduled_at || null,
        author_id: article.author_id || null,
        tags: (article.tags || DEFAULT_ARTICLE_VALUES.tags) as unknown as Json,
        category: article.category || null,
        metadata: (article.metadata ||
          DEFAULT_ARTICLE_VALUES.metadata) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create article');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create article',
    };
  }
}

/**
 * Bulk create articles
 */
export async function bulkCreateArticles(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId: string | null,
  articles: Array<{
    title: string;
    slug: string;
    content?: string;
    excerpt?: string;
    featured_image_url?: string;
    tags?: string[];
    category?: string;
    meta_title?: string;
    meta_description?: string;
  }>
): Promise<
  ArticleResult<{ successful: number; failed: number; errors: string[] }>
> {
  const errors: string[] = [];
  let successful = 0;

  for (const article of articles) {
    try {
      const result = await createArticle(client, {
        organization_id: organizationId,
        product_id: productId || undefined,
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        featured_image_url: article.featured_image_url,
        tags: article.tags,
        category: article.category,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
      });

      if (result.success) {
        successful++;
      } else {
        errors.push(`${article.title}: ${result.error}`);
      }
    } catch (error) {
      errors.push(
        `${article.title}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
 * Update an article
 */
export async function updateArticle(
  client: SupabaseClient<Database>,
  articleId: string,
  updates: ArticleUpdate
): Promise<ArticleResult<Article>> {
  try {
    // If word_count is being updated and reading_time_minutes isn't, recalculate reading time
    let finalUpdates = { ...updates };
    if (
      updates.word_count !== undefined &&
      updates.reading_time_minutes === undefined
    ) {
      finalUpdates = {
        ...updates,
        reading_time_minutes: Math.max(1, Math.ceil(updates.word_count / 200)),
      } as ArticleUpdate;
    }

    const { data, error } = await client
      .from('articles')
      .update(finalUpdates)
      .eq('id', articleId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Article not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update article',
    };
  }
}

/**
 * Update article status
 */
export async function updateArticleStatus(
  client: SupabaseClient<Database>,
  articleId: string,
  status: ArticleStatus
): Promise<ArticleResult<Article>> {
  return updateArticle(client, articleId, { status });
}

/**
 * Publish an article
 */
export async function publishArticle(
  client: SupabaseClient<Database>,
  articleId: string
): Promise<ArticleResult<Article>> {
  try {
    const { data, error } = await client
      .from('articles')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', articleId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Article not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to publish article',
    };
  }
}

/**
 * Unpublish an article (revert to draft)
 */
export async function unpublishArticle(
  client: SupabaseClient<Database>,
  articleId: string
): Promise<ArticleResult<Article>> {
  try {
    const { data, error } = await client
      .from('articles')
      .update({
        status: 'draft',
      })
      .eq('id', articleId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Article not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to unpublish article',
    };
  }
}

/**
 * Soft delete an article
 */
export async function softDeleteArticle(
  client: SupabaseClient<Database>,
  articleId: string
): Promise<ArticleResult<void>> {
  try {
    const { error } = await client
      .from('articles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', articleId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete article',
    };
  }
}

/**
 * Permanently delete an article (use with caution)
 */
export async function deleteArticle(
  client: SupabaseClient<Database>,
  articleId: string
): Promise<ArticleResult<void>> {
  try {
    const { error } = await client
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete article',
    };
  }
}

/**
 * Check if a user can access an article (via organization membership)
 */
export async function canUserAccessArticle(
  client: SupabaseClient<Database>,
  articleId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_article', {
      p_article_id: articleId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Calculate reading time based on word count
 */
export function calculateReadingTime(wordCount: number): number {
  // Average reading speed: 200 words per minute
  // Minimum 1 minute for any content
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Get article statistics for an organization
 */
export async function getArticleStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string
): Promise<
  ArticleResult<{
    total: number;
    byStatus: Record<ArticleStatus, number>;
    avgSeoScore: number;
    totalWordCount: number;
    publishedThisMonth: number;
    scheduledCount: number;
  }>
> {
  try {
    let query = client
      .from('articles')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No articles found');

    const byStatus: Record<ArticleStatus, number> = {
      draft: 0,
      published: 0,
      archived: 0,
    };

    let totalSeoScore = 0;
    let validSeoScores = 0;
    let totalWordCount = 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let publishedThisMonth = 0;
    let scheduledCount = 0;

    for (const article of data) {
      byStatus[article.status as ArticleStatus]++;
      totalWordCount += article.word_count || 0;

      if (article.seo_score !== null) {
        totalSeoScore += article.seo_score;
        validSeoScores++;
      }

      if (article.published_at) {
        const publishedDate = new Date(article.published_at);
        if (publishedDate >= startOfMonth) {
          publishedThisMonth++;
        }
      }

      if (article.scheduled_at && new Date(article.scheduled_at) > now) {
        scheduledCount++;
      }
    }

    return {
      success: true,
      data: {
        total: data.length,
        byStatus,
        avgSeoScore: validSeoScores > 0 ? totalSeoScore / validSeoScores : 0,
        totalWordCount,
        publishedThisMonth,
        scheduledCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article stats',
    };
  }
}

/**
 * Validate article data
 */
export function validateArticle(article: {
  title?: string;
  slug?: string;
  content?: string;
  featured_image_url?: string;
  seo_score?: number;
  word_count?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (article.title !== undefined) {
    if (typeof article.title !== 'string') {
      errors.push('Title must be a string');
    } else if (article.title.length === 0) {
      errors.push('Title cannot be empty');
    } else if (article.title.length > 500) {
      errors.push('Title cannot exceed 500 characters');
    }
  }

  if (article.slug !== undefined) {
    if (typeof article.slug !== 'string') {
      errors.push('Slug must be a string');
    } else if (article.slug.length === 0) {
      errors.push('Slug cannot be empty');
    } else if (article.slug.length > 500) {
      errors.push('Slug cannot exceed 500 characters');
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
      errors.push(
        'Slug must contain only lowercase letters, numbers, and hyphens'
      );
    }
  }

  if (article.content !== undefined && typeof article.content !== 'string') {
    errors.push('Content must be a string');
  }

  if (
    article.featured_image_url !== undefined &&
    article.featured_image_url !== ''
  ) {
    try {
      new URL(article.featured_image_url);
    } catch {
      errors.push('Featured image URL must be a valid URL');
    }
  }

  if (
    article.seo_score !== undefined &&
    (typeof article.seo_score !== 'number' ||
      article.seo_score < 0 ||
      article.seo_score > 100)
  ) {
    errors.push('SEO score must be a number between 0 and 100');
  }

  if (
    article.word_count !== undefined &&
    (typeof article.word_count !== 'number' || article.word_count < 0)
  ) {
    errors.push('Word count must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a unique slug for an article
 */
export async function generateUniqueSlug(
  client: SupabaseClient<Database>,
  organizationId: string,
  baseTitle: string
): Promise<string> {
  // Convert title to slug format
  const baseSlug = baseTitle
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .substring(0, 500); // Limit length

  let slug = baseSlug;
  let counter = 1;
  const MAX_ATTEMPTS = 100; // Prevent infinite loops

  // Check if slug exists and generate unique variant
  while (counter < MAX_ATTEMPTS) {
    const { data } = await client
      .from('articles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle();

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  throw new Error(
    `Unable to generate unique slug for article after ${MAX_ATTEMPTS} attempts. Last attempted: ${slug}`
  );
}

/**
 * Publish article to CMS (adds to publishing queue)
 */
export async function publishArticleToCMS(
  client: SupabaseClient<Database>,
  articleId: string,
  options: {
    integrationId?: string;
    platform?:
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
    scheduledFor?: string;
    priority?: number;
    productId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<ArticleResult<{ queueItemId: string; article: Article }>> {
  try {
    // First get the article to find its organization and product
    const articleResult = await getArticleById(client, articleId);
    if (!articleResult.success) {
      return { success: false, error: 'Article not found' };
    }
    const article = articleResult.data;

    // Determine the platform - use integration if provided, otherwise use option
    let platform = options.platform;
    let integrationId = options.integrationId;

    // If integration_id is provided, fetch the integration to get platform
    if (integrationId) {
      const { data: integration } = await client
        .from('integrations')
        .select('platform')
        .eq('id', integrationId)
        .eq('organization_id', article.organization_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (integration) {
        platform = integration.platform as any;
      }
    }

    if (!platform) {
      return { success: false, error: 'Platform must be specified' };
    }

    // Add to publishing queue using the database function
    const result = await client.rpc('queue_article_for_publishing', {
      p_organization_id: article.organization_id,
      p_article_id: articleId,
      p_platform: platform,
      p_integration_id: integrationId || null,
      p_priority: options.priority || 0,
      p_scheduled_for: options.scheduledFor || null,
    });

    if (result.error) throw result.error;

    const queueItemId = result.data as string;

    // Also update article status to published if not scheduled
    let wasPublished = false;
    if (!options.scheduledFor || new Date(options.scheduledFor) <= new Date()) {
      const publishResult = await publishArticle(client, articleId);
      if (!publishResult.success) {
        return { success: false, error: publishResult.error };
      }
      wasPublished = true;
    }

    // Trigger webhooks for article published event
    // Import dynamically to avoid circular dependencies
    if (wasPublished) {
      try {
        const { triggerWebhooks } = await import('@/lib/webhooks/delivery');

        // Trigger webhooks asynchronously in the background
        triggerWebhooks(client, article.organization_id, 'article.published', {
          article_id: article.id,
          title: article.title,
          slug: article.slug,
          status: article.status,
          published_at: article.published_at,
          scheduled_at: article.scheduled_at,
          author_id: article.author_id,
          product_id: article.product_id,
          keyword_id: article.keyword_id,
        }).catch((err) => {
          // Log webhook errors but don't fail the publish operation
          console.error('Webhook delivery failed:', err);
        });
      } catch (err) {
        // Log webhook import/delivery errors but don't fail the publish operation
        console.error('Failed to trigger webhooks:', err);
      }
    }

    return {
      success: true,
      data: {
        queueItemId,
        article: articleResult.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to publish article to CMS',
    };
  }
}

/**
 * Bulk publish articles to CMS
 */
export async function bulkPublishArticlesToCMS(
  client: SupabaseClient<Database>,
  articleIds: string[],
  options: {
    integrationId?: string;
    platform?:
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
    scheduledFor?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<
  ArticleResult<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
    queueItemIds: string[];
  }>
> {
  const successful: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  const queueItemIds: string[] = [];

  for (const articleId of articleIds) {
    try {
      const result = await publishArticleToCMS(client, articleId, options);
      if (result.success) {
        successful.push(articleId);
        queueItemIds.push(result.data.queueItemId);
      } else {
        failed.push({ id: articleId, error: result.error });
      }
    } catch (error) {
      failed.push({
        id: articleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: true,
    data: {
      successful,
      failed,
      queueItemIds,
    },
  };
}

/**
 * Get active integrations for an organization's products
 */
export async function getOrganizationIntegrations(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    platform?:
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
    productId?: string;
  } = {}
): Promise<
  ArticleResult<Array<{ id: string; platform: string; name: string }>>
> {
  try {
    let query = client
      .from('integrations')
      .select('id, platform, name')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (options.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch integrations',
    };
  }
}

/**
 * Articles API Route
 * Handles CRUD operations for content articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  articlesQuerySchema,
  articlesPostSchema,
  updateArticleSchema,
  deleteArticleSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas';
import {
  getOrganizationArticles,
  getArticleById,
  createArticle,
  bulkCreateArticles,
  updateArticle as updateArticleRecord,
  publishArticle,
  unpublishArticle,
  softDeleteArticle,
  generateUniqueSlug,
} from '@/lib/supabase/articles';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { APIErrors, handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/articles
 * Fetch all articles with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      articlesQuerySchema
    );

    const params = validationResult.success
      ? validationResult.data
      : {
          organization_id:
            request.nextUrl.searchParams.get('organization_id') || undefined,
          product_id:
            request.nextUrl.searchParams.get('product_id') || undefined,
          keyword_id:
            request.nextUrl.searchParams.get('keyword_id') || undefined,
          search: request.nextUrl.searchParams.get('search') || undefined,
          status: request.nextUrl.searchParams.get('status') || undefined,
          category: request.nextUrl.searchParams.get('category') || undefined,
          min_seo_score:
            request.nextUrl.searchParams.get('min_seo_score') || undefined,
          max_seo_score:
            request.nextUrl.searchParams.get('max_seo_score') || undefined,
          tags: request.nextUrl.searchParams.get('tags') || undefined,
          author_id: request.nextUrl.searchParams.get('author_id') || undefined,
          sort: request.nextUrl.searchParams.get('sort') || 'created_at',
          order: request.nextUrl.searchParams.get('order') || 'desc',
          limit: request.nextUrl.searchParams.get('limit') || '50',
          offset: request.nextUrl.searchParams.get('offset') || '0',
        };

    if (!params || !params.organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Parse tags if provided
    const tags = params!.tags
      ? params!.tags.split(',').map((t) => t.trim())
      : undefined;

    const result = await getOrganizationArticles(
      client,
      params!.organization_id!,
      {
        productId: params!.product_id,
        keywordId: params!.keyword_id,
        search: params!.search,
        status: params!.status as any,
        category: params!.category,
        minSeoScore: params!.min_seo_score
          ? Number(params!.min_seo_score)
          : undefined,
        maxSeoScore: params!.max_seo_score
          ? Number(params!.max_seo_score)
          : undefined,
        tags,
        authorId: params!.author_id,
        sortBy: params!.sort as any,
        sortOrder: params!.order as any,
        limit: params!.limit ? Number(params!.limit) : 50,
        offset: params!.offset ? Number(params!.offset) : 0,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      articles: result.data,
      total: result.data.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/articles');
  }
}

/**
 * POST /api/articles
 * Create a new article or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, articlesPostSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    // Handle bulk import
    if (body.bulk) {
      const data = validationResult.data as {
        bulk: true;
        organization_id: string;
        product_id?: string;
        articles: Array<any>;
      };
      const results = await bulkCreateArticles(
        client,
        data.organization_id,
        data.product_id || null,
        data.articles.map((article: any) => ({
          ...article,
          tags: article.tags
            ? article.tags.split(',').map((t: string) => t.trim())
            : [],
        }))
      );

      if (!results.success) {
        return NextResponse.json({ error: results.error }, { status: 500 });
      }

      return NextResponse.json(results.data, { status: 201 });
    }

    // Single article creation
    const data = validationResult.data as any;

    // Auto-generate slug if not provided
    let slug = data.slug;
    if (!slug && data.title) {
      slug = await generateUniqueSlug(client, data.organization_id, data.title);
    }

    const result = await createArticle(client, {
      organization_id: data.organization_id,
      product_id: data.product_id,
      keyword_id: data.keyword_id,
      title: data.title,
      slug: slug || data.slug,
      content: data.content,
      excerpt: data.excerpt,
      featured_image_url: data.featured_image_url,
      status: data.status,
      seo_score: data.seo_score,
      word_count: data.word_count,
      reading_time_minutes: data.reading_time_minutes,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      meta_keywords: data.meta_keywords,
      canonical_url: data.canonical_url,
      schema_type: data.schema_type,
      schema_data: data.schema_data,
      scheduled_at: data.scheduled_at,
      author_id: userId,
      tags: data.tags,
      category: data.category,
      metadata: data.metadata,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'POST /api/articles');
  }
}

/**
 * PATCH /api/articles
 * Update an article
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, updateArticleSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { id, ...updates } = validationResult.data;

    const client = getSupabaseServerClient();

    // Check if user has access to the article
    const hasAccess = await client.rpc(
      'can_access_article' as any,
      {
        p_article_id: id,
        p_user_id: userId,
      } as any
    );

    if (!hasAccess.data) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await updateArticleRecord(client, id, updates as any);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'PATCH /api/articles');
  }
}

/**
 * DELETE /api/articles
 * Delete an article
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      deleteArticleSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    const client = getSupabaseServerClient();

    // Check if user is owner (required for deletion)
    const { data: article } = await client
      .from('articles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const { data: memberRole } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (article as any).organization_id)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Only organization owners can delete articles' },
        { status: 403 }
      );
    }

    const result = await softDeleteArticle(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/articles');
  }
}

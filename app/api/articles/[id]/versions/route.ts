/**
 * Article Versions API Route
 * Handles version history for articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getArticleVersionsQuerySchema,
  createArticleVersionSchema,
  validateRequest,
} from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Type for article data
type ArticleData = { id: string; organization_id: string };

/**
 * GET /api/articles/[id]/versions
 * Fetch all versions of an article
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const articleId = params.id;

    // Validate query parameters
    const queryParams = Object.fromEntries(request.nextUrl.searchParams);
    const validationResult = validateRequest(
      queryParams,
      getArticleVersionsQuerySchema
    );

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { limit, offset, include_auto_saves } = validationResult.data!;

    const client = getSupabaseServerClient();

    // Check if user has access to the article
    const { data: article, error: articleError } = await client
      .from('articles')
      .select(
        `
        id,
        organization_id
      `
      )
      .eq('id', articleId)
      .filter('deleted_at', 'is', null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check organization membership
    const { data: member, error: memberError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (article as ArticleData).organization_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query for versions
    let query = client
      .from('article_versions')
      .select('*')
      .eq('article_id', articleId)
      .order('changed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter out auto-saves if requested
    if (!include_auto_saves) {
      query = query.eq('is_auto_save', false);
    }

    const { data: versions, error: versionsError } = await query;

    if (versionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      );
    }

    // Get total count
    const { count, error: countError } = await client
      .from('article_versions')
      .select('id', { count: 'exact', head: true })
      .eq('article_id', articleId)
      .eq('is_auto_save', include_auto_saves ? false : true);

    return NextResponse.json({
      versions: versions || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching article versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articles/[id]/versions
 * Create a new version of an article (manual save)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const articleId = params.id;

    const body = await request.json();
    const validationResult = validateRequest(body, createArticleVersionSchema);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { change_notes, is_auto_save } = validationResult.data!;

    const client = getSupabaseServerClient();

    // Check if user has access to the article
    const { data: article, error: articleError } = await client
      .from('articles')
      .select(
        `
        id,
        organization_id
      `
      )
      .eq('id', articleId)
      .filter('deleted_at', 'is', null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check organization membership (owner, admin, or member can create versions)
    const { data: member, error: memberError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (article as ArticleData).organization_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the current article data
    const { data: currentArticle, error: fetchError } = await client
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !currentArticle) {
      return NextResponse.json(
        { error: 'Failed to fetch article data' },
        { status: 500 }
      );
    }

    // Get the next version number
    const { data: existingVersions } = await client
      .from('article_versions')
      .select('version_number')
      .eq('article_id', articleId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersionNumber =
      existingVersions && existingVersions.length > 0
        ? (existingVersions as any)[0].version_number + 1
        : 1;

    // Extract current article data
    const currentArticleData = currentArticle as Record<string, unknown>;

    // Create the new version
    const { data: newVersion, error: versionError } = await (client as any)
      .from('article_versions')
      .insert({
        article_id: articleId,
        version_number: nextVersionNumber,
        title: currentArticleData.title,
        slug: currentArticleData.slug,
        content: currentArticleData.content,
        excerpt: currentArticleData.excerpt,
        featured_image_url: currentArticleData.featured_image_url,
        status: currentArticleData.status,
        seo_score: currentArticleData.seo_score,
        word_count: currentArticleData.word_count,
        reading_time_minutes: currentArticleData.reading_time_minutes,
        meta_title: currentArticleData.meta_title,
        meta_description: currentArticleData.meta_description,
        meta_keywords: currentArticleData.meta_keywords,
        canonical_url: currentArticleData.canonical_url,
        schema_type: currentArticleData.schema_type,
        schema_data: currentArticleData.schema_data,
        tags: currentArticleData.tags,
        category: currentArticleData.category,
        metadata: currentArticleData.metadata,
        changed_by: userId,
        change_notes: change_notes || null,
        is_auto_save: is_auto_save || false,
      })
      .select()
      .single();

    if (versionError || !newVersion) {
      console.error('Error creating version:', versionError);
      return NextResponse.json(
        { error: 'Failed to create version' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      version: newVersion,
      message: 'Version created successfully',
    });
  } catch (error) {
    console.error('Error creating article version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

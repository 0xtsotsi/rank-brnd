/**
 * Article Version Revert API Route
 * Handles reverting an article to a previous version
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { revertToVersionSchema, validateRequest } from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Type for article data
type ArticleData = { id: string; organization_id: string };

/**
 * POST /api/articles/[id]/versions/revert
 * Revert an article to a previous version
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
    const validationResult = validateRequest(body, revertToVersionSchema);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { version_number, change_notes } = validationResult.data!;

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

    // Check organization membership (only owner or admin can revert)
    const { data: member, error: memberError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (article as ArticleData).organization_id)
      .eq('user_id', userId)
      .single();

    if (
      memberError ||
      !member ||
      !['owner', 'admin'].includes((member as any).role)
    ) {
      return NextResponse.json(
        { error: 'Forbidden - Only owners and admins can revert versions' },
        { status: 403 }
      );
    }

    // Get the version to revert to
    const { data: targetVersion, error: versionError } = await client
      .from('article_versions')
      .select('*')
      .eq('article_id', articleId)
      .eq('version_number', version_number)
      .single();

    if (versionError || !targetVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Extract version data
    const versionData = targetVersion as Record<string, unknown>;

    // Update the article with the version data
    const { data: updatedArticle, error: updateError } = await (client as any)
      .from('articles')
      .update({
        title: versionData.title,
        slug: versionData.slug,
        content: versionData.content,
        excerpt: versionData.excerpt,
        featured_image_url: versionData.featured_image_url,
        status: versionData.status,
        seo_score: versionData.seo_score,
        word_count: versionData.word_count,
        reading_time_minutes: versionData.reading_time_minutes,
        meta_title: versionData.meta_title,
        meta_description: versionData.meta_description,
        meta_keywords: versionData.meta_keywords,
        canonical_url: versionData.canonical_url,
        schema_type: versionData.schema_type,
        schema_data: versionData.schema_data,
        tags: versionData.tags,
        category: versionData.category,
        metadata: versionData.metadata,
      })
      .eq('id', articleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error reverting article:', updateError);
      return NextResponse.json(
        { error: 'Failed to revert article' },
        { status: 500 }
      );
    }

    // Get the next version number for the revert action
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

    // Extract updated article data
    const updatedArticleData = updatedArticle as Record<string, unknown>;

    // Create a new version to record the revert action
    const { data: revertVersion, error: revertVersionError } = await (
      client as any
    )
      .from('article_versions')
      .insert({
        article_id: articleId,
        version_number: nextVersionNumber,
        title: updatedArticleData.title,
        slug: updatedArticleData.slug,
        content: updatedArticleData.content,
        excerpt: updatedArticleData.excerpt,
        featured_image_url: updatedArticleData.featured_image_url,
        status: updatedArticleData.status,
        seo_score: updatedArticleData.seo_score,
        word_count: updatedArticleData.word_count,
        reading_time_minutes: updatedArticleData.reading_time_minutes,
        meta_title: updatedArticleData.meta_title,
        meta_description: updatedArticleData.meta_description,
        meta_keywords: updatedArticleData.meta_keywords,
        canonical_url: updatedArticleData.canonical_url,
        schema_type: updatedArticleData.schema_type,
        schema_data: updatedArticleData.schema_data,
        tags: updatedArticleData.tags,
        category: updatedArticleData.category,
        metadata: updatedArticleData.metadata,
        changed_by: userId,
        change_notes: change_notes || `Reverted to version ${version_number}`,
        is_auto_save: false,
      })
      .select()
      .single();

    if (revertVersionError) {
      console.error('Error creating revert version:', revertVersionError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      article: updatedArticle,
      revert_version: revertVersion || null,
      message: `Successfully reverted to version ${version_number}`,
    });
  } catch (error) {
    console.error('Error reverting article version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

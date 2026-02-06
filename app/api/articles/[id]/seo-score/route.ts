/**
 * Article SEO Score API Route
 *
 * POST /api/articles/[id]/seo-score - Calculate and update SEO score for an article
 * GET /api/articles/[id]/seo-score - Get current SEO score with detailed breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { getArticleById, updateArticle } from '@/lib/supabase/articles';
import { analyzeSEO, type SEOAnalysisOptions } from '@/lib/seo';
import { handleAPIError } from '@/lib/api-error-handler';
import { z } from 'zod';
import type { Json } from '@/types/database';

/**
 * Schema for POST request to calculate SEO score
 */
const calculateSEOScoreSchema = z.object({
  target_keyword: z.string().optional(),
  min_word_count: z.coerce.number().int().positive().optional(),
  max_word_count: z.coerce.number().int().positive().optional(),
  target_grade_min: z.coerce.number().int().min(1).max(12).optional(),
  target_grade_max: z.coerce.number().int().min(1).max(12).optional(),
  base_url: z.string().url().optional().or(z.literal('')),
  update_article: z.boolean().optional().default(true),
});

/**
 * GET /api/articles/[id]/seo-score
 * Get the current SEO score and breakdown for an article
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Get the article
    const articleResult = await getArticleById(client, id);

    if (!articleResult.success) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articleResult.data;

    // Return the stored SEO score and metadata
    const seoData = (article.metadata as Record<string, unknown>)
      ?.seo_analysis as Record<string, unknown> | undefined;

    return NextResponse.json({
      article_id: article.id,
      seo_score: article.seo_score,
      seo_analysis: seoData || null,
      word_count: article.word_count,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      meta_keywords: article.meta_keywords,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/articles/[id]/seo-score');
  }
}

/**
 * POST /api/articles/[id]/seo-score
 * Calculate SEO score for an article and optionally update it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = calculateSEOScoreSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

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

    // Get the article
    const articleResult = await getArticleById(client, id);

    if (!articleResult.success) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const article = articleResult.data;

    // Calculate SEO score
    const options: SEOAnalysisOptions = {
      targetKeyword: data.target_keyword || article.meta_keywords?.[0],
      minWordCount: data.min_word_count,
      maxWordCount: data.max_word_count,
      targetFleschGradeMin: data.target_grade_min,
      targetFleschGradeMax: data.target_grade_max,
      baseUrl: data.base_url || undefined,
      checkBrokenLinks: false,
    };

    const analysisResult = analyzeSEO(
      {
        title: article.title,
        content: article.content,
        slug: article.slug,
        excerpt: article.excerpt || undefined,
        metaTitle: article.meta_title || undefined,
        metaDescription: article.meta_description || undefined,
        metaKeywords: article.meta_keywords || undefined,
        canonicalUrl: article.canonical_url || undefined,
      },
      options
    );

    // Update article with new SEO score and metadata
    if (data.update_article) {
      const updateResult = await updateArticle(client, id, {
        seo_score: analysisResult.overallScore,
        word_count: analysisResult.readability.wordCount,
        metadata: {
          ...(article.metadata as Record<string, unknown>),
          seo_analysis: {
            ...analysisResult,
            analyzed_at: new Date().toISOString(),
            analyzed_by: userId,
          },
        } as Record<string, unknown> as Json,
      });

      if (!updateResult.success) {
        return NextResponse.json(
          { error: 'Failed to update article with SEO score' },
          { status: 500 }
        );
      }
    }

    // Return the analysis results
    return NextResponse.json({
      article_id: id,
      seo_score: analysisResult.overallScore,
      grade: getGrade(analysisResult.overallScore),
      analysis: analysisResult,
      updated: data.update_article,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/articles/[id]/seo-score');
  }
}

/**
 * Get letter grade from numeric score
 */
function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

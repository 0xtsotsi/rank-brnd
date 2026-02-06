/**
 * SEO Analysis API Route
 *
 * POST /api/seo/analyze - Analyze SEO for content without saving
 *
 * This endpoint allows for SEO analysis without requiring a saved article.
 * Useful for real-time analysis in the editor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  analyzeSEO,
  type SEOAnalysisOptions,
  type ArticleInput,
} from '@/lib/seo';
import { handleAPIError } from '@/lib/api-error-handler';
import { z } from 'zod';

/**
 * Schema for SEO analysis request
 */
const seoAnalyzeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.array(z.string()).optional(),
  canonical_url: z.string().optional(),
  target_keyword: z.string().optional(),
  min_word_count: z.coerce.number().int().positive().optional(),
  max_word_count: z.coerce.number().int().positive().optional(),
  target_grade_min: z.coerce.number().int().min(1).max(12).optional(),
  target_grade_max: z.coerce.number().int().min(1).max(12).optional(),
  base_url: z.string().url().optional().or(z.literal('')),
});

/**
 * POST /api/seo/analyze
 * Analyze SEO for provided content
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = seoAnalyzeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Prepare article input
    const articleInput: ArticleInput = {
      title: data.title,
      content: data.content,
      slug: data.slug,
      excerpt: data.excerpt,
      metaTitle: data.meta_title,
      metaDescription: data.meta_description,
      metaKeywords: data.meta_keywords,
      canonicalUrl: data.canonical_url,
    };

    // Prepare analysis options
    const options: SEOAnalysisOptions = {
      targetKeyword: data.target_keyword,
      minWordCount: data.min_word_count,
      maxWordCount: data.max_word_count,
      targetFleschGradeMin: data.target_grade_min,
      targetFleschGradeMax: data.target_grade_max,
      baseUrl: data.base_url || undefined,
      checkBrokenLinks: false,
    };

    // Run SEO analysis
    const result = analyzeSEO(articleInput, options);

    // Return the analysis results
    return NextResponse.json({
      score: result.overallScore,
      grade: getGrade(result.overallScore),
      grade_description: getGradeDescription(result.overallScore),
      metrics: {
        keyword_density: {
          score: result.metrics.keywordDensity.score,
          passed: result.metrics.keywordDensity.passed,
          message: result.metrics.keywordDensity.message,
        },
        readability: {
          score: result.metrics.readability.score,
          passed: result.metrics.readability.passed,
          message: result.metrics.readability.message,
          grade_level: result.readability.fleschKincaidGrade,
        },
        heading_structure: {
          score: result.metrics.headingStructure.score,
          passed: result.metrics.headingStructure.passed,
          message: result.metrics.headingStructure.message,
        },
        meta_tags: {
          score: result.metrics.metaTags.score,
          passed: result.metrics.metaTags.passed,
          message: result.metrics.metaTags.message,
        },
        content_length: {
          score: result.metrics.contentLength.score,
          passed: result.metrics.contentLength.passed,
          message: result.metrics.contentLength.message,
          word_count: result.readability.wordCount,
        },
        internal_links: {
          score: result.metrics.internalLinks.score,
          passed: result.metrics.internalLinks.passed,
          message: result.metrics.internalLinks.message,
          count: result.links.internalLinks,
        },
        external_links: {
          score: result.metrics.externalLinks.score,
          passed: result.metrics.externalLinks.passed,
          message: result.metrics.externalLinks.message,
          count: result.links.externalLinks,
        },
        images: {
          score: result.metrics.imageAltText.score,
          passed: result.metrics.imageAltText.passed,
          message: result.metrics.imageAltText.message,
          total: result.images.totalImages,
          with_alt: result.images.imagesWithAlt,
        },
      },
      recommendations: result.recommendations,
      detailed_analysis: result,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/seo/analyze');
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

/**
 * Get grade description
 */
function getGradeDescription(score: number): string {
  if (score >= 90) return 'Excellent - Your content is well optimized for SEO.';
  if (score >= 80)
    return 'Good - Your content has strong SEO with minor improvements possible.';
  if (score >= 70)
    return 'Fair - Your content has decent SEO but needs some improvements.';
  if (score >= 60)
    return 'Poor - Your content needs significant SEO improvements.';
  return 'Very Poor - Your content requires major SEO work.';
}

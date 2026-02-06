/**
 * SEO Scoring Stage
 *
 * Analyzes the generated content for SEO quality and provides a score.
 * Optionally auto-optimizes the content for better SEO.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';
import { analyzeSEO, type SEOAnalysisOptions } from '@/lib/seo';

/**
 * Execute SEO scoring stage
 */
export async function executeSeoScoring(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const { options, keyword } = context;

  // Check if stage should be skipped
  if (options.skipSeoScoring) {
    console.log('[Pipeline] Skipping SEO scoring stage');
    return data;
  }

  console.log('[Pipeline] Running SEO analysis');

  try {
    const title = data.title || '';
    const content = data.content || '';
    const slug = data.slug || '';
    const excerpt = data.excerpt;
    const metaTitle = data.metaTitle;
    const metaDescription = data.metaDescription;
    const metaKeywords = data.metaKeywords;

    if (!title || !content) {
      console.log('[Pipeline] Insufficient content for SEO analysis');
      return data;
    }

    // Configure SEO analysis options
    const seoOptions: SEOAnalysisOptions = {
      targetKeyword: keyword,
      minWordCount: 500,
      maxWordCount: 5000,
      targetFleschGradeMin: 8,
      targetFleschGradeMax: 12,
      baseUrl: undefined,
      checkBrokenLinks: false,
    };

    // Run SEO analysis
    const analysisResult = analyzeSEO(
      {
        title,
        content,
        slug,
        excerpt,
        metaTitle,
        metaDescription,
        metaKeywords,
        canonicalUrl: undefined,
      },
      seoOptions
    );

    console.log(`[Pipeline] SEO score: ${analysisResult.overallScore}/100`);

    // Extract key metrics
    const seoAnalysis = {
      overallScore: analysisResult.overallScore,
      grade: getGrade(analysisResult.overallScore),
      keywordDensity: analysisResult.metrics?.keywordDensity?.score || 0,
      readabilityScore: analysisResult.metrics?.readability?.score || 0,
      headingStructureScore:
        analysisResult.metrics?.headingStructure?.score || 0,
      metaTagsScore: analysisResult.metrics?.metaTags?.score || 0,
      linkScore: analysisResult.metrics?.internalLinks?.score || 0,
      recommendations: analysisResult.recommendations || [],
    };

    // Auto-optimize if requested
    let optimizedContent = content;
    let optimizedMetaTitle = metaTitle;
    let optimizedMetaDescription = metaDescription;

    if (options.autoOptimizeSeo) {
      console.log('[Pipeline] Auto-optimizing content for SEO');

      // Simple optimizations
      // Ensure H1 exists
      if (!content.startsWith('# ')) {
        optimizedContent = `# ${title}\n\n${content}`;
      }

      // Ensure meta title is optimal length (50-60 chars)
      if (title.length > 60) {
        optimizedMetaTitle = title.substring(0, 57) + '...';
      } else if (!metaTitle) {
        optimizedMetaTitle = title;
      }

      // Ensure meta description is optimal length (150-160 chars)
      if (!metaDescription) {
        optimizedMetaDescription = generateMetaDescription(keyword, title);
      } else if (metaDescription.length > 160) {
        optimizedMetaDescription = metaDescription.substring(0, 157) + '...';
      }

      console.log('[Pipeline] Content optimized for SEO');
    }

    return {
      ...data,
      content: optimizedContent,
      metaTitle: optimizedMetaTitle,
      metaDescription: optimizedMetaDescription,
      seoAnalysis,
    };
  } catch (error) {
    console.error('[Pipeline] SEO scoring failed:', error);
    // Don't fail the pipeline, just continue without SEO data
    return data;
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
 * Generate meta description
 */
function generateMetaDescription(keyword: string, title: string): string {
  const keywordLower = keyword.toLowerCase();
  return `Discover comprehensive strategies and expert insights on ${keywordLower}. Learn proven techniques to achieve optimal results in this detailed guide about ${title}.`;
}

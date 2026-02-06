/**
 * Finalization Stage
 *
 * Saves the final article to the database and updates all metadata.
 * This is the final stage that commits all the work.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';
import { createArticle, updateArticle } from '@/lib/supabase/articles';
import { calculateReadingTime } from '@/lib/supabase/articles';

/**
 * Execute finalization stage
 */
export async function executeFinalization(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const {
    supabase,
    organizationId,
    productId,
    keywordId,
    userId,
    options,
    keyword,
  } = context;

  console.log('[Pipeline] Finalizing article');

  try {
    const title = data.title || 'Untitled Article';
    const slug = data.slug || 'untitled-article';
    const content = data.content || '';
    const excerpt = data.excerpt;
    const featuredImage = data.generatedImages?.find((img) => img.isFeatured);
    const seoScore = data.seoAnalysis?.overallScore;

    // Calculate word count
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    const readingTime = calculateReadingTime(wordCount);

    // If article already exists, update it
    if (data.articleId) {
      console.log(`[Pipeline] Updating existing article: ${data.articleId}`);

      const updateData: any = {
        content,
        excerpt,
        featured_image_url: featuredImage?.url,
        word_count: wordCount,
        reading_time_minutes: readingTime,
        meta_title: data.metaTitle,
        meta_description: data.metaDescription,
        seo_score: seoScore,
      };

      // Update metadata with pipeline results
      const metadata: Record<string, unknown> = {
        pipeline: {
          completedAt: new Date().toISOString(),
          stages: {
            serpAnalysis: !!data.serpAnalysis,
            outlineGeneration: !!data.outline,
            draftGeneration: !!content,
            internalLinking: (data.internalLinkSuggestions?.length || 0) > 0,
            externalLinking: (data.externalLinkOpportunities?.length || 0) > 0,
            imageGeneration: (data.generatedImages?.length || 0) > 0,
            seoScoring: !!data.seoAnalysis,
          },
          generatedImages: data.generatedImages?.map((img) => ({
            url: img.url,
            style: img.style,
            isFeatured: img.isFeatured,
          })),
          internalLinks: data.internalLinkSuggestions,
          externalLinks: data.externalLinkOpportunities,
        },
        seo_analysis: data.seoAnalysis,
        serp_analysis: data.serpAnalysis,
      };

      if (options.saveIntermediateResults) {
        updateData.metadata = metadata;
      }

      const result = await updateArticle(supabase, data.articleId, updateData);

      if (result.success) {
        console.log('[Pipeline] Article updated successfully');
        return data;
      }

      console.error('[Pipeline] Failed to update article:', result.error);
      return data;
    }

    // Create new article
    console.log('[Pipeline] Creating new article');

    const articleData = {
      organization_id: organizationId,
      product_id: productId,
      keyword_id: keywordId,
      title,
      slug,
      content,
      excerpt,
      featured_image_url: featuredImage?.url,
      status: 'draft' as const,
      seo_score: seoScore,
      word_count: wordCount,
      reading_time_minutes: readingTime,
      meta_title: data.metaTitle,
      meta_description: data.metaDescription,
      meta_keywords: data.metaKeywords,
      author_id: userId,
      tags: [keyword],
      metadata: options.saveIntermediateResults
        ? {
            pipeline: {
              completedAt: new Date().toISOString(),
              stages: {
                serpAnalysis: !!data.serpAnalysis,
                outlineGeneration: !!data.outline,
                draftGeneration: !!content,
                internalLinking:
                  (data.internalLinkSuggestions?.length || 0) > 0,
                externalLinking:
                  (data.externalLinkOpportunities?.length || 0) > 0,
                imageGeneration: (data.generatedImages?.length || 0) > 0,
                seoScoring: !!data.seoAnalysis,
              },
              generatedImages: data.generatedImages?.map((img) => ({
                url: img.url,
                style: img.style,
                isFeatured: img.isFeatured,
              })),
              internalLinks: data.internalLinkSuggestions,
              externalLinks: data.externalLinkOpportunities,
            },
            seo_analysis: data.seoAnalysis,
            serp_analysis: data.serpAnalysis,
          }
        : {},
    };

    const result = await createArticle(supabase, articleData);

    if (result.success) {
      console.log(`[Pipeline] Article created successfully: ${result.data.id}`);
      return {
        ...data,
        articleId: result.data.id,
      };
    }

    console.error('[Pipeline] Failed to create article:', result.error);
    return data;
  } catch (error) {
    console.error('[Pipeline] Finalization failed:', error);
    return data;
  }
}

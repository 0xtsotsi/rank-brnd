/**
 * Internal Linking Stage
 *
 * Analyzes content and generates internal link suggestions to other articles
 * within the same product/organization.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';

/**
 * Execute internal linking stage
 */
export async function executeInternalLinking(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const { organizationId, productId, options, keyword, supabase } = context;
  const articleId = data.articleId;

  // Check if stage should be skipped
  if (options.skipInternalLinking || !articleId || !productId) {
    console.log('[Pipeline] Skipping internal linking stage');
    return data;
  }

  console.log('[Pipeline] Generating internal link suggestions');

  try {
    // Dynamically import the internal linking service
    const { generateInternalLinkSuggestions, getCandidateArticles } =
      await import('@/lib/internal-linking');

    // Get candidate articles from the same product
    const candidatesResult = await getCandidateArticles(
      supabase as any,
      organizationId,
      productId,
      { excludeArticleIds: [articleId], limit: 50 }
    );

    const candidates = candidatesResult.data || [];

    // Generate internal link suggestions
    const sourceArticle = {
      id: articleId,
      title: data.title || keyword,
      content: data.content || null,
      slug: data.slug || '',
    };

    const suggestions = generateInternalLinkSuggestions(
      sourceArticle,
      candidates,
      { maxSuggestions: options.maxInternalLinks || 5 }
    );

    console.log(
      `[Pipeline] Generated ${suggestions.length} internal link suggestions`
    );

    // Convert to pipeline format
    const internalLinkSuggestions = suggestions.map((suggestion: any) => ({
      targetArticleId: suggestion.target_article_id,
      targetArticleTitle: suggestion.target_article?.title || '',
      suggestedAnchorText: suggestion.suggested_anchor_text || '',
      contextSnippet: suggestion.context_snippet || '',
      relevanceScore: suggestion.relevance_score || 0,
      positionInContent: suggestion.position_in_content,
    }));

    // Auto-apply links if requested
    if (options.autoApplyInternalLinks && internalLinkSuggestions.length > 0) {
      console.log('[Pipeline] Auto-applying internal links to content');
      // Note: The actual link application would be done here
      // For now, we're just collecting the suggestions
    }

    return {
      ...data,
      internalLinkSuggestions,
    };
  } catch (error) {
    console.error('[Pipeline] Internal linking failed:', error);
    // Don't fail the pipeline, just continue without internal links
    return {
      ...data,
      internalLinkSuggestions: [],
    };
  }
}

/**
 * Niche Relevance Matching Module
 *
 * Main entry point for the niche relevance matching algorithm.
 * Matches articles with exchange network sites using semantic similarity,
 * tag matching, and category analysis.
 *
 * @example
 * ```ts
 * import { getRecommendations, analyzeArticleNiches } from '@/lib/niche-relevance';
 *
 * // Analyze an article
 * const analysis = analyzeArticleNiches({
 *   title: "10 SEO Tips for SaaS Growth",
 *   content: "...",
 *   category: "Marketing",
 *   tags: ["SEO", "SaaS", "Marketing"]
 * });
 *
 * // Get recommendations
 * const recommendations = await getRecommendations({
 *   article: { title: "...", content: "...", category: "Marketing" },
 *   organization_id: "org-123",
 *   min_relevance_score: 60
 * });
 * ```
 */

// Export types
export type {
  ArticleNicheAnalysis,
  NicheHierarchy,
  RecommendationRequest,
  RecommendationResponse,
  ScoringWeights,
  SiteRelevanceScore,
} from './types';

// Export niche hierarchy functions
export {
  getAllNiches,
  getChildrenNiches,
  getNicheHierarchy,
  getParentNiche,
  getRelatedNiches,
  getSynonyms,
  normalizeNiche,
  NICHE_HIERARCHY,
} from './niche-hierarchy';

// Export scoring functions
export {
  calculateCategoryOverlap,
  calculateKeywordMatch,
  calculateNicheRelevance,
  calculateNicheSimilarity,
  calculateSemanticSimilarity,
  calculateSiteRelevance,
  getTopSites,
  normalizeDomainAuthority,
  normalizeQualityScore,
  normalizeResponseTime,
  normalizeSpamScore,
  normalizeSuccessRate,
  scoreAndRankSites,
} from './scoring';

// Re-export MarketplaceSite type from scoring
export type { MarketplaceSite } from './scoring';

// Export article analyzer functions
export {
  analyzeArticleNiches,
  detectNicheFromCategory,
  detectNichesFromKeywords,
  detectNichesFromTags,
  extractKeywords,
  quickNicheDetect,
} from './article-analyzer';

// Re-import for type exports
import type { RecommendationRequest, RecommendationResponse } from './types';
import { DEFAULT_SCORING_WEIGHTS } from './types';
import { analyzeArticleNiches } from './article-analyzer';
import { getTopSites } from './scoring';
import type { MarketplaceSite } from './scoring';

/**
 * Get exchange site recommendations for an article
 *
 * This is the main entry point for getting personalized recommendations
 * based on article content and niche relevance.
 *
 * @param request - Recommendation request parameters
 * @returns Recommendation response with scored sites
 */
export async function getRecommendations(
  request: RecommendationRequest & {
    sites: MarketplaceSite[];
  }
): Promise<RecommendationResponse> {
  const {
    article,
    target_niches,
    target_keywords,
    sites,
    min_relevance_score = 0,
    max_results = 50,
    scoring_weights,
  } = request;

  // Analyze article if provided
  let articleAnalysis;
  if (article) {
    articleAnalysis = analyzeArticleNiches({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      meta_keywords: article.meta_keywords,
    });
  }

  // Determine target niches
  const nichesToMatch =
    target_niches ??
    (articleAnalysis
      ? [articleAnalysis.primary_niche, ...articleAnalysis.secondary_niches]
      : []);

  // Merge scoring weights with defaults
  const weights = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...(scoring_weights || {}),
  };

  // Get top sites
  const recommendations = getTopSites(
    {
      title: article?.title || '',
      content: article?.content,
      category: article?.category,
      tags: article?.tags,
      meta_keywords: [
        ...(article?.meta_keywords || []),
        ...(target_keywords || []),
      ],
    },
    sites,
    max_results,
    min_relevance_score,
    articleAnalysis,
    weights
  );

  return {
    recommendations,
    total_count: recommendations.length,
    article_analysis: articleAnalysis,
    filters_applied: {
      min_relevance_score,
      niches_considered: nichesToMatch,
    },
  };
}

/**
 * Calculate a single relevance score for an article-site pair
 *
 * Useful for displaying relevance indicators in UI components
 */
export function calculateRelevanceScore(
  article: {
    title: string;
    content?: string;
    category?: string;
    tags?: string[];
  },
  site: MarketplaceSite
): number {
  const analysis = analyzeArticleNiches(article);
  const result = getTopSites(article, [site], 1, 0, analysis);
  return result[0]?.relevance_score || 0;
}

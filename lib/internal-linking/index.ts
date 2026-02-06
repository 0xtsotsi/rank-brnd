/**
 * Internal Linking Service
 *
 * Main service for analyzing article content and suggesting internal links
 * based on semantic matching with existing articles in the product.
 *
 * @example
 * ```ts
 * import { generateInternalLinkOpportunities } from '@/lib/internal-linking';
 *
 * const opportunities = await generateInternalLinkOpportunities({
 *   articleId: articleId,
 *   organizationId: orgId,
 *   productId: productId,
 * });
 * ```
 */

// Re-export all types
export * from './types';

// Re-export core functions
export {
  analyzeContentForInternalLinks,
  extractKeywords,
  extractTopics,
  extractEntities,
  findBestInsertPosition,
  generateAnchorText,
  calculateRelevanceScore,
} from './content-analyzer';

export {
  findRelevantArticles,
  generateInternalLinkSuggestions,
  findReciprocalLinkingOpportunities,
  analyzeContentOnly,
  getRelatedArticles,
  calculateInternalLinkingScore,
} from './article-matcher';

export {
  applyInternalLinksToContent,
  removeInternalLinksFromContent,
  previewInternalLinksInContent,
  generateRelatedArticlesSection,
  validateInternalLinks,
  countInternalLinks,
} from './link-applicator';

export {
  createInternalLinkSuggestions,
  getArticleInternalLinkSuggestions,
  getArticleInboundInternalLinks,
  getProductInternalLinkSuggestions,
  getInternalLinkSuggestionsWithArticles,
  getInternalLinkSuggestion,
  createInternalLinkSuggestion,
  updateInternalLinkSuggestion,
  updateInternalLinkSuggestionStatuses,
  softDeleteInternalLinkSuggestion,
  getInternalLinkStats,
  getCandidateArticles,
} from './database';

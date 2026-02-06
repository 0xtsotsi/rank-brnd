/**
 * Internal Linking Types
 *
 * Type definitions for the internal linking service.
 */

/**
 * Article for internal linking matching
 */
export interface ArticleForMatching {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  tags: string[] | null;
  category: string | null;
  status: 'draft' | 'published' | 'archived';
  word_count: number | null;
  keyword_id: string | null;
  metadata: Record<string, any> | null;
}

/**
 * Content analysis result for internal linking
 */
export interface ContentAnalysisForInternalLinks {
  keywords: string[];
  topics: string[];
  entities: string[];
  suggestedLinkCount: number;
  wordCount: number;
}

/**
 * Suggested internal link with target article details
 */
export interface SuggestedInternalLink {
  target_article_id: string;
  target_article_title: string;
  target_article_slug: string;
  target_article_excerpt: string | null;
  suggested_anchor_text: string;
  context_snippet: string;
  position_in_content: number | null;
  relevance_score: number;
  keywords: string[];
  link_type: 'contextual' | 'related' | 'see_also' | 'further_reading';
}

/**
 * Internal link generation options
 */
export interface InternalLinkGenerationOptions {
  minRelevanceScore?: number;
  maxSuggestions?: number;
  excludeKeywords?: string[];
  excludeArticleIds?: string[];
  preferredArticleIds?: string[];
  linkType?: 'contextual' | 'related' | 'see_also' | 'further_reading';
  onlyPublishedArticles?: boolean;
}

/**
 * Internal link application result
 */
export interface InternalLinkApplicationResult {
  success: boolean;
  updatedContent: string;
  linksApplied: number;
  suggestionsUpdated: string[];
  errors: Array<{
    suggestionId: string;
    error: string;
  }>;
}

/**
 * Relevance match result
 */
export interface RelevanceMatch {
  article: ArticleForMatching;
  score: number;
  matchingKeywords: string[];
  suggestedAnchorText: string;
}

/**
 * Internal link suggestion from database
 */
export interface InternalLinkSuggestion {
  id: string;
  organization_id: string;
  product_id: string | null;
  source_article_id: string | null;
  target_article_id: string;
  keyword: string | null;
  suggested_anchor_text: string | null;
  context_snippet: string | null;
  position_in_content: number | null;
  relevance_score: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  link_type: string;
  notes: string | null;
  suggested_at: string;
  approved_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Internal link statistics
 */
export interface InternalLinkStats {
  total_suggestions: number;
  pending_suggestions: number;
  approved_suggestions: number;
  applied_suggestions: number;
  rejected_suggestions: number;
  avg_relevance_score: number;
}

/**
 * Database result type pattern
 */
export type InternalLinkingResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

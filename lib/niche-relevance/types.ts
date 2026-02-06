/**
 * Niche Relevance Matching Types
 *
 * Types for the niche relevance matching algorithm that matches
 * articles with exchange network sites based on semantic similarity,
 * tag matching, and category analysis.
 */

/**
 * Niche hierarchy mapping for semantic similarity
 * Maps broader categories to their sub-niches
 */
export interface NicheHierarchy {
  niche: string;
  parent?: string;
  children: string[];
  related: string[];
  synonyms: string[];
}

/**
 * Article niche analysis result
 */
export interface ArticleNicheAnalysis {
  primary_niche: string;
  secondary_niches: string[];
  confidence_score: number;
  extracted_keywords: string[];
  categories: string[];
}

/**
 * Site relevance score result
 */
export interface SiteRelevanceScore {
  site_id: string;
  domain: string;
  relevance_score: number; // 0-100
  match_details: {
    niche_matches: {
      niche: string;
      weight: number;
    }[];
    category_matches: string[];
    keyword_matches: string[];
    semantic_similarity: number;
  };
  quality_adjusted_score: number; // Relevance adjusted by quality metrics
}

/**
 * Scoring weights configuration
 */
export interface ScoringWeights {
  niche_relevance: number; // Weight for niche matching
  semantic_similarity: number; // Weight for semantic similarity
  domain_authority: number; // Weight for DA
  quality_score: number; // Weight for quality score
  response_time: number; // Weight for response time (lower is better)
  success_rate: number; // Weight for success rate
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  niche_relevance: 0.35,
  semantic_similarity: 0.15,
  domain_authority: 0.2,
  quality_score: 0.15,
  response_time: 0.05,
  success_rate: 0.1,
};

/**
 * Recommendation request parameters
 */
export interface RecommendationRequest {
  article?: {
    id?: string;
    title: string;
    content?: string;
    category?: string;
    tags?: string[];
    meta_keywords?: string[];
  };
  target_niches?: string[];
  target_keywords?: string[];
  organization_id: string;
  product_id?: string;
  min_relevance_score?: number; // Minimum relevance threshold (0-100)
  max_results?: number;
  scoring_weights?: Partial<ScoringWeights>;
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
  recommendations: SiteRelevanceScore[];
  total_count: number;
  article_analysis?: ArticleNicheAnalysis;
  filters_applied: {
    min_relevance_score: number;
    niches_considered: string[];
  };
}

/**
 * SerpAPI Types
 *
 * Type definitions for SerpAPI integration including search parameters,
 * results, and analysis types.
 */

import type { Json } from './database';

// ============================================================================
// Search Parameters
// ============================================================================

/**
 * Search parameters for SerpAPI requests
 */
export interface SerpSearchParams {
  /** Search query */
  query: string;
  /** Google domain to use (e.g., google.com, google.co.uk) */
  googleDomain?: string;
  /** Language code (e.g., en, es, fr) */
  language?: string;
  /** Country code (e.g., us, uk, ca) */
  country?: string;
  /** Number of results to return (max 100) */
  num?: number;
  /** Starting index for pagination */
  start?: number;
  /** Device type */
  device?: 'desktop' | 'mobile' | 'tablet';
  /** Safe search setting */
  safe?: 'active' | 'off';
  /** Location for localized results */
  location?: string;
}

// ============================================================================
// Organic Results
// ============================================================================

/**
 * Sitelinks that appear under some search results
 */
export interface Sitelink {
  title: string;
  link: string;
  snippet?: string;
}

/**
 * Rich snippet data (structured data markup)
 */
export interface RichSnippet {
  top?: {
    extensions?: string[];
    decorated?: boolean;
  };
  bottom?: {
    extensions?: string[];
    rating?: number;
    votes?: number;
    price?: string;
  };
}

/**
 * Individual organic search result
 */
export interface OrganicResult {
  /** Position in search results (1-based) */
  position: number;
  /** Page title */
  title: string;
  /** Page URL */
  link: string;
  /** Displayed URL (breadcrumb format) */
  displayedLink: string;
  /** Page snippet/description */
  snippet: string;
  /** Publication date (if available) */
  date?: string;
  /** Rich snippet data */
  richSnippet?: RichSnippet;
  /** Sitelinks under this result */
  sitelinks?: Sitelink[];
  /** Cached page link */
  cachedPageLink?: string;
}

// ============================================================================
// SERP Features
// ============================================================================

/**
 * People Also Ask box
 */
export interface PeopleAlsoAsk {
  /** The question */
  question: string;
  /** Answer snippet */
  snippet: string;
  /** Title of the source page */
  title: string;
  /** Link to the source page */
  link: string;
}

/**
 * Related searches
 */
export interface RelatedSearch {
  /** Related query text */
  query: string;
  /** Link to search for this query */
  link: string;
}

/**
 * Knowledge Graph entry
 */
export interface KnowledgeGraph {
  /** Title of the entity */
  title?: string;
  /** Type of entity */
  type?: string;
  /** Description */
  description?: string;
  /** URL */
  website?: string;
  /** Image URL */
  imageUrl?: string;
  /** Key-value pairs of attributes */
  attributes?: Record<string, string>;
}

/**
 * Featured snippet
 */
export interface FeaturedSnippet {
  /** Type of snippet */
  type: 'paragraph' | 'list' | 'table' | 'carousel';
  /** Title */
  title: string;
  /** Displayed link */
  displayedLink: string;
  /** Snippet content */
  snippet: string;
  /** Source link */
  link: string;
}

/**
 * Local pack result (map results)
 */
export interface LocalResult {
  /** Position in local pack */
  position: number;
  /** Business name */
  title: string;
  /** Street address */
  address: string;
  /** Phone number */
  phone: string;
  /** Rating out of 5 */
  rating?: number;
  /** Number of reviews */
  reviews?: number;
  /** Link to website */
  link?: string;
  /** Latitude */
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// Search Response
// ============================================================================

/**
 * Search parameters from the response
 */
export interface SearchInformation {
  /** Time taken to search (seconds) */
  searchTime?: number;
  /** Total results found */
  totalResults?: string;
}

/**
 * Complete SerpAPI response
 */
export interface SerpApiResponse {
  /** Search parameters used */
  searchParameters: {
    engine: string;
    q: string;
    googleDomain: string;
    gl: string;
    hl: string;
    num: number;
    start: number;
    device: string;
    safe: string;
  };
  /** Organic search results */
  organicResults: OrganicResult[];
  /** Featured snippet (if present) */
  featuredSnippet?: FeaturedSnippet;
  /** People Also Ask questions */
  peopleAlsoAsk?: PeopleAlsoAsk[];
  /** Related searches */
  relatedSearches?: RelatedSearch[];
  /** Knowledge Graph entry */
  knowledgeGraph?: KnowledgeGraph;
  /** Local pack results */
  localResults?: LocalResult[];
  /** Search information */
  searchInformation?: SearchInformation;
  /** Images (if image search) */
  images?: Array<{
    title: string;
    link: string;
    thumbnail: string;
    source: string;
  }>;
}

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * Content type classification
 */
export type ContentType =
  | 'blog_post'
  | 'product_page'
  | 'category_page'
  | 'homepage'
  | 'landing_page'
  | 'documentation'
  | 'news_article'
  | 'video'
  | 'forum'
  | 'comparison'
  | 'review'
  | 'how_to'
  | 'listicle'
  | 'unknown';

/**
 * SEO indicators extracted from a result
 */
export interface SeoIndicators {
  /** Whether title contains the target keyword */
  titleContainsKeyword: boolean;
  /** Title character length */
  titleLength: number;
  /** Whether snippet contains the target keyword */
  snippetContainsKeyword: boolean;
  /** Snippet character length */
  snippetLength: number;
  /** URL structure type */
  urlStructure: 'clean' | 'parameterized' | 'dated' | 'mixed';
  /** Whether URL uses HTTPS */
  hasHttps: boolean;
  /** URL depth (number of segments) */
  urlDepth: number;
  /** Whether result has a date */
  hasDate: boolean;
  /** Estimated authority tier */
  estimatedAuthorityTier: 'high' | 'medium' | 'low' | 'unknown';
}

/**
 * Competitor content structure analysis
 */
export interface CompetitorContentStructure {
  /** Original search result */
  result: OrganicResult;
  /** Extracted domain */
  domain: string;
  /** Estimated content length */
  estimatedContentLength: 'short' | 'medium' | 'long';
  /** Classified content type */
  contentType: ContentType;
  /** Whether rich snippets are present */
  hasRichSnippets: boolean;
  /** Whether sitelinks are present */
  hasSitelinks: boolean;
  /** SEO indicators */
  seoIndicators: SeoIndicators;
}

/**
 * Content gap identified from analysis
 */
export interface ContentGap {
  /** Type of gap */
  type:
    | 'missing_format'
    | 'missing_depth'
    | 'missing_freshness'
    | 'missing_structure'
    | 'missing_topic';
  /** Description of the gap */
  description: string;
  /** Opportunity score (0-100) */
  opportunityScore: number;
}

/**
 * Content recommendation priority
 */
export type RecommendationPriority = 'high' | 'medium' | 'low';

/**
 * Content recommendation based on analysis
 */
export interface ContentRecommendation {
  /** Type of recommendation */
  type:
    | 'content_format'
    | 'word_count'
    | 'seo_element'
    | 'structure'
    | 'schema';
  /** The recommendation text */
  recommendation: string;
  /** Priority level */
  priority: RecommendationPriority;
  /** What the recommendation is based on */
  basedOn: string;
}

/**
 * SERP analysis summary
 */
export interface SerpAnalysisSummary {
  /** The search query analyzed */
  query: string;
  /** Search parameters used */
  searchParams: SerpSearchParams;
  /** When analysis was performed */
  analyzedAt: Date;
  /** Number of organic results analyzed */
  totalOrganicResults: number;
  /** Whether featured snippet was present */
  hasFeaturedSnippet: boolean;
  /** Whether knowledge graph was present */
  hasKnowledgeGraph: boolean;
  /** Whether local pack was present */
  hasLocalPack: boolean;
  /** Number of PAA questions */
  paaCount: number;
  /** Competitor analysis */
  competitors: CompetitorContentStructure[];
  /** Calculated SERP difficulty (0-100) */
  serpDifficulty: number;
  /** Identified content gaps */
  contentGaps: ContentGap[];
  /** Generated recommendations */
  recommendations: ContentRecommendation[];
}

// ============================================================================
// Database Types (matching serp_analyses table)
// ============================================================================

/**
 * SERP analysis status
 */
export type SerpAnalysisStatus =
  | 'pending'
  | 'analyzing'
  | 'completed'
  | 'failed';

/**
 * SERP feature data
 */
export interface SerpFeatures {
  featuredSnippet?: FeaturedSnippet;
  knowledgeGraph?: KnowledgeGraph;
  localResults?: LocalResult[];
  peopleAlsoAsk?: PeopleAlsoAsk[];
  relatedSearches?: RelatedSearch[];
}

/**
 * SERP analysis database record (from serp_analyses table)
 */
export interface SerpAnalysis {
  id: string;
  organization_id: string;
  product_id: string | null;
  keyword_id: string;
  query: string;
  device: string;
  location: string;
  competitor_urls: string[];
  competitor_domains: string[];
  top_10_results: Json;
  gaps: Json;
  serp_features: Json;
  search_volume: number;
  difficulty_score: number | null;
  opportunity_score: number | null;
  status: SerpAnalysisStatus;
  error_message: string | null;
  recommendations: Json;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Json;
}

/**
 * Input for creating a SERP analysis
 */
export interface SerpAnalysisInsert {
  organization_id: string;
  product_id?: string | null;
  keyword_id: string;
  query: string;
  device?: string;
  location?: string;
  search_volume?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * SerpAPI error structure
 */
export interface SerpApiError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * Custom error class for SerpAPI errors
 */
export class SerpApiException extends Error {
  code: string;
  status?: number;
  details?: Record<string, unknown>;

  constructor(error: SerpApiError) {
    super(error.message);
    this.name = 'SerpApiException';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }

  static isSerpApiError(error: unknown): error is SerpApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error
    );
  }
}

// ============================================================================
// Zod Schemas
// ============================================================================

import { z } from 'zod';

/**
 * Zod schema for validating search parameters
 */
export const SerpSearchParamsSchema = z.object({
  query: z.string().min(1).max(500),
  googleDomain: z.string().optional(),
  language: z.string().length(2).optional(),
  country: z.string().length(2).optional(),
  num: z.number().int().min(1).max(100).optional(),
  start: z.number().int().min(0).optional(),
  device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  safe: z.enum(['active', 'off']).optional(),
  location: z.string().optional(),
});

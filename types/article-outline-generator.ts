/**
 * Article Outline Generator Types
 *
 * Types for the article outline generation service that combines keyword research,
 * SERP analysis, and brand voice to create structured H1/H2/H3 hierarchies.
 */

import type { Json } from './database';

// ============================================================================
// Outline Structure Types
// ============================================================================

/**
 * Heading levels for article outlines
 */
export type HeadingLevel = 'H1' | 'H2' | 'H3';

/**
 * A single heading in the outline
 */
export interface OutlineHeading {
  /** The heading level (H1, H2, or H3) */
  level: HeadingLevel;
  /** The heading text */
  text: string;
  /** Description of what this section should cover */
  description: string;
  /** Estimated word count for this section */
  estimatedWordCount: number;
  /** Suggested keywords to include in this section */
  suggestedKeywords: string[];
  /** Whether this section is optional */
  optional: boolean;
}

/**
 * Complete article outline structure
 */
export interface ArticleOutline {
  /** The main H1 heading */
  h1: OutlineHeading;
  /** H2 sections with their H3 subsections */
  sections: OutlineSection[];
}

/**
 * An H2 section with optional H3 subsections
 */
export interface OutlineSection {
  /** The H2 heading */
  heading: OutlineHeading;
  /** H3 subsections (optional) */
  subsections?: OutlineHeading[];
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Outline generation detail level
 */
export type DetailLevel = 'basic' | 'standard' | 'comprehensive';

/**
 * Content type for the outline
 */
export type OutlineContentType =
  | 'blog_post'
  | 'guide'
  | 'tutorial'
  | 'listicle'
  | 'review'
  | 'comparison'
  | 'case_study'
  | 'news_article'
  | 'opinion'
  | 'faq'
  | 'how_to';

/**
 * SERP analysis integration options
 */
export interface SerpIntegrationOptions {
  /** Whether to include SERP analysis in outline generation */
  enabled: boolean;
  /** How much weight to give SERP data (0-1) */
  weight: number;
  /** Whether to analyze competitor content gaps */
  includeContentGaps: boolean;
}

/**
 * Brand voice integration options
 */
export interface BrandVoiceOptions {
  /** Whether to apply brand voice to the outline */
  enabled: boolean;
  /** Specific brand voice sample ID to use (optional) */
  sampleId?: string;
  /** Tone override (optional) */
  toneOverride?: string[];
}

/**
 * Article outline generation request
 */
export interface ArticleOutlineRequest {
  /** Organization ID */
  organizationId: string;
  /** Product ID (optional) */
  productId?: string;
  /** Keyword ID for topic research */
  keywordId?: string;
  /** Primary keyword/phrase for the outline */
  keyword: string;
  /** Content type */
  contentType?: OutlineContentType;
  /** Target audience description */
  targetAudience?: string;
  /** Detail level for the outline */
  detailLevel?: DetailLevel;
  /** Estimated total word count */
  targetWordCount?: number;
  /** Number of H2 sections to generate */
  sectionCount?: number;
  /** SERP integration options */
  serpIntegration?: SerpIntegrationOptions;
  /** Brand voice options */
  brandVoice?: BrandVoiceOptions;
  /** User ID for ownership tracking */
  userId?: string;
  /** Additional context or requirements */
  additionalContext?: string;
}

/**
 * Article outline generation response
 */
export interface ArticleOutlineResponse {
  /** Unique ID for the generated outline */
  id: string;
  /** The generated outline structure */
  outline: ArticleOutline;
  /** The keyword used for generation */
  keyword: string;
  /** Content type */
  contentType: OutlineContentType;
  /** Total estimated word count */
  totalEstimatedWordCount: number;
  /** SERP analysis summary (if available) */
  serpInsights?: SerpInsights;
  /** Brand voice applied (if available) */
  brandVoiceApplied?: BrandVoiceSummary;
  /** SEO recommendations */
  seoRecommendations: string[];
  /** Timestamp of generation */
  createdAt: number;
  /** Generation metadata */
  metadata: OutlineMetadata;
}

/**
 * SERP insights summary
 */
export interface SerpInsights {
  /** Competitor content patterns found */
  competitorPatterns: string[];
  /** Content gaps identified */
  contentGaps: string[];
  /** Recommended topics to cover */
  recommendedTopics: string[];
  /** SERP difficulty score (0-100) */
  difficultyScore: number;
}

/**
 * Brand voice summary
 */
export interface BrandVoiceSummary {
  /** Tone applied */
  tone: string[];
  /** Vocabulary level */
  vocabularyLevel: string;
  /** Style applied */
  style: string;
}

/**
 * Generation metadata
 */
export interface OutlineMetadata {
  /** Model used for generation */
  model: string;
  /** Tokens used (if available) */
  tokensUsed?: number;
  /** Generation time in milliseconds */
  generationTime: number;
  /** SERP analysis ID used (if applicable) */
  serpAnalysisId?: string;
  /** Brand voice sample ID used (if applicable) */
  brandVoiceSampleId?: string;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Outline generation status
 */
export type OutlineStatus = 'pending' | 'generating' | 'completed' | 'failed';

/**
 * Stored outline database record
 */
export interface StoredArticleOutline {
  id: string;
  organization_id: string;
  product_id: string | null;
  user_id: string | null;
  keyword_id: string | null;
  keyword: string;
  content_type: string;
  outline: Json;
  serp_insights: Json | null;
  brand_voice_applied: Json | null;
  seo_recommendations: string[];
  target_word_count: number | null;
  estimated_word_count: number;
  status: OutlineStatus;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error types for outline generation
 */
export type OutlineGenerationErrorType =
  | 'INVALID_KEYWORD'
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_DETAIL_LEVEL'
  | 'MISSING_SERP_DATA'
  | 'MISSING_BRAND_VOICE'
  | 'API_KEY_MISSING'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for outline generation operations
 */
export class OutlineGenerationError extends Error {
  constructor(
    public readonly type: OutlineGenerationErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'OutlineGenerationError';
  }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration for outline generation
 */
export const DEFAULT_OUTLINE_CONFIG = {
  contentType: 'blog_post' as OutlineContentType,
  detailLevel: 'standard' as DetailLevel,
  targetWordCount: 1500,
  sectionCount: 5,
  serpIntegration: {
    enabled: true,
    weight: 0.5,
    includeContentGaps: true,
  } as SerpIntegrationOptions,
  brandVoice: {
    enabled: true,
  } as BrandVoiceOptions,
} as const;

/**
 * Section count ranges by detail level
 */
export const SECTION_COUNT_RANGES: Record<DetailLevel, [number, number]> = {
  basic: [3, 5],
  standard: [5, 8],
  comprehensive: [8, 12],
} as const;

/**
 * Word count ranges by content type
 */
export const WORD_COUNT_RANGES: Record<OutlineContentType, [number, number]> = {
  blog_post: [800, 2000],
  guide: [1500, 4000],
  tutorial: [1000, 3000],
  listicle: [800, 1500],
  review: [1000, 2500],
  comparison: [1200, 3000],
  case_study: [1500, 4000],
  news_article: [400, 1200],
  opinion: [600, 1500],
  faq: [500, 1500],
  how_to: [1000, 2500],
} as const;

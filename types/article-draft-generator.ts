/**
 * Article Draft Generator Types
 * Types for generating 1500-3000 word article drafts from outlines using GPT-4
 *
 * Features:
 * - Keyword density 1-2%
 * - Brand voice adherence
 * - Internal link placeholders
 * - SEO optimization
 */

import type { Json } from './database';
import type { BrandVoiceAnalysis } from './brand-voice-learning';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Article outline section structure
 */
export interface ArticleOutlineSection {
  id: string;
  title: string;
  points: string[];
  wordCount: number;
}

/**
 * Brand voice configuration for article generation
 */
export interface BrandVoiceConfig {
  tone?: string[];
  formality_level?: 'formal' | 'informal' | 'neutral';
  vocabulary?: {
    category?: string;
    complexity_level?: 'simple' | 'moderate' | 'complex' | 'academic';
    common_words?: string[];
  };
  style?: {
    sentence_structure?: 'simple' | 'compound' | 'complex' | 'varied';
    paragraph_length?: 'short' | 'medium' | 'long' | 'varied';
    use_of_bullets?: boolean;
  };
}

/**
 * SEO configuration for article generation
 */
export interface SEOConfig {
  primary_keyword: string;
  secondary_keywords?: string[];
  keyword_density_target?: number; // Default: 0.015 (1.5%)
  meta_description_length?: number; // Default: 160
  meta_title_length?: number; // Default: 60
}

/**
 * Internal link placeholder
 */
export interface InternalLinkPlaceholder {
  anchor_text: string;
  target_keyword: string;
  placement_hint: string; // e.g., "introduction", "conclusion", "section:Benefits"
}

/**
 * Article draft generation request
 */
export interface ArticleDraftGenerationRequest {
  keyword: string;
  outline: ArticleOutlineSection[];
  organization_id: string;
  product_id?: string;
  keyword_id?: string;
  target_word_count?: number; // Default: 2000, range: 1500-3000
  brand_voice_config?: BrandVoiceConfig;
  seo_config?: SEOConfig;
  internal_link_placeholders?: InternalLinkPlaceholder[];
  custom_instructions?: string;
  include_toc?: boolean; // Include table of contents
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Generated article draft metadata
 */
export interface ArticleDraftMetadata {
  word_count: number;
  keyword_density: number;
  reading_time_minutes: number;
  internal_links_count: number;
  sections_count: number;
  generation_time_ms: number;
  model_used: string;
}

/**
 * SEO data for the generated article
 */
export interface ArticleDraftSEO {
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  primary_keyword: string;
  keyword_density: number;
  keyword_count: number;
  suggested_slug: string;
}

/**
 * Generated article draft response
 */
export interface ArticleDraftGenerationResponse {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seo: ArticleDraftSEO;
  metadata: ArticleDraftMetadata;
  internal_link_placeholders: InternalLinkPlaceholder[];
  table_of_contents?: TOCEntry[];
  brand_voice_applied: BrandVoiceConfig;
}

/**
 * Table of contents entry
 */
export interface TOCEntry {
  level: number; // 1 for h1, 2 for h2, 3 for h3
  title: string;
  id: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Article draft generator error types
 */
export type ArticleDraftGeneratorErrorType =
  | 'API_KEY_MISSING'
  | 'INVALID_INPUT'
  | 'OUTLINE_REQUIRED'
  | 'KEYWORD_REQUIRED'
  | 'WORD_COUNT_OUT_OF_RANGE'
  | 'GENERATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTENT_POLICY_VIOLATION'
  | 'BRAND_VOICE_NOT_FOUND'
  | 'UNKNOWN_ERROR';

/**
 * Article draft generator error
 */
export class ArticleDraftGeneratorError extends Error {
  constructor(
    public readonly type: ArticleDraftGeneratorErrorType,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ArticleDraftGeneratorError';
  }
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Article draft database type (for saving drafts)
 */
export interface ArticleDraft {
  id?: string;
  organization_id: string;
  product_id?: string;
  keyword_id?: string;
  request_data: ArticleDraftGenerationRequest;
  response_data: ArticleDraftGenerationResponse;
  status: 'draft' | 'regenerating' | 'completed' | 'failed';
  error_message?: string;
  created_at?: Date;
  updated_at?: Date;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for article draft generation
 */
export interface ArticleDraftValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration values
 */
export const DEFAULT_DRAFT_CONFIG = {
  target_word_count: 2000,
  min_word_count: 1500,
  max_word_count: 3000,
  keyword_density_min: 0.01, // 1%
  keyword_density_max: 0.02, // 2%
  keyword_density_target: 0.015, // 1.5%
  meta_title_length: 60,
  meta_description_length: 160,
  reading_speed_wpm: 200, // Average reading speed
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 4000,
} as const;

/**
 * Default brand voice config (when none provided)
 */
export const DEFAULT_BRAND_VOICE: BrandVoiceConfig = {
  tone: ['professional', 'informative'],
  formality_level: 'neutral',
  vocabulary: {
    category: 'business',
    complexity_level: 'moderate',
  },
  style: {
    sentence_structure: 'varied',
    paragraph_length: 'medium',
    use_of_bullets: true,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate keyword density in text
 */
export function calculateKeywordDensity(text: string, keyword: string): number {
  const words = text.toLowerCase().split(/\s+/);
  const keywordLower = keyword.toLowerCase();
  const keywordCount = words.filter((word) =>
    word.includes(keywordLower)
  ).length;
  return keywordCount / words.length;
}

/**
 * Calculate word count
 */
export function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate reading time
 */
export function calculateReadingTime(wordCount: number): number {
  return Math.max(
    1,
    Math.ceil(wordCount / DEFAULT_DRAFT_CONFIG.reading_speed_wpm)
  );
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 500);
}

/**
 * Validate article draft request
 */
export function validateDraftRequest(
  request: Partial<ArticleDraftGenerationRequest>
): ArticleDraftValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Validate required fields
  if (!request.keyword || request.keyword.trim().length === 0) {
    errors.push({ field: 'keyword', message: 'Keyword is required' });
  }

  if (!request.outline || request.outline.length === 0) {
    errors.push({
      field: 'outline',
      message: 'At least one outline section is required',
    });
  }

  if (!request.organization_id || request.organization_id.trim().length === 0) {
    errors.push({
      field: 'organization_id',
      message: 'Organization ID is required',
    });
  }

  // Validate word count
  const targetWordCount =
    request.target_word_count ?? DEFAULT_DRAFT_CONFIG.target_word_count;
  if (targetWordCount < DEFAULT_DRAFT_CONFIG.min_word_count) {
    warnings.push({
      field: 'target_word_count',
      message: `Target word count is below minimum ${DEFAULT_DRAFT_CONFIG.min_word_count}`,
    });
  }
  if (targetWordCount > DEFAULT_DRAFT_CONFIG.max_word_count) {
    warnings.push({
      field: 'target_word_count',
      message: `Target word count exceeds maximum ${DEFAULT_DRAFT_CONFIG.max_word_count}`,
    });
  }

  // Validate outline sections
  if (request.outline) {
    for (let i = 0; i < request.outline.length; i++) {
      const section = request.outline[i];
      if (!section.title || section.title.trim().length === 0) {
        errors.push({
          field: `outline[${i}].title`,
          message: 'Section title is required',
        });
      }
      if (!section.points || section.points.length === 0) {
        warnings.push({
          field: `outline[${i}].points`,
          message: 'Section has no bullet points',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

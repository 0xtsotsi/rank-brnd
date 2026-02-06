/**
 * Article Draft Generator Module
 *
 * Exports all functions and types for generating article drafts from outlines.
 */

export * from './service';

export type {
  ArticleDraftGenerationRequest,
  ArticleDraftGenerationResponse,
  ArticleDraftMetadata,
  ArticleDraftSEO,
  BrandVoiceConfig,
  InternalLinkPlaceholder,
  TOCEntry,
  ArticleDraftGeneratorErrorType,
  ArticleDraftValidationResult,
  ArticleDraft,
} from '@/types/article-draft-generator';

export {
  ArticleDraftGeneratorError,
  calculateKeywordDensity,
  calculateWordCount,
  calculateReadingTime,
  generateSlug,
  validateDraftRequest,
  truncateText,
  DEFAULT_DRAFT_CONFIG,
  DEFAULT_BRAND_VOICE,
} from '@/types/article-draft-generator';

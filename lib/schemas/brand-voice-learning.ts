/**
 * Brand Voice Learning Schemas
 * Zod validation schemas for brand voice sample management and analysis
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Brand voice analysis status enum
 */
export const brandVoiceAnalysisStatusSchema = z.enum([
  'pending',
  'analyzing',
  'completed',
  'failed',
]);

export type BrandVoiceAnalysisStatus = z.infer<
  typeof brandVoiceAnalysisStatusSchema
>;

/**
 * Brand voice source type enum
 */
export const brandVoiceSourceTypeSchema = z.enum([
  'manual',
  'website',
  'document',
  'article',
  'product_page',
]);

export type BrandVoiceSourceType = z.infer<typeof brandVoiceSourceTypeSchema>;

/**
 * Sentiment enum
 */
const sentimentSchema = z.enum(['positive', 'neutral', 'negative']);

/**
 * Formality level enum
 */
const formalityLevelSchema = z.enum(['formal', 'informal', 'neutral']);

/**
 * Sentence structure enum
 */
const sentenceStructureSchema = z.enum([
  'simple',
  'compound',
  'complex',
  'varied',
]);

/**
 * Paragraph length enum
 */
const paragraphLengthSchema = z.enum(['short', 'medium', 'long', 'varied']);

/**
 * Vocabulary complexity level enum
 */
const vocabularyComplexitySchema = z.enum([
  'simple',
  'moderate',
  'complex',
  'academic',
]);

// ============================================================================
// Analysis Schemas
// ============================================================================

/**
 * Vocabulary analysis schema
 */
const vocabularyAnalysisSchema = z.object({
  category: z.string().optional(),
  complexity_level: vocabularyComplexitySchema.optional(),
  common_words: z.array(z.string()).optional(),
  unique_word_count: z.number().int().nonnegative().optional(),
  avg_word_length: z.number().nonnegative().optional(),
});

/**
 * Style analysis schema
 */
const styleAnalysisSchema = z.object({
  type: z.string().optional(),
  sentence_structure: sentenceStructureSchema.optional(),
  paragraph_length: paragraphLengthSchema.optional(),
  use_of_emoji: z.boolean().optional(),
  use_of_bullets: z.boolean().optional(),
});

/**
 * Complete brand voice analysis schema
 */
const brandVoiceAnalysisSchema = z.object({
  tone: z.array(z.string()),
  vocabulary: vocabularyAnalysisSchema,
  style: styleAnalysisSchema,
  sentiment: sentimentSchema.optional(),
  formality_level: formalityLevelSchema.optional(),
  keywords: z.array(z.string()).optional(),
});

/**
 * Brand voice metadata schema
 */
const brandVoiceMetadataSchema = z.object({
  source_url: z.string().url().optional().or(z.literal('')),
  author: z.string().optional(),
  publish_date: z.string().optional(),
  word_count: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Brand Voice Sample Schemas
// ============================================================================

/**
 * Create brand voice sample schema
 */
export const createBrandVoiceSampleSchema = z.object({
  sample_text: z
    .string()
    .min(10, 'Sample text must be at least 10 characters')
    .max(50000, 'Sample text cannot exceed 50000 characters'),
  source_type: brandVoiceSourceTypeSchema.optional(),
  product_id: z
    .string()
    .uuid('Invalid product ID')
    .optional()
    .or(z.literal('')),
  metadata: brandVoiceMetadataSchema.partial().optional(),
});

/**
 * Update brand voice sample schema
 */
export const updateBrandVoiceSampleSchema = z.object({
  sample_text: z
    .string()
    .min(10, 'Sample text must be at least 10 characters')
    .max(50000, 'Sample text cannot exceed 50000 characters')
    .optional(),
  source_type: brandVoiceSourceTypeSchema.optional(),
  analysis: brandVoiceAnalysisSchema.partial().optional(),
  analysis_status: brandVoiceAnalysisStatusSchema.optional(),
  analysis_error: z.string().nullable().optional(),
  confidence_score: z.number().min(0).max(1).nullable().optional(),
  metadata: brandVoiceMetadataSchema.partial().optional(),
});

/**
 * Update brand voice analysis result schema (for AI processing)
 */
export const updateBrandVoiceAnalysisSchema = z.object({
  analysis: brandVoiceAnalysisSchema,
  analysis_status: brandVoiceAnalysisStatusSchema,
  analysis_error: z.string().nullable().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Query and Filter Schemas
// ============================================================================

/**
 * Brand voice samples query schema
 */
export const brandVoiceSamplesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
  status: brandVoiceAnalysisStatusSchema.optional().or(z.literal('all')),
  source_type: brandVoiceSourceTypeSchema.optional().or(z.literal('all')),
  product_id: z.string().uuid().optional().or(z.literal('all')),
  search: z.string().max(200).default(''),
  sort_by: z
    .enum(['created_at', 'updated_at', 'confidence_score'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Delete brand voice sample schema
 */
export const deleteBrandVoiceSampleSchema = z.object({
  id: z.string().uuid('Invalid sample ID'),
});

// ============================================================================
// Batch Operations Schemas
// ============================================================================

/**
 * Batch create brand voice samples schema
 */
export const batchCreateBrandVoiceSamplesSchema = z.object({
  samples: z
    .array(createBrandVoiceSampleSchema)
    .min(1, 'At least one sample is required')
    .max(50, 'Cannot create more than 50 samples at once'),
});

/**
 * Batch delete brand voice samples schema
 */
export const batchDeleteBrandVoiceSamplesSchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid sample ID'))
    .min(1, 'At least one sample ID is required')
    .max(50, 'Cannot delete more than 50 samples at once'),
});

// ============================================================================
// Analysis Request Schemas
// ============================================================================

/**
 * Request brand voice analysis schema
 */
export const requestBrandVoiceAnalysisSchema = z.object({
  sample_id: z.string().uuid('Invalid sample ID'),
  force_refresh: z.boolean().default(false),
});

/**
 * Batch request brand voice analysis schema
 */
export const batchRequestBrandVoiceAnalysisSchema = z.object({
  sample_ids: z
    .array(z.string().uuid('Invalid sample ID'))
    .min(1, 'At least one sample ID is required')
    .max(20, 'Cannot analyze more than 20 samples at once'),
});

// ============================================================================
// Aggregated Analysis Schemas
// ============================================================================

/**
 * Get aggregated brand voice analysis schema
 */
export const getAggregatedBrandVoiceAnalysisSchema = z.object({
  product_id: z.string().uuid('Invalid product ID').optional(),
  organization_id: z.string().uuid('Invalid organization ID'),
  include_samples: z.boolean().default(false),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateBrandVoiceSampleInput = z.infer<
  typeof createBrandVoiceSampleSchema
>;
export type UpdateBrandVoiceSampleInput = z.infer<
  typeof updateBrandVoiceSampleSchema
>;
export type UpdateBrandVoiceAnalysisInput = z.infer<
  typeof updateBrandVoiceAnalysisSchema
>;
export type BrandVoiceSamplesQueryInput = z.infer<
  typeof brandVoiceSamplesQuerySchema
>;
export type BatchCreateBrandVoiceSamplesInput = z.infer<
  typeof batchCreateBrandVoiceSamplesSchema
>;
export type BatchDeleteBrandVoiceSamplesInput = z.infer<
  typeof batchDeleteBrandVoiceSamplesSchema
>;
export type RequestBrandVoiceAnalysisInput = z.infer<
  typeof requestBrandVoiceAnalysisSchema
>;
export type BatchRequestBrandVoiceAnalysisInput = z.infer<
  typeof batchRequestBrandVoiceAnalysisSchema
>;
export type GetAggregatedBrandVoiceAnalysisInput = z.infer<
  typeof getAggregatedBrandVoiceAnalysisSchema
>;

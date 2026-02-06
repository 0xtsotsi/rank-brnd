/**
 * Internal Linking Schemas
 *
 * Zod validation schemas for internal linking API routes.
 */

import { z } from 'zod';

/**
 * Internal link suggestion status enum
 */
export const internalLinkSuggestionStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'applied',
] as const);

/**
 * Internal link type enum
 */
export const internalLinkTypeEnum = z.enum([
  'contextual',
  'related',
  'see_also',
  'further_reading',
] as const);

/**
 * Base internal link suggestion schema
 */
export const baseInternalLinkSuggestionSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  source_article_id: z.string().uuid().nullable(),
  target_article_id: z.string().uuid(),
  keyword: z.string().nullable(),
  suggested_anchor_text: z.string().nullable(),
  context_snippet: z.string().nullable(),
  position_in_content: z.number().int().nullable(),
  relevance_score: z.number().int().min(0).max(100).nullable(),
  status: internalLinkSuggestionStatusEnum,
  link_type: z.string(),
  notes: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
  suggested_at: z.string().datetime(),
  approved_at: z.string().datetime().nullable(),
  applied_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

/**
 * Internal link suggestion with target article details
 */
export const internalLinkSuggestionWithTargetSchema =
  baseInternalLinkSuggestionSchema.extend({
    target_article: z
      .object({
        id: z.string().uuid(),
        title: z.string(),
        slug: z.string(),
        excerpt: z.string().nullable(),
        status: z.enum(['draft', 'published', 'archived']),
      })
      .optional(),
    source_article: z
      .object({
        id: z.string().uuid(),
        title: z.string(),
        slug: z.string(),
        excerpt: z.string().nullable(),
        status: z.enum(['draft', 'published', 'archived']),
      })
      .optional(),
  });

/**
 * Create internal link suggestion schema
 */
export const createInternalLinkSuggestionSchema = z.object({
  organization_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  source_article_id: z.string().uuid().optional(),
  target_article_id: z.string().uuid(),
  keyword: z.string().optional(),
  suggested_anchor_text: z.string().optional(),
  context_snippet: z.string().optional(),
  position_in_content: z.number().int().optional(),
  relevance_score: z.number().int().min(0).max(100).optional(),
  link_type: internalLinkTypeEnum.default('contextual'),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update internal link suggestion schema
 */
export const updateInternalLinkSuggestionSchema = z.object({
  status: internalLinkSuggestionStatusEnum.optional(),
  suggested_anchor_text: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update internal link suggestion status schema
 */
export const updateInternalLinkSuggestionStatusSchema = z.object({
  status: internalLinkSuggestionStatusEnum,
});

/**
 * Generate internal link suggestions schema
 */
export const generateInternalLinkSuggestionsSchema = z.object({
  article_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  min_relevance_score: z.number().int().min(0).max(100).default(50),
  max_suggestions: z.number().int().min(1).max(50).default(10),
  exclude_keywords: z.array(z.string()).default([]),
  preferred_article_ids: z.array(z.string().uuid()).optional(),
  link_type: internalLinkTypeEnum.default('contextual'),
});

/**
 * Apply internal links schema
 */
export const applyInternalLinksSchema = z.object({
  article_id: z.string().uuid(),
  suggestion_ids: z.array(z.string().uuid()),
  update_content: z.boolean().default(true),
});

/**
 * Internal link suggestions query params schema
 */
export const internalLinkSuggestionsQuerySchema = z.object({
  article_id: z.string().uuid().optional(),
  source_article_id: z.string().uuid().optional(),
  target_article_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  status: internalLinkSuggestionStatusEnum.optional(),
  link_type: internalLinkTypeEnum.optional(),
  min_relevance_score: z.number().int().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  include_deleted: z.boolean().default(false),
});

/**
 * Internal link statistics schema
 */
export const internalLinkStatsSchema = z.object({
  total_suggestions: z.number().int().nonnegative(),
  pending_suggestions: z.number().int().nonnegative(),
  approved_suggestions: z.number().int().nonnegative(),
  applied_suggestions: z.number().int().nonnegative(),
  rejected_suggestions: z.number().int().nonnegative(),
  avg_relevance_score: z.number().nonnegative(),
});

/**
 * Content analysis for internal linking schema
 */
export const contentAnalysisForInternalLinksSchema = z.object({
  keywords: z.array(z.string()),
  topics: z.array(z.string()),
  entities: z.array(z.string()),
  suggested_link_count: z.number().int().nonnegative(),
  word_count: z.number().int().nonnegative(),
});

/**
 * Suggested internal link schema
 */
export const suggestedInternalLinkSchema = z.object({
  target_article_id: z.string().uuid(),
  target_article_title: z.string(),
  target_article_slug: z.string(),
  target_article_excerpt: z.string().nullable(),
  suggested_anchor_text: z.string(),
  context_snippet: z.string(),
  position_in_content: z.number().int().nullable(),
  relevance_score: z.number().int().min(0).max(100),
  keywords: z.array(z.string()),
  link_type: internalLinkTypeEnum,
});

/**
 * Generate suggestions response schema
 */
export const generateSuggestionsResponseSchema = z.object({
  success: z.boolean(),
  suggestions: z.array(suggestedInternalLinkSchema),
  content_analysis: contentAnalysisForInternalLinksSchema.optional(),
  total_suggestions: z.number().int().nonnegative(),
  errors: z
    .array(
      z.object({
        article_id: z.string().uuid(),
        error: z.string(),
      })
    )
    .optional(),
});

/**
 * Apply links response schema
 */
export const applyLinksResponseSchema = z.object({
  success: z.boolean(),
  updated_content: z.string().optional(),
  links_applied: z.number().int().nonnegative(),
  suggestions_updated: z.array(z.string().uuid()),
  errors: z
    .array(
      z.object({
        suggestion_id: z.string().uuid(),
        error: z.string(),
      })
    )
    .optional(),
});

// Type exports
export type InternalLinkSuggestionStatus = z.infer<
  typeof internalLinkSuggestionStatusEnum
>;
export type InternalLinkType = z.infer<typeof internalLinkTypeEnum>;
export type BaseInternalLinkSuggestion = z.infer<
  typeof baseInternalLinkSuggestionSchema
>;
export type InternalLinkSuggestionWithTarget = z.infer<
  typeof internalLinkSuggestionWithTargetSchema
>;
export type CreateInternalLinkSuggestion = z.infer<
  typeof createInternalLinkSuggestionSchema
>;
export type UpdateInternalLinkSuggestion = z.infer<
  typeof updateInternalLinkSuggestionSchema
>;
export type GenerateInternalLinkSuggestions = z.infer<
  typeof generateInternalLinkSuggestionsSchema
>;
export type ApplyInternalLinks = z.infer<typeof applyInternalLinksSchema>;
export type InternalLinkSuggestionsQuery = z.infer<
  typeof internalLinkSuggestionsQuerySchema
>;
export type InternalLinkStats = z.infer<typeof internalLinkStatsSchema>;
export type ContentAnalysisForInternalLinks = z.infer<
  typeof contentAnalysisForInternalLinksSchema
>;
export type SuggestedInternalLink = z.infer<typeof suggestedInternalLinkSchema>;
export type GenerateSuggestionsResponse = z.infer<
  typeof generateSuggestionsResponseSchema
>;
export type ApplyLinksResponse = z.infer<typeof applyLinksResponseSchema>;

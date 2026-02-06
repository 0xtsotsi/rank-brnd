/**
 * Article Outline Generator Schemas
 *
 * Zod validation schemas for article outline generation API routes.
 */

import { z } from 'zod';

/**
 * Heading level enum
 */
const headingLevelSchema = z.enum(['H1', 'H2', 'H3']);

/**
 * Outline heading schema
 */
export const outlineHeadingSchema = z.object({
  level: headingLevelSchema,
  text: z.string().min(1, 'Heading text is required'),
  description: z.string().min(1, 'Description is required'),
  estimatedWordCount: z
    .number()
    .int()
    .nonnegative('Word count must be non-negative'),
  suggestedKeywords: z.array(z.string()).default([]),
  optional: z.boolean().default(false),
});

/**
 * Outline section schema (H2 with optional H3s)
 */
export const outlineSectionSchema = z.object({
  heading: outlineHeadingSchema,
  subsections: z.array(outlineHeadingSchema).optional(),
});

/**
 * Article outline structure schema
 */
export const articleOutlineSchema = z.object({
  h1: outlineHeadingSchema,
  sections: z
    .array(outlineSectionSchema)
    .min(1, 'At least one section is required'),
});

/**
 * Detail level enum
 */
const detailLevelSchema = z.enum(['basic', 'standard', 'comprehensive']);

/**
 * Content type enum
 */
const contentTypeSchema = z.enum([
  'blog_post',
  'guide',
  'tutorial',
  'listicle',
  'review',
  'comparison',
  'case_study',
  'news_article',
  'opinion',
  'faq',
  'how_to',
]);

/**
 * SERP integration options schema
 */
export const serpIntegrationOptionsSchema = z
  .object({
    enabled: z.boolean().default(true),
    weight: z.number().min(0).max(1).default(0.5),
    includeContentGaps: z.boolean().default(true),
  })
  .optional();

/**
 * Brand voice options schema
 */
export const brandVoiceOptionsSchema = z
  .object({
    enabled: z.boolean().default(true),
    sampleId: z.string().uuid('Invalid brand voice sample ID').optional(),
    toneOverride: z.array(z.string()).optional(),
  })
  .optional();

/**
 * Generate Article Outline Schema
 *
 * POST /api/article-outline-generator
 */
export const generateArticleOutlineSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID').optional(),
  keyword: z
    .string()
    .min(2, 'Keyword must be at least 2 characters')
    .max(200, 'Keyword too long'),
  content_type: contentTypeSchema.optional().default('blog_post'),
  target_audience: z
    .string()
    .max(500, 'Target audience description too long')
    .optional(),
  detail_level: detailLevelSchema.optional().default('standard'),
  target_word_count: z.coerce.number().int().min(100).max(10000).optional(),
  section_count: z.coerce.number().int().min(2).max(15).optional(),
  serp_integration: serpIntegrationOptionsSchema,
  brand_voice: brandVoiceOptionsSchema,
  user_id: z.string().optional(),
  additional_context: z
    .string()
    .max(2000, 'Additional context too long')
    .optional(),
});

/**
 * Get Outline Schema
 *
 * GET /api/article-outline-generator
 */
export const getOutlineSchema = z.object({
  id: z.string().uuid('Invalid outline ID'),
  organization_id: z.string().uuid('Invalid organization ID'),
});

/**
 * List Outlines Query Schema
 *
 * GET /api/article-outline-generator
 */
export const listOutlinesQuerySchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID').optional(),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID').optional(),
  keyword: z.string().optional(),
  content_type: contentTypeSchema.optional(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']).optional(),
  sort: z
    .enum(['created_at', 'updated_at', 'keyword'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Outline Schema
 *
 * PATCH /api/article-outline-generator
 */
export const updateOutlineSchema = z.object({
  id: z.string().uuid('Invalid outline ID'),
  outline: articleOutlineSchema.optional(),
  seo_recommendations: z.array(z.string()).optional(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']).optional(),
  error_message: z.string().optional(),
});

/**
 * Delete Outline Schema
 *
 * DELETE /api/article-outline-generator
 */
export const deleteOutlineSchema = z.object({
  id: z.string().uuid('Invalid outline ID'),
  organization_id: z.string().uuid('Invalid organization ID'),
});

/**
 * Generate from Existing Outline Schema
 *
 * POST /api/article-outline-generator/generate-article
 */
export const generateArticleFromOutlineSchema = z.object({
  outline_id: z.string().uuid('Invalid outline ID'),
  organization_id: z.string().uuid('Invalid organization ID'),
  article_title: z
    .string()
    .min(1, 'Article title is required')
    .max(500, 'Title too long'),
  article_slug: z
    .string()
    .min(1, 'Slug is required')
    .max(500, 'Slug too long')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    ),
  expand_to_full: z.boolean().optional().default(false),
});

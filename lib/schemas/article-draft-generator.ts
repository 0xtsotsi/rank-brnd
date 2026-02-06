/**
 * Article Draft Generator Schemas
 *
 * Zod validation schemas for article draft generation API routes.
 * Generates 1500-3000 word articles from outlines using GPT-4 with:
 * - Keyword density 1-2%
 * - Brand voice adherence
 * - Internal link placeholders
 */

import { z } from 'zod';

/**
 * Outline section schema
 */
const outlineSectionSchema = z.object({
  id: z.string().min(1, 'Section ID is required'),
  title: z
    .string()
    .min(1, 'Section title is required')
    .max(500, 'Section title too long'),
  points: z
    .array(z.string().min(1, 'Bullet point cannot be empty'))
    .default([]),
  wordCount: z
    .number()
    .int()
    .nonnegative('Word count must be non-negative')
    .default(200),
});

/**
 * Brand voice configuration schema
 */
const brandVoiceConfigSchema = z
  .object({
    tone: z.array(z.string()).optional(),
    formality_level: z.enum(['formal', 'informal', 'neutral']).optional(),
    vocabulary: z
      .object({
        category: z.string().optional(),
        complexity_level: z
          .enum(['simple', 'moderate', 'complex', 'academic'])
          .optional(),
        common_words: z.array(z.string()).optional(),
      })
      .optional(),
    style: z
      .object({
        sentence_structure: z
          .enum(['simple', 'compound', 'complex', 'varied'])
          .optional(),
        paragraph_length: z
          .enum(['short', 'medium', 'long', 'varied'])
          .optional(),
        use_of_bullets: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

/**
 * SEO configuration schema
 */
const seoConfigSchema = z
  .object({
    primary_keyword: z.string().min(1, 'Primary keyword is required'),
    secondary_keywords: z.array(z.string()).optional(),
    keyword_density_target: z.number().min(0.005).max(0.03).optional(), // 0.5% - 3%
    meta_description_length: z
      .number()
      .int()
      .positive()
      .optional()
      .default(160),
    meta_title_length: z.number().int().positive().optional().default(60),
  })
  .optional();

/**
 * Internal link placeholder schema
 */
const internalLinkPlaceholderSchema = z.object({
  anchor_text: z.string().min(1, 'Anchor text is required'),
  target_keyword: z.string().min(1, 'Target keyword is required'),
  placement_hint: z.string().min(1, 'Placement hint is required'),
});

/**
 * Generate Article Draft Schema
 *
 * POST /api/articles/draft-generator
 */
export const generateArticleDraftSchema = z.object({
  keyword: z
    .string()
    .min(2, 'Keyword must be at least 2 characters')
    .max(200, 'Keyword too long'),
  outline: z
    .array(outlineSectionSchema)
    .min(1, 'At least one outline section is required'),
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  keyword_id: z.string().optional(),
  target_word_count: z.coerce
    .number()
    .int()
    .min(1500, 'Target word count must be at least 1500')
    .max(3000, 'Target word count cannot exceed 3000')
    .optional()
    .default(2000),
  brand_voice_config: brandVoiceConfigSchema,
  seo_config: seoConfigSchema,
  internal_link_placeholders: z.array(internalLinkPlaceholderSchema).optional(),
  custom_instructions: z
    .string()
    .max(5000, 'Custom instructions too long')
    .optional(),
  include_toc: z.boolean().optional().default(true),
});

/**
 * Regenerate Article Draft Schema
 *
 * POST /api/articles/draft-generator/regenerate
 */
export const regenerateArticleDraftSchema = z.object({
  draft_id: z.string().min(1, 'Draft ID is required'),
  organization_id: z.string().min(1, 'Organization ID is required'),
  regenerate_options: z
    .object({
      section_id: z.string().optional(), // Regenerate specific section only
      new_brand_voice: brandVoiceConfigSchema,
      additional_instructions: z.string().max(2000).optional(),
    })
    .optional(),
});

/**
 * Get Article Draft Schema
 *
 * GET /api/articles/draft-generator
 */
export const getArticleDraftSchema = z.object({
  id: z.string().min(1, 'Draft ID is required'),
  organization_id: z.string().min(1, 'Organization ID is required'),
});

/**
 * List Article Drafts Query Schema
 *
 * GET /api/articles/draft-generator/list
 */
export const listArticleDraftsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  keyword_id: z.string().optional(),
  status: z.enum(['draft', 'regenerating', 'completed', 'failed']).optional(),
  min_word_count: z.coerce.number().int().nonnegative().optional(),
  max_word_count: z.coerce.number().int().nonnegative().optional(),
  sort: z
    .enum(['created_at', 'updated_at', 'word_count', 'keyword'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Article Draft Schema
 *
 * PATCH /api/articles/draft-generator
 */
export const updateArticleDraftSchema = z.object({
  id: z.string().min(1, 'Draft ID is required'),
  organization_id: z.string().min(1, 'Organization ID is required'),
  content_updates: z
    .object({
      title: z.string().min(1).max(500).optional(),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      add_internal_link: z
        .object({
          anchor_text: z.string().min(1),
          target_keyword: z.string().min(1),
          section_id: z.string().optional(),
        })
        .optional(),
      remove_internal_link: z
        .object({
          anchor_text: z.string().min(1),
        })
        .optional(),
    })
    .optional(),
  regen_metadata: z
    .object({
      word_count: z.coerce.number().int().nonnegative().optional(),
      keyword_density: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

/**
 * Delete Article Draft Schema
 *
 * DELETE /api/articles/draft-generator
 */
export const deleteArticleDraftSchema = z.object({
  id: z.string().min(1, 'Draft ID is required'),
  organization_id: z.string().min(1, 'Organization ID is required'),
});

/**
 * Analyze Keyword Density Schema
 *
 * POST /api/articles/draft-generator/analyze-keyword-density
 */
export const analyzeKeywordDensitySchema = z.object({
  content: z.string().min(50, 'Content must be at least 50 characters'),
  keyword: z.string().min(2, 'Keyword must be at least 2 characters'),
});

/**
 * Keyword Density Analysis Response
 */
export const keywordDensityAnalysisResponseSchema = z.object({
  keyword: z.string(),
  density: z.number(),
  count: z.number(),
  total_words: z.number(),
  in_range: z.boolean(),
  recommendations: z.array(z.string()),
});

/**
 * Article Draft Generation Response Schema
 */
export const articleDraftResponseSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string(),
  seo: z.object({
    meta_title: z.string(),
    meta_description: z.string(),
    meta_keywords: z.array(z.string()),
    primary_keyword: z.string(),
    keyword_density: z.number(),
    keyword_count: z.number(),
    suggested_slug: z.string(),
  }),
  metadata: z.object({
    word_count: z.number(),
    keyword_density: z.number(),
    reading_time_minutes: z.number(),
    internal_links_count: z.number(),
    sections_count: z.number(),
    generation_time_ms: z.number(),
    model_used: z.string(),
  }),
  internal_link_placeholders: z.array(internalLinkPlaceholderSchema),
  table_of_contents: z
    .array(
      z.object({
        level: z.number(),
        title: z.string(),
        id: z.string(),
      })
    )
    .optional(),
  brand_voice_applied: brandVoiceConfigSchema,
});

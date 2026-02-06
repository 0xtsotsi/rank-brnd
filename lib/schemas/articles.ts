/**
 * Articles API Schemas
 *
 * Zod validation schemas for article-related API routes.
 */

import { z } from 'zod';

/**
 * Article status types
 */
const articleStatusSchema = z.enum(['draft', 'published', 'archived']);

/**
 * Create Article Schema
 *
 * POST /api/articles
 */
export const createArticleSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID').optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(500, 'Slug is too long')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    ),
  content: z.string().optional().default(''),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  featured_image_url: z
    .string()
    .url('Invalid featured image URL')
    .optional()
    .or(z.literal('')),
  status: articleStatusSchema.optional().default('draft'),
  seo_score: z.coerce.number().int().min(0).max(100).optional(),
  word_count: z.coerce.number().int().nonnegative().optional(),
  reading_time_minutes: z.coerce.number().int().positive().optional(),
  meta_title: z.string().max(200, 'Meta title is too long').optional(),
  meta_description: z
    .string()
    .max(500, 'Meta description is too long')
    .optional(),
  meta_keywords: z.array(z.string()).optional().default([]),
  canonical_url: z
    .string()
    .url('Invalid canonical URL')
    .optional()
    .or(z.literal('')),
  schema_type: z.string().optional(),
  schema_data: z.record(z.string(), z.unknown()).optional(),
  scheduled_at: z.string().datetime('Invalid scheduled date').optional(),
  author_id: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  category: z.string().max(200, 'Category is too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Bulk Import Articles Schema
 *
 * POST /api/articles (bulk mode)
 */
export const bulkImportArticlesSchema = z.object({
  bulk: z.literal(true),
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  articles: z
    .array(
      z.object({
        title: z.string().min(1, 'Title is required'),
        slug: z
          .string()
          .min(1, 'Slug is required')
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            'Slug must contain only lowercase letters, numbers, and hyphens'
          ),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        featured_image_url: z.string().optional(),
        tags: z.string().optional(), // Comma-separated string for bulk import
        category: z.string().optional(),
        meta_title: z.string().optional(),
        meta_description: z.string().optional(),
      })
    )
    .min(1, 'At least one article is required')
    .max(50, 'Cannot import more than 50 articles at once'),
});

/**
 * Single article with bulk field
 */
const singleArticleWithBulk = z.object({
  bulk: z.literal(false),
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID').optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(500, 'Slug is too long')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    ),
  content: z.string().optional().default(''),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  featured_image_url: z
    .string()
    .url('Invalid featured image URL')
    .optional()
    .or(z.literal('')),
  status: articleStatusSchema.optional().default('draft'),
  seo_score: z.coerce.number().int().min(0).max(100).optional(),
  word_count: z.coerce.number().int().nonnegative().optional(),
  reading_time_minutes: z.coerce.number().int().positive().optional(),
  meta_title: z.string().max(200, 'Meta title is too long').optional(),
  meta_description: z
    .string()
    .max(500, 'Meta description is too long')
    .optional(),
  meta_keywords: z.array(z.string()).optional().default([]),
  canonical_url: z
    .string()
    .url('Invalid canonical URL')
    .optional()
    .or(z.literal('')),
  schema_type: z.string().optional(),
  schema_data: z.record(z.string(), z.unknown()).optional(),
  scheduled_at: z.string().datetime('Invalid scheduled date').optional(),
  author_id: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  category: z.string().max(200, 'Category is too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Combined POST schema for articles (single or bulk)
 */
export const articlesPostSchema = z.discriminatedUnion('bulk', [
  bulkImportArticlesSchema,
  singleArticleWithBulk,
]);

/**
 * Articles Query Schema
 *
 * GET /api/articles
 */
export const articlesQuerySchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID').optional(),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID').optional(),
  search: z.string().optional(),
  status: articleStatusSchema.optional(),
  category: z.string().optional(),
  min_seo_score: z.coerce.number().int().min(0).max(100).optional(),
  max_seo_score: z.coerce.number().int().min(0).max(100).optional(),
  tags: z.string().optional(), // Comma-separated tag filter
  author_id: z.string().optional(),
  sort: z
    .enum([
      'title',
      'slug',
      'status',
      'seo_score',
      'word_count',
      'published_at',
      'scheduled_at',
      'created_at',
    ])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Article Schema
 *
 * PATCH /api/articles
 */
export const updateArticleSchema = z.object({
  id: z.string().uuid('Invalid article ID'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title is too long')
    .optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(500, 'Slug is too long')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
    .optional(),
  content: z.string().optional(),
  excerpt: z.string().max(1000, 'Excerpt is too long').optional(),
  featured_image_url: z
    .string()
    .url('Invalid featured image URL')
    .optional()
    .or(z.literal('')),
  status: articleStatusSchema.optional(),
  seo_score: z.coerce.number().int().min(0).max(100).optional(),
  word_count: z.coerce.number().int().nonnegative().optional(),
  reading_time_minutes: z.coerce.number().int().positive().optional(),
  meta_title: z.string().max(200, 'Meta title is too long').optional(),
  meta_description: z
    .string()
    .max(500, 'Meta description is too long')
    .optional(),
  meta_keywords: z.array(z.string()).optional(),
  canonical_url: z
    .string()
    .url('Invalid canonical URL')
    .optional()
    .or(z.literal('')),
  schema_type: z.string().optional(),
  schema_data: z.record(z.string(), z.unknown()).optional(),
  scheduled_at: z.string().datetime('Invalid scheduled date').optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().max(200, 'Category is too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Publish Article Schema
 *
 * POST /api/articles/publish
 */
export const publishArticleSchema = z.object({
  id: z.string().uuid('Invalid article ID'),
});

/**
 * Unpublish Article Schema
 *
 * POST /api/articles/unpublish
 */
export const unpublishArticleSchema = z.object({
  id: z.string().uuid('Invalid article ID'),
});

/**
 * Delete Article Schema
 *
 * DELETE /api/articles
 */
export const deleteArticleSchema = z.object({
  id: z.string().uuid('Invalid article ID'),
});

/**
 * Generate Slug Schema
 *
 * POST /api/articles/generate-slug
 */
export const generateSlugSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
  organization_id: z.string().uuid('Invalid organization ID'),
});

/**
 * Publishing platform options
 */
const publishingPlatformSchema = z.enum([
  'wordpress',
  'webflow',
  'shopify',
  'ghost',
  'notion',
  'squarespace',
  'wix',
  'contentful',
  'strapi',
  'custom',
]);

/**
 * Publish Article to CMS Schema
 *
 * POST /api/articles/[id]/publish
 */
export const publishArticleToCMSSchema = z.object({
  integration_id: z.string().uuid('Invalid integration ID').optional(),
  platform: publishingPlatformSchema.optional(),
  scheduled_for: z.string().datetime('Invalid scheduled date').optional(),
  priority: z.coerce.number().int().min(0).max(100).optional().default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Bulk Publish Articles Schema
 *
 * POST /api/articles/publish/bulk
 */
export const bulkPublishArticlesSchema = z.object({
  article_ids: z
    .array(z.string().uuid('Invalid article ID'))
    .min(1, 'At least one article ID is required')
    .max(50, 'Cannot publish more than 50 articles at once'),
  integration_id: z.string().uuid('Invalid integration ID').optional(),
  platform: publishingPlatformSchema.optional(),
  scheduled_for: z.string().datetime('Invalid scheduled date').optional(),
  priority: z.coerce.number().int().min(0).max(100).optional().default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Article Versions API Schemas
 *
 * Zod validation schemas for article version-related API routes.
 */

import { z } from 'zod';

// Article status enum (inline definition since it's not exported from articles.ts)
const articleStatusSchema = z.enum(['draft', 'published', 'archived']);

/**
 * Article Version schema (base)
 */
export const articleVersionSchema = z.object({
  id: z.string().uuid(),
  article_id: z.string().uuid(),
  version_number: z.coerce.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string().nullable(),
  featured_image_url: z.string().nullable(),
  status: articleStatusSchema,
  seo_score: z.number().int().min(0).max(100).nullable(),
  word_count: z.coerce.number().int().nonnegative(),
  reading_time_minutes: z.coerce.number().int().nonnegative(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  meta_keywords: z.array(z.string()).nullable(),
  canonical_url: z.string().nullable(),
  schema_type: z.string().nullable(),
  schema_data: z.record(z.string(), z.unknown()).nullable(),
  tags: z.array(z.string()),
  category: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  changed_at: z.string().datetime(),
  changed_by: z.string().nullable(),
  change_notes: z.string().nullable(),
  is_auto_save: z.boolean(),
});

/**
 * Create Article Version Schema
 *
 * POST /api/articles/[id]/versions
 */
export const createArticleVersionSchema = z.object({
  change_notes: z.string().max(500, 'Change notes are too long').optional(),
  is_auto_save: z.boolean().optional().default(false),
});

/**
 * Get Article Versions Query Schema
 *
 * GET /api/articles/[id]/versions
 */
export const getArticleVersionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  include_auto_saves: z.coerce.boolean().optional().default(true),
});

/**
 * Revert to Version Schema
 *
 * POST /api/articles/[id]/versions/[version]/revert
 */
export const revertToVersionSchema = z.object({
  version_number: z.coerce
    .number()
    .int()
    .positive('Version number must be positive'),
  change_notes: z.string().max(500, 'Change notes are too long').optional(),
});

/**
 * Compare Versions Query Schema
 *
 * GET /api/articles/[id]/versions/compare
 */
export const compareVersionsQuerySchema = z.object({
  version1: z.coerce
    .number()
    .int()
    .positive('Version 1 must be a positive number'),
  version2: z.coerce
    .number()
    .int()
    .positive('Version 2 must be a positive number'),
});

/**
 * Version Comparison Result Schema
 */
export const versionComparisonSchema = z.object({
  field: z.string(),
  value1: z.string(),
  value2: z.string(),
  is_different: z.boolean(),
});

/**
 * Version List Item Schema (lighter version for list views)
 */
export const versionListItemSchema = z.object({
  id: z.string().uuid(),
  version_number: z.coerce.number().int().positive(),
  title: z.string(),
  status: articleStatusSchema,
  word_count: z.coerce.number().int().nonnegative(),
  changed_at: z.string().datetime(),
  changed_by: z.string().nullable(),
  change_notes: z.string().nullable(),
  is_auto_save: z.boolean(),
});

/**
 * Cleanup Old Versions Schema
 *
 * DELETE /api/articles/[id]/versions/cleanup
 */
export const cleanupVersionsSchema = z.object({
  keep_auto_saves: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .default(5),
});

/**
 * Export types
 */
export type ArticleVersion = z.infer<typeof articleVersionSchema>;
export type CreateArticleVersionInput = z.infer<
  typeof createArticleVersionSchema
>;
export type VersionListItem = z.infer<typeof versionListItemSchema>;
export type VersionComparison = z.infer<typeof versionComparisonSchema>;

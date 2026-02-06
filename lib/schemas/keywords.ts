/**
 * Keywords API Schemas
 *
 * Zod validation schemas for keyword-related API routes.
 */

import { z } from 'zod';

/**
 * Keyword difficulty levels
 */
export const keywordDifficultySchema = z.enum([
  'very-easy',
  'easy',
  'medium',
  'hard',
  'very-hard',
]);

/**
 * Keyword intent types
 */
export const keywordIntentSchema = z.enum([
  'informational',
  'navigational',
  'commercial',
  'transactional',
]);

/**
 * Keyword status types
 */
export const keywordStatusSchema = z.enum([
  'tracking',
  'paused',
  'opportunity',
  'ignored',
]);

/**
 * Create Keyword Schema (single)
 *
 * POST /api/keywords
 */
export const createKeywordSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  keyword: z.string().min(1, 'Keyword is required'),
  searchVolume: z.coerce.number().int().nonnegative().optional(),
  cpc: z.coerce.number().nonnegative().optional(),
  competition: z.coerce.number().min(0).max(1).optional(),
  difficulty: keywordDifficultySchema.optional().default('medium'),
  intent: keywordIntentSchema.optional().default('informational'),
  opportunityScore: z.coerce.number().min(0).max(100).optional(),
  status: keywordStatusSchema.optional().default('tracking'),
  currentRank: z.coerce.number().int().positive().optional(),
  targetUrl: z.string().url('Invalid target URL').optional().or(z.literal('')),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Bulk Import Keywords Schema
 *
 * POST /api/keywords (bulk mode)
 */
export const bulkImportKeywordsSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  bulk: z.literal(true),
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(1, 'Keyword is required'),
        searchVolume: z.coerce.number().int().nonnegative().optional(),
        cpc: z.coerce.number().nonnegative().optional(),
        difficulty: keywordDifficultySchema.optional(),
        intent: keywordIntentSchema.optional(),
        tags: z.string().optional(), // Comma-separated string for bulk import
        targetUrl: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one keyword is required'),
});

/**
 * Combined POST schema for keywords (single or bulk)
 */
export const keywordsPostSchema = bulkImportKeywordsSchema.or(
  createKeywordSchema
    .extend({
      bulk: z.literal(false).optional(),
    })
    .transform((val) => ({ ...val, bulk: false as const }))
);

/**
 * Update Keyword Schema
 *
 * PUT /api/keywords/[id]
 * PATCH /api/keywords/[id]
 */
export const updateKeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').optional(),
  searchVolume: z.coerce.number().int().nonnegative().optional(),
  cpc: z.coerce.number().nonnegative().optional(),
  competition: z.coerce.number().min(0).max(1).optional(),
  difficulty: keywordDifficultySchema.optional(),
  intent: keywordIntentSchema.optional(),
  opportunityScore: z.coerce.number().min(0).max(100).optional(),
  status: keywordStatusSchema.optional(),
  currentRank: z.coerce.number().int().positive().optional(),
  targetUrl: z.string().url('Invalid target URL').nullable().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Keywords Query Schema
 *
 * GET /api/keywords
 */
export const keywordsQuerySchema = z.object({
  organization_id: z.string().optional(),
  product_id: z.string().optional(),
  search: z.string().optional(),
  intent: keywordIntentSchema.optional(),
  difficulty: keywordDifficultySchema.optional(),
  status: keywordStatusSchema.optional(),
  min_opportunity_score: z.coerce.number().min(0).max(100).optional(),
  max_opportunity_score: z.coerce.number().min(0).max(100).optional(),
  min_search_volume: z.coerce.number().int().nonnegative().optional(),
  max_search_volume: z.coerce.number().int().nonnegative().optional(),
  tags: z.string().optional(),
  sort: z
    .enum([
      'keyword',
      'search_volume',
      'difficulty',
      'intent',
      'status',
      'opportunity_score',
      'current_rank',
      'created_at',
    ])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Delete Keyword Schema
 *
 * DELETE /api/keywords
 */
export const deleteKeywordSchema = z.object({
  id: z.string().min(1, 'Keyword ID is required'),
});

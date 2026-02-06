// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Competitor Comparisons API Schemas
 * Zod validation schemas for competitor comparison-related API routes.
 */

import { z } from 'zod';

export const opportunityTypeSchema = z.enum([
  'quick-win',
  'medium-effort',
  'long-term',
]);

export const rankTrendSchema = z.enum(['up', 'down', 'stable']);

export const competitorRankEntrySchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  rank: z.number().int().positive().nullable(),
  url: z.string().url().nullable().optional(),
});

export const rankingGapEntrySchema = z.object({
  domain: z.string(),
  rank: z.number().int().positive(),
  gap_size: z.number().int(),
  opportunity_type: opportunityTypeSchema,
});

export const createCompetitorComparisonSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  keyword_id: z.string().min(1, 'Keyword ID is required'),
  user_current_rank: z.coerce.number().int().positive().optional(),
  user_url: z.string().url('Invalid user URL').optional().or(z.literal('')),
  competitor_domains: z.array(z.string()).optional().default([]),
  competitor_ranks: z
    .record(
      z.object({
        rank: z.number().int().positive(),
        url: z.string().url().optional(),
      })
    )
    .optional(),
  competitor_urls: z.record(z.string().url()).optional(),
  opportunity_type: opportunityTypeSchema.optional().default('medium-effort'),
  opportunity_score: z.coerce.number().min(0).max(100).optional(),
  device: z.string().optional().default('desktop'),
  location: z.string().optional().default('us'),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const updateCompetitorComparisonSchema = z.object({
  user_current_rank: z.coerce.number().int().positive().optional(),
  user_url: z.string().url('Invalid user URL').nullable().optional(),
  competitor_domains: z.array(z.string()).optional(),
  competitor_ranks: z
    .record(
      z.object({
        rank: z.number().int().positive(),
        url: z.string().url().optional(),
      })
    )
    .optional(),
  competitor_urls: z.record(z.string().url()).optional(),
  opportunity_type: opportunityTypeSchema.optional(),
  opportunity_score: z.coerce.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const competitorComparisonsQuerySchema = z.object({
  organization_id: z.string().optional(),
  product_id: z.string().optional(),
  keyword_id: z.string().optional(),
  opportunity_type: opportunityTypeSchema.optional(),
  quick_wins_only: z.coerce.boolean().optional().default(false),
  min_gap_to_first_page: z.coerce.number().int().nonnegative().optional(),
  max_gap_to_first_page: z.coerce.number().int().nonnegative().optional(),
  min_opportunity_score: z.coerce.number().min(0).max(100).optional(),
  max_opportunity_score: z.coerce.number().min(0).max(100).optional(),
  rank_trend: rankTrendSchema.optional(),
  device: z.string().optional(),
  location: z.string().optional(),
  sort: z
    .enum([
      'opportunity_score',
      'gap_to_first_page',
      'user_current_rank',
      'last_analyzed_at',
      'created_at',
    ])
    .optional()
    .default('opportunity_score'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export const bulkCompetitorComparisonsSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  comparisons: z
    .array(
      z.object({
        keyword_id: z.string().min(1, 'Keyword ID is required'),
        user_current_rank: z.coerce.number().int().positive().optional(),
        user_url: z.string().url().optional(),
        competitor_domains: z.array(z.string()).optional(),
        competitor_ranks: z
          .record(
            z.object({
              rank: z.number().int().positive(),
              url: z.string().url().optional(),
            })
          )
          .optional(),
        competitor_urls: z.record(z.string().url()).optional(),
        device: z.string().optional().default('desktop'),
        location: z.string().optional().default('us'),
      })
    )
    .min(1, 'At least one comparison is required')
    .max(50, 'Cannot process more than 50 comparisons at once'),
});

export const analyzeCompetitorsSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  keyword_ids: z
    .array(z.string())
    .min(1, 'At least one keyword ID is required')
    .max(100, 'Cannot analyze more than 100 keywords at once'),
  device: z.string().optional().default('desktop'),
  location: z.string().optional().default('us'),
});

export const quickWinsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  max_gap_to_first_page: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(5),
  min_opportunity_score: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(50),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const deleteCompetitorComparisonSchema = z.object({
  id: z.string().min(1, 'Comparison ID is required'),
});

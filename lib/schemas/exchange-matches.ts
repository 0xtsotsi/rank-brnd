// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Exchange Matches API Schemas
 *
 * Zod validation schemas for exchange matches-related API routes.
 */

import { z } from 'zod';

/**
 * Exchange match status types
 */
export const exchangeMatchStatusSchema = z.enum([
  'pending',
  'approved',
  'published',
  'rejected',
  'cancelled',
]);

/**
 * Create Exchange Match Schema
 *
 * POST /api/exchange-matches
 */
export const createExchangeMatchSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  exchange_site_id: z.string().min(1, 'Exchange site ID is required'),
  target_url: z.string().url('Invalid URL format').optional(),
  anchor_text: z.string().max(200).optional(),
  content_title: z.string().max(500).optional(),
  content_id: z.string().optional(),
  credits_used: z.coerce.number().int().min(0).optional().default(0),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Bulk Create Exchange Matches Schema
 *
 * POST /api/exchange-matches (bulk mode)
 */
export const bulkCreateExchangeMatchesSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  bulk: z.literal(true),
  matches: z
    .array(
      z.object({
        exchange_site_id: z.string().min(1, 'Exchange site ID is required'),
        target_url: z.string().url('Invalid URL format').optional(),
        anchor_text: z.string().max(200).optional(),
        content_title: z.string().max(500).optional(),
        credits_used: z.coerce.number().int().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one match is required')
    .max(50, 'Maximum 50 matches can be created at once'),
});

/**
 * Combined POST schema for exchange matches (single or bulk)
 */
export const exchangeMatchPostSchema = z.discriminatedUnion('bulk', [
  bulkCreateExchangeMatchesSchema,
  createExchangeMatchSchema
    .extend({
      bulk: z.literal(false).optional(),
    })
    .transform((val) => ({ ...val, bulk: false as const })),
]);

/**
 * Update Exchange Match Schema
 *
 * PUT /api/exchange-matches/[id]
 * PATCH /api/exchange-matches/[id]
 */
export const updateExchangeMatchSchema = z.object({
  product_id: z.string().optional(),
  exchange_site_id: z.string().optional(),
  target_url: z.string().url('Invalid URL format').optional(),
  anchor_text: z.string().max(200).optional(),
  content_title: z.string().max(500).optional(),
  content_id: z.string().optional(),
  credits_used: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Exchange Matches Query Schema
 *
 * GET /api/exchange-matches
 */
export const exchangeMatchesQuerySchema = z.object({
  organization_id: z.string().optional(),
  product_id: z.string().optional(),
  exchange_site_id: z.string().optional(),
  status: exchangeMatchStatusSchema.optional(),
  search: z.string().optional(),
  min_credits_used: z.coerce.number().int().min(0).optional(),
  max_credits_used: z.coerce.number().int().min(0).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort: z
    .enum([
      'requested_at',
      'approved_at',
      'published_at',
      'credits_used',
      'status',
      'created_at',
    ])
    .optional()
    .default('requested_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Exchange Match Status Schema
 *
 * PATCH /api/exchange-matches/[id]/status
 */
export const updateExchangeMatchStatusSchema = z.object({
  status: exchangeMatchStatusSchema.refine(
    (val) => val !== 'pending',
    'Cannot set status back to pending'
  ),
});

/**
 * Delete Exchange Match Schema
 *
 * DELETE /api/exchange-matches/[id]
 */
export const deleteExchangeMatchSchema = z.object({
  id: z.string().min(1, 'Exchange match ID is required'),
});

/**
 * Exchange Match Statistics Query Schema
 *
 * GET /api/exchange-matches/stats
 */
export const exchangeMatchStatsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

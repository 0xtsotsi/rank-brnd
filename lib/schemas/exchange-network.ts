// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Exchange Network API Schemas
 *
 * Zod validation schemas for exchange network-related API routes.
 */

import { z } from 'zod';

/**
 * Exchange network status types
 */
export const exchangeNetworkStatusSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'suspended',
]);

/**
 * Create Exchange Network Site Schema (single)
 *
 * POST /api/exchange-network
 */
export const createExchangeNetworkSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  site_id: z.string().optional(),
  domain: z
    .string()
    .min(1, 'Domain is required')
    .refine(
      (val) => {
        // Basic domain validation
        const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
        return domainRegex.test(val);
      },
      { message: 'Invalid domain format' }
    ),
  authority: z.coerce.number().int().min(0).max(100).optional(),
  niche: z.string().optional(),
  credits_available: z.coerce.number().int().min(0).optional().default(0),
  quality_score: z.coerce.number().min(0).max(1).optional(),
  spam_score: z.coerce.number().min(0).max(1).optional(),
  status: exchangeNetworkStatusSchema.optional().default('active'),
  contact_email: z.string().email('Invalid email address').optional(),
  contact_name: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Bulk Import Exchange Network Sites Schema
 *
 * POST /api/exchange-network (bulk mode)
 */
export const bulkImportExchangeNetworkSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  bulk: z.literal(true),
  sites: z
    .array(
      z.object({
        site_id: z.string().optional(),
        domain: z.string().min(1, 'Domain is required'),
        authority: z.coerce.number().int().min(0).max(100).optional(),
        niche: z.string().optional(),
        credits_available: z.coerce.number().int().min(0).optional(),
        quality_score: z.coerce.number().min(0).max(1).optional(),
        spam_score: z.coerce.number().min(0).max(1).optional(),
        contact_email: z.string().email().optional(),
        contact_name: z.string().optional(),
        tags: z.string().optional(), // Comma-separated string for bulk import
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one site is required')
    .max(50, 'Maximum 50 sites can be imported at once'),
});

/**
 * Combined POST schema for exchange network (single or bulk)
 */
export const exchangeNetworkPostSchema = z.discriminatedUnion('bulk', [
  bulkImportExchangeNetworkSchema,
  createExchangeNetworkSchema
    .extend({
      bulk: z.literal(false).optional(),
    })
    .transform((val) => ({ ...val, bulk: false as const })),
]);

/**
 * Update Exchange Network Site Schema
 *
 * PUT /api/exchange-network/[id]
 * PATCH /api/exchange-network/[id]
 */
export const updateExchangeNetworkSchema = z.object({
  site_id: z.string().optional(),
  domain: z
    .string()
    .min(1, 'Domain is required')
    .refine(
      (val) => {
        const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
        return domainRegex.test(val);
      },
      { message: 'Invalid domain format' }
    )
    .optional(),
  authority: z.coerce.number().int().min(0).max(100).optional(),
  niche: z.string().optional(),
  credits_available: z.coerce.number().int().min(0).optional(),
  quality_score: z.coerce.number().min(0).max(1).optional(),
  spam_score: z.coerce.number().min(0).max(1).optional(),
  status: exchangeNetworkStatusSchema.optional(),
  contact_email: z.string().email('Invalid email address').optional(),
  contact_name: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  last_verified_at: z.string().datetime().optional(),
});

/**
 * Exchange Network Query Schema
 *
 * GET /api/exchange-network
 */
export const exchangeNetworkQuerySchema = z.object({
  organization_id: z.string().optional(),
  product_id: z.string().optional(),
  search: z.string().optional(),
  status: exchangeNetworkStatusSchema.optional(),
  niche: z.string().optional(),
  min_authority: z.coerce.number().int().min(0).max(100).optional(),
  max_authority: z.coerce.number().int().min(0).max(100).optional(),
  min_credits: z.coerce.number().int().min(0).optional(),
  max_credits: z.coerce.number().int().min(0).optional(),
  min_quality_score: z.coerce.number().min(0).max(1).optional(),
  max_spam_score: z.coerce.number().min(0).max(1).optional(),
  tags: z.string().optional(),
  sort: z
    .enum([
      'domain',
      'authority',
      'niche',
      'credits_available',
      'quality_score',
      'spam_score',
      'status',
      'created_at',
    ])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Exchange Network Status Schema
 *
 * PATCH /api/exchange-network/[id]/status
 */
export const updateExchangeNetworkStatusSchema = z.object({
  status: exchangeNetworkStatusSchema,
});

/**
 * Update Exchange Network Credits Schema
 *
 * PATCH /api/exchange-network/[id]/credits
 */
export const updateExchangeNetworkCreditsSchema = z.object({
  change: z.coerce
    .number()
    .int()
    .refine((val) => val !== 0, {
      message: 'Credit change cannot be zero',
    }),
  operation: z.enum(['add', 'subtract', 'set']).default('add'),
});

/**
 * Delete Exchange Network Site Schema
 *
 * DELETE /api/exchange-network
 */
export const deleteExchangeNetworkSchema = z.object({
  id: z.string().min(1, 'Exchange network site ID is required'),
});

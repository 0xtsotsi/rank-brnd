// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * External Link Opportunities API Schemas
 *
 * Zod validation schemas for external link opportunity-related API routes.
 */

import { z } from 'zod';

/**
 * External link source categories (redefined here to avoid circular import)
 */
const categorySchema = z.enum([
  'academic',
  'government',
  'industry',
  'news',
  'reference',
  'statistics',
  'health',
  'technology',
  'business',
  'other',
]);

/**
 * External link opportunity status types
 */
export const externalLinkOpportunityStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'applied',
]);

/**
 * External link opportunity link type
 */
export const externalLinkTypeSchema = z.enum([
  'external',
  'citation',
  'reference',
]);

/**
 * Create External Link Opportunity Schema
 *
 * POST /api/external-link-opportunities
 */
export const createExternalLinkOpportunitySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  external_source_id: z.string().optional(),
  keyword: z.string().optional(),
  suggested_url: z.string().url('Invalid URL format').optional(),
  suggested_anchor_text: z.string().max(200).optional(),
  context_snippet: z.string().max(500).optional(),
  position_in_content: z.coerce.number().int().min(0).optional(),
  relevance_score: z.coerce.number().int().min(0).max(100).optional(),
  status: externalLinkOpportunityStatusSchema.optional().default('pending'),
  link_type: externalLinkTypeSchema.optional().default('external'),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Bulk Create External Link Opportunities Schema
 *
 * POST /api/external-link-opportunities (bulk mode)
 */
export const bulkCreateExternalLinkOpportunitiesSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  bulk: z.literal(true),
  opportunities: z
    .array(
      z.object({
        external_source_id: z.string().optional(),
        keyword: z.string().optional(),
        suggested_url: z.string().url('Invalid URL format').optional(),
        suggested_anchor_text: z.string().max(200).optional(),
        context_snippet: z.string().max(500).optional(),
        relevance_score: z.coerce.number().int().min(0).max(100).optional(),
        link_type: externalLinkTypeSchema.optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one opportunity is required')
    .max(50, 'Maximum 50 opportunities can be created at once'),
});

/**
 * Combined POST schema for external link opportunities (single or bulk)
 */
export const externalLinkOpportunityPostSchema = z.discriminatedUnion('bulk', [
  bulkCreateExternalLinkOpportunitiesSchema,
  createExternalLinkOpportunitySchema
    .extend({
      bulk: z.literal(false).optional(),
    })
    .transform((val) => ({ ...val, bulk: false as const })),
]);

/**
 * Update External Link Opportunity Schema
 *
 * PUT /api/external-link-opportunities/[id]
 * PATCH /api/external-link-opportunities/[id]
 */
export const updateExternalLinkOpportunitySchema = z.object({
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  external_source_id: z.string().optional(),
  keyword: z.string().optional(),
  suggested_url: z.string().url('Invalid URL format').optional(),
  suggested_anchor_text: z.string().max(200).optional(),
  context_snippet: z.string().max(500).optional(),
  position_in_content: z.coerce.number().int().min(0).optional(),
  relevance_score: z.coerce.number().int().min(0).max(100).optional(),
  link_type: externalLinkTypeSchema.optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * External Link Opportunities Query Schema
 *
 * GET /api/external-link-opportunities
 */
export const externalLinkOpportunitiesQuerySchema = z.object({
  organization_id: z.string().optional(),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  external_source_id: z.string().optional(),
  status: externalLinkOpportunityStatusSchema.optional(),
  link_type: externalLinkTypeSchema.optional(),
  search: z.string().optional(),
  min_relevance: z.coerce.number().int().min(0).max(100).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort: z
    .enum([
      'suggested_at',
      'relevance_score',
      'keyword',
      'status',
      'created_at',
    ])
    .optional()
    .default('relevance_score'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update External Link Opportunity Status Schema
 *
 * PATCH /api/external-link-opportunities/[id]/status
 */
export const updateExternalLinkOpportunityStatusSchema = z.object({
  status: externalLinkOpportunityStatusSchema.refine(
    (val) => val !== 'pending',
    'Cannot set status back to pending'
  ),
});

/**
 * Delete External Link Opportunity Schema
 *
 * DELETE /api/external-link-opportunities/[id]
 */
export const deleteExternalLinkOpportunitySchema = z.object({
  id: z.string().min(1, 'Opportunity ID is required'),
});

/**
 * Generate External Link Opportunities Schema
 *
 * POST /api/external-link-opportunities/generate
 */
export const generateExternalLinkOpportunitiesSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  title: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  min_relevance_score: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .default(50),
  max_suggestions: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(10),
  categories: z.array(categorySchema).optional(),
  link_type: externalLinkTypeSchema.optional().default('external'),
});

/**
 * External Link Opportunity Statistics Query Schema
 *
 * GET /api/external-link-opportunities/stats
 */
export const externalLinkOpportunityStatsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

/**
 * Apply External Link to Content Schema
 *
 * POST /api/external-link-opportunities/[id]/apply
 */
export const applyExternalLinkToContentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  anchor_text_override: z.string().optional(),
  insert_position: z
    .enum(['auto', 'start', 'end', 'after_context'])
    .optional()
    .default('auto'),
});

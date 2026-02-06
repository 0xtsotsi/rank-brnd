// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * External Link Sources API Schemas
 *
 * Zod validation schemas for external link source-related API routes.
 */

import { z } from 'zod';

/**
 * External link source category types
 */
export const externalLinkSourceCategorySchema = z.enum([
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
 * External link source status types
 */
export const externalLinkSourceStatusSchema = z.enum([
  'active',
  'inactive',
  'pending',
  'deprecated',
]);

/**
 * Create External Link Source Schema
 *
 * POST /api/external-link-sources
 */
export const createExternalLinkSourceSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  domain: z.string().min(1, 'Domain is required'),
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL format').optional(),
  description: z.string().optional(),
  category: externalLinkSourceCategorySchema.optional().default('other'),
  status: externalLinkSourceStatusSchema.optional().default('active'),
  domain_authority: z.coerce.number().int().min(0).max(100).optional(),
  page_authority: z.coerce.number().int().min(0).max(100).optional(),
  spam_score: z.coerce.number().min(0).max(1).optional(),
  trustworthiness_score: z.coerce.number().int().min(0).max(100).optional(),
  is_global: z.boolean().optional().default(false),
  topics: z.array(z.string()).optional().default([]),
  language: z.string().length(2).optional().default('en'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Bulk Create External Link Sources Schema
 *
 * POST /api/external-link-sources (bulk mode)
 */
export const bulkCreateExternalLinkSourcesSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  bulk: z.literal(true),
  sources: z
    .array(
      z.object({
        domain: z.string().min(1, 'Domain is required'),
        name: z.string().min(1, 'Name is required'),
        url: z.string().url('Invalid URL format').optional(),
        description: z.string().optional(),
        category: externalLinkSourceCategorySchema.optional(),
        domain_authority: z.coerce.number().int().min(0).max(100).optional(),
        trustworthiness_score: z.coerce
          .number()
          .int()
          .min(0)
          .max(100)
          .optional(),
        topics: z.array(z.string()).optional(),
        language: z.string().length(2).optional(),
      })
    )
    .min(1, 'At least one source is required')
    .max(50, 'Maximum 50 sources can be created at once'),
});

/**
 * Combined POST schema for external link sources (single or bulk)
 */
export const externalLinkSourcePostSchema = z.discriminatedUnion('bulk', [
  bulkCreateExternalLinkSourcesSchema,
  createExternalLinkSourceSchema
    .extend({
      bulk: z.literal(false).optional(),
    })
    .transform((val) => ({ ...val, bulk: false as const })),
]);

/**
 * Update External Link Source Schema
 *
 * PUT /api/external-link-sources/[id]
 * PATCH /api/external-link-sources/[id]
 */
export const updateExternalLinkSourceSchema = z.object({
  domain: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  category: externalLinkSourceCategorySchema.optional(),
  status: externalLinkSourceStatusSchema.optional(),
  domain_authority: z.coerce.number().int().min(0).max(100).optional(),
  page_authority: z.coerce.number().int().min(0).max(100).optional(),
  spam_score: z.coerce.number().min(0).max(1).optional(),
  trustworthiness_score: z.coerce.number().int().min(0).max(100).optional(),
  topics: z.array(z.string()).optional(),
  language: z.string().length(2).optional(),
  last_verified_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * External Link Sources Query Schema
 *
 * GET /api/external-link-sources
 */
export const externalLinkSourcesQuerySchema = z.object({
  organization_id: z.string().optional(),
  category: externalLinkSourceCategorySchema.optional(),
  status: externalLinkSourceStatusSchema.optional(),
  search: z.string().optional(),
  topics: z.string().optional(), // Comma-separated topics
  min_domain_authority: z.coerce.number().int().min(0).max(100).optional(),
  min_trustworthiness: z.coerce.number().int().min(0).max(100).optional(),
  is_global: z.boolean().optional(),
  language: z.string().length(2).optional(),
  sort: z
    .enum([
      'domain',
      'name',
      'category',
      'domain_authority',
      'trustworthiness_score',
      'created_at',
    ])
    .optional()
    .default('trustworthiness_score'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Find Relevant External Sources Schema
 *
 * POST /api/external-link-sources/find-relevant
 */
export const findRelevantExternalSourcesSchema = z.object({
  organization_id: z.string().optional(),
  content_keywords: z
    .array(z.string())
    .min(1, 'At least one keyword is required'),
  category: externalLinkSourceCategorySchema.optional(),
  min_authority: z.coerce.number().int().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/**
 * Delete External Link Source Schema
 *
 * DELETE /api/external-link-sources/[id]
 */
export const deleteExternalLinkSourceSchema = z.object({
  id: z.string().min(1, 'Source ID is required'),
});

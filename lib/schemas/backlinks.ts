// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Backlinks API Schemas
 *
 * Zod validation schemas for backlink-related API routes.
 */

import { z } from 'zod';

/**
 * Backlink status types
 */
export const backlinkStatusSchema = z.enum([
  'pending',
  'active',
  'lost',
  'disavowed',
  'spam',
]);

/**
 * Link type (rel attribute)
 */
export const linkTypeSchema = z.enum([
  'dofollow',
  'nofollow',
  'sponsored',
  'ugc',
]);

/**
 * Create Backlink Schema (single)
 *
 * POST /api/backlinks
 */
export const createBacklinkSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  sourceUrl: z
    .string()
    .url('Invalid source URL')
    .min(1, 'Source URL is required'),
  targetUrl: z
    .string()
    .url('Invalid target URL')
    .min(1, 'Target URL is required'),
  domainAuthority: z.coerce.number().int().min(0).max(100).optional(),
  pageAuthority: z.coerce.number().int().min(0).max(100).optional(),
  spamScore: z.coerce.number().min(0).max(1).optional(),
  linkType: linkTypeSchema.optional(),
  anchorText: z.string().optional(),
  status: backlinkStatusSchema.optional().default('pending'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Bulk Import Backlinks Schema
 *
 * POST /api/backlinks (bulk mode)
 */
export const bulkImportBacklinksSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  bulk: z.literal(true),
  backlinks: z
    .array(
      z.object({
        sourceUrl: z.string().url('Invalid source URL'),
        targetUrl: z.string().url('Invalid target URL'),
        domainAuthority: z.coerce.number().int().min(0).max(100).optional(),
        pageAuthority: z.coerce.number().int().min(0).max(100).optional(),
        spamScore: z.coerce.number().min(0).max(1).optional(),
        linkType: linkTypeSchema.optional(),
        anchorText: z.string().optional(),
        tags: z.string().optional(), // Comma-separated string for bulk import
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one backlink is required'),
});

/**
 * Combined POST schema for backlinks (single or bulk)
 */
export const backlinksPostSchema = z.discriminatedUnion('bulk', [
  bulkImportBacklinksSchema,
  createBacklinkSchema
    .extend({
      bulk: z.literal(false).optional(),
    })
    .transform((val) => ({ ...val, bulk: false as const })),
]);

/**
 * Update Backlink Schema
 *
 * PUT /api/backlinks/[id]
 * PATCH /api/backlinks/[id]
 */
export const updateBacklinkSchema = z.object({
  sourceUrl: z.string().url('Invalid source URL').optional(),
  targetUrl: z.string().url('Invalid target URL').optional(),
  domainAuthority: z.coerce.number().int().min(0).max(100).optional(),
  pageAuthority: z.coerce.number().int().min(0).max(100).optional(),
  spamScore: z.coerce.number().min(0).max(1).optional(),
  linkType: linkTypeSchema.optional(),
  anchorText: z.string().optional(),
  status: backlinkStatusSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  lastVerifiedAt: z.string().datetime().optional(),
});

/**
 * Backlinks Query Schema
 *
 * GET /api/backlinks
 */
export const backlinksQuerySchema = z.object({
  organization_id: z.string().optional(),
  product_id: z.string().optional(),
  article_id: z.string().optional(),
  search: z.string().optional(),
  status: backlinkStatusSchema.optional(),
  link_type: linkTypeSchema.optional(),
  min_domain_authority: z.coerce.number().int().min(0).max(100).optional(),
  max_domain_authority: z.coerce.number().int().min(0).max(100).optional(),
  min_page_authority: z.coerce.number().int().min(0).max(100).optional(),
  max_page_authority: z.coerce.number().int().min(0).max(100).optional(),
  tags: z.string().optional(),
  sort: z
    .enum([
      'source_url',
      'target_url',
      'domain_authority',
      'page_authority',
      'status',
      'link_type',
      'first_seen_at',
      'last_verified_at',
      'created_at',
    ])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Backlink Status Schema
 *
 * PATCH /api/backlinks/[id]/status
 */
export const updateBacklinkStatusSchema = z.object({
  status: backlinkStatusSchema,
});

/**
 * Delete Backlink Schema
 *
 * DELETE /api/backlinks
 */
export const deleteBacklinkSchema = z.object({
  id: z.string().min(1, 'Backlink ID is required'),
});

/**
 * Rank Tracking API Schemas
 *
 * Zod validation schemas for rank tracking-related API routes.
 */

import { z } from 'zod';

// Re-export validation helpers from the validation module
export { validateRequest, validateQueryParams } from './validation';

/**
 * Rank device types
 */
const rankDeviceSchema = z.enum(['desktop', 'mobile', 'tablet']);

/**
 * Create Rank Tracking Schema (single)
 *
 * POST /api/rank-tracking
 */
export const createRankTrackingSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID'),
  position: z.coerce
    .number()
    .int()
    .positive('Position must be a positive integer'),
  device: rankDeviceSchema.optional().default('desktop'),
  location: z
    .string()
    .max(10, 'Location code too long')
    .optional()
    .default('us'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  date: z.coerce.date().optional(),
  search_volume: z.coerce.number().int().nonnegative().optional(),
  ctr: z.coerce.number().min(0).max(1).optional(),
  impressions: z.coerce.number().int().nonnegative().optional(),
  clicks: z.coerce.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Bulk Import Rank Tracking Schema
 *
 * POST /api/rank-tracking (bulk mode)
 */
export const bulkImportRankTrackingSchema = z.object({
  bulk: z.literal(true),
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  records: z
    .array(
      z.object({
        keyword_id: z.string().uuid('Invalid keyword ID'),
        position: z.coerce.number().int().positive(),
        device: rankDeviceSchema.optional().default('desktop'),
        location: z.string().max(10).optional().default('us'),
        url: z.string().optional(),
        date: z.coerce.date().optional(),
        search_volume: z.coerce.number().int().nonnegative().optional(),
        ctr: z.coerce.number().min(0).max(1).optional(),
        impressions: z.coerce.number().int().nonnegative().optional(),
        clicks: z.coerce.number().int().nonnegative().optional(),
      })
    )
    .min(1, 'At least one record is required')
    .max(100, 'Cannot import more than 100 records at once'),
});

/**
 * Single rank tracking with bulk field
 */
const singleRankTrackingWithBulk = z.object({
  bulk: z.literal(false),
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID'),
  position: z.coerce
    .number()
    .int()
    .positive('Position must be a positive integer'),
  device: rankDeviceSchema.optional().default('desktop'),
  location: z
    .string()
    .max(10, 'Location code too long')
    .optional()
    .default('us'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  date: z.coerce.date().optional(),
  search_volume: z.coerce.number().int().nonnegative().optional(),
  ctr: z.coerce.number().min(0).max(1).optional(),
  impressions: z.coerce.number().int().nonnegative().optional(),
  clicks: z.coerce.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Combined POST schema for rank tracking (single or bulk)
 */
export const rankTrackingPostSchema = z.discriminatedUnion('bulk', [
  bulkImportRankTrackingSchema,
  singleRankTrackingWithBulk,
]);

/**
 * Rank Tracking Query Schema
 *
 * GET /api/rank-tracking
 */
export const rankTrackingQuerySchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID').optional(),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID').optional(),
  device: rankDeviceSchema.optional(),
  location: z.string().max(10).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  min_position: z.coerce.number().int().positive().optional(),
  max_position: z.coerce.number().int().positive().optional(),
  sort: z
    .enum(['date', 'position', 'device', 'location', 'created_at'])
    .optional()
    .default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Rank Tracking Schema
 *
 * PATCH /api/rank-tracking
 */
export const updateRankTrackingSchema = z.object({
  id: z.string().uuid('Invalid rank tracking ID'),
  position: z.coerce.number().int().positive().optional(),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  search_volume: z.coerce.number().int().nonnegative().optional(),
  ctr: z.coerce.number().min(0).max(1).optional(),
  impressions: z.coerce.number().int().nonnegative().optional(),
  clicks: z.coerce.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Delete Rank Tracking Schema
 *
 * DELETE /api/rank-tracking
 */
export const deleteRankTrackingSchema = z.object({
  id: z.string().uuid('Invalid rank tracking ID'),
});

/**
 * Get Rank History Schema
 *
 * GET /api/rank-tracking/history
 */
export const getRankHistorySchema = z.object({
  keyword_id: z.string().uuid('Invalid keyword ID'),
  device: rankDeviceSchema.optional().default('desktop'),
  location: z.string().max(10).optional().default('us'),
  days: z.coerce.number().int().positive().max(365).optional().default(30),
  end_date: z.coerce.date().optional(),
});

/**
 * Upsert Rank Tracking Schema
 *
 * POST /api/rank-tracking/upsert
 */
export const upsertRankTrackingSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  keyword_id: z.string().uuid('Invalid keyword ID'),
  position: z.coerce.number().int().positive(),
  device: rankDeviceSchema.optional().default('desktop'),
  location: z.string().max(10).optional().default('us'),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  date: z.coerce.date().optional(),
  search_volume: z.coerce.number().int().nonnegative().optional(),
  ctr: z.coerce.number().min(0).max(1).optional(),
  impressions: z.coerce.number().int().nonnegative().optional(),
  clicks: z.coerce.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Get Rank Statistics Schema
 *
 * GET /api/rank-tracking/stats
 */
export const getRankStatsSchema = z.object({
  keyword_id: z.string().uuid('Invalid keyword ID'),
  device: rankDeviceSchema.optional().default('desktop'),
  location: z.string().max(10).optional().default('us'),
  days: z.coerce.number().int().positive().max(365).optional().default(30),
});

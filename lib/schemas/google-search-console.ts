/**
 * Google Search Console API Schemas
 *
 * Zod validation schemas for Google Search Console related API routes.
 */

import { z } from 'zod';

/**
 * Google Search Console Data Schema
 */
export const googleSearchConsoleDataSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required'),
  impressions: z.coerce.number().int().nonnegative().default(0),
  clicks: z.coerce.number().int().nonnegative().default(0),
  ctr: z.coerce.number().nonnegative().default(0),
  avg_position: z.coerce.number().nonnegative().default(0),
  date: z.coerce
    .date()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .transform((val) => new Date(val)),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Create Search Console Data Schema (single)
 *
 * POST /api/search-console
 */
export const createSearchConsoleDataSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  data: googleSearchConsoleDataSchema,
});

/**
 * Bulk Import Search Console Data Schema
 *
 * POST /api/search-console/bulk
 */
export const bulkImportSearchConsoleDataSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  data: z
    .array(googleSearchConsoleDataSchema)
    .min(1, 'At least one data record is required'),
});

/**
 * Search Console Data Query Schema
 *
 * GET /api/search-console
 */
export const searchConsoleQuerySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  keyword: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sort: z
    .enum(['date', 'impressions', 'clicks', 'ctr', 'avg_position', 'keyword'])
    .optional()
    .default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().positive().max(1000).optional().default(100),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Delete Search Console Data Schema
 *
 * DELETE /api/search-console
 */
export const deleteSearchConsoleDataSchema = z.object({
  id: z.string().min(1, 'Data ID is required'),
});

/**
 * Search Console Metrics Query Schema
 *
 * GET /api/search-console/metrics
 */
export const searchConsoleMetricsQuerySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * Google Search Console Connection Config Schema
 */
export const searchConsoleConnectionSchema = z.object({
  siteUrl: z.string().url('Invalid site URL').min(1, 'Site URL is required'),
  propertyType: z
    .enum(['domain', 'url-prefix', 'provider'])
    .default('url-prefix'),
});

/**
 * Search Console API Error Response Schema
 */
export const searchConsoleErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.any()).optional(),
});

/**
 * Type exports
 */
export type GoogleSearchConsoleData = z.infer<
  typeof googleSearchConsoleDataSchema
>;
export type CreateSearchConsoleDataInput = z.infer<
  typeof createSearchConsoleDataSchema
>;
export type BulkImportSearchConsoleDataInput = z.infer<
  typeof bulkImportSearchConsoleDataSchema
>;
export type SearchConsoleQueryInput = z.infer<typeof searchConsoleQuerySchema>;
export type SearchConsoleMetricsQueryInput = z.infer<
  typeof searchConsoleMetricsQuerySchema
>;
export type SearchConsoleConnectionConfig = z.infer<
  typeof searchConsoleConnectionSchema
>;

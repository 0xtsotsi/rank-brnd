/**
 * Data Export Schemas
 *
 * Zod schemas for data export validation
 */

import { z } from 'zod';
import type { DataExportFormat, ExportableTable } from '@/types/data-export';

/**
 * Export format schema
 */
export const dataExportFormatSchema = z.enum(['json', 'csv']);

/**
 * Available tables for export
 */
export const exportableTableSchema = z.enum([
  'organizations',
  'organization_members',
  'team_members',
  'team_invitations',
  'products',
  'articles',
  'keywords',
  'backlinks',
  'exchange_network',
  'exchange_matches',
  'external_link_sources',
  'external_link_opportunities',
  'serp_analyses',
  'activity_logs',
  'integrations',
  'rank_tracking',
  'competitor_comparisons',
]);

/**
 * Request data export schema
 */
export const requestDataExportSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  format: dataExportFormatSchema.default('json'),
  requested_tables: z.array(exportableTableSchema).optional(),
  include_deleted: z.boolean().default(false),
});

/**
 * Data export status schema
 */
export const dataExportStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'expired',
]);

/**
 * Data export response schema
 */
export const dataExportResponseSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string(),
  status: dataExportStatusSchema,
  format: dataExportFormatSchema,
  file_url: z.string().url().nullable(),
  file_size_bytes: z.number().int().nonnegative().nullable(),
  record_count: z.number().int().nonnegative(),
  requested_tables: z.array(z.string()),
  include_deleted: z.boolean(),
  error_message: z.string().nullable(),
  expires_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Export list query schema
 */
export const exportListQuerySchema = z.object({
  status: dataExportStatusSchema.optional(),
  format: dataExportFormatSchema.optional(),
  include_expired: z.boolean().default(false),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * Export stats schema
 */
export const exportStatsSchema = z.object({
  total_exports: z.number().int().nonnegative(),
  completed_exports: z.number().int().nonnegative(),
  pending_exports: z.number().int().nonnegative(),
  failed_exports: z.number().int().nonnegative(),
  total_records_exported: z.number().int().nonnegative(),
  total_file_size_bytes: z.number().int().nonnegative(),
});

/**
 * Export request types
 */
export type RequestDataExportInput = z.infer<typeof requestDataExportSchema>;
export type DataExportResponse = z.infer<typeof dataExportResponseSchema>;
export type ExportListQuery = z.infer<typeof exportListQuerySchema>;
export type ExportStats = z.infer<typeof exportStatsSchema>;

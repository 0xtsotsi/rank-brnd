/**
 * Data Export Utilities
 *
 * Helper functions for working with GDPR data exports.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';
import type {
  DataExport,
  DataExportCreate,
  DataExportRequest,
  DataExportResult,
  DataExportStatus,
  DataExportFormat,
  ExportableTable,
  ExportedData,
  ExportStats,
} from '@/types/data-export';

// Define the data export row types inline since the generated types might not be up to date
export interface DataExportRow {
  id: string;
  organization_id: string;
  user_id: string;
  status: DataExportStatus;
  format: DataExportFormat;
  file_url: string | null;
  file_size_bytes: number | null;
  record_count: number;
  requested_tables: string[];
  include_deleted: boolean;
  error_message: string | null;
  expires_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DataExportInsert {
  organization_id: string;
  user_id: string;
  status?: DataExportStatus;
  format: DataExportFormat;
  requested_tables?: string[];
  include_deleted?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DataExportUpdate {
  status?: DataExportStatus;
  file_url?: string | null;
  file_size_bytes?: number | null;
  record_count?: number;
  error_message?: string | null;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
}

// Define default values for data exports
const DEFAULT_DATA_EXPORT_VALUES = {
  status: 'pending' as DataExportStatus,
  record_count: 0,
  requested_tables: [],
  include_deleted: false,
  metadata: {},
};

/**
 * Result type for data export operations
 */
export type DataExportOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get a data export by ID
 */
export async function getDataExportById(
  client: SupabaseClient<Database>,
  exportId: string
): Promise<DataExportOperationResult<DataExportRow>> {
  try {
    const { data, error } = await (client as any)
      .from('data_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Data export not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch data export',
    };
  }
}

/**
 * Get all data exports for an organization
 */
export async function getOrganizationDataExports(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    includeExpired?: boolean;
    status?: DataExportStatus;
    format?: DataExportFormat;
    limit?: number;
    offset?: number;
  } = {}
): Promise<DataExportOperationResult<DataExportRow[]>> {
  try {
    let query = (client as any)
      .from('data_exports')
      .select('*')
      .eq('organization_id', organizationId);

    if (!options.includeExpired) {
      query = query.or('expires_at.is.null,expires_at.gt.now()');
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.format) {
      query = query.eq('format', options.format);
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        (options.offset || 0) + (options.limit || 20) - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No data exports found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch data exports',
    };
  }
}

/**
 * Request a new data export
 */
export async function requestDataExport(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  format: DataExportFormat,
  options: {
    requestedTables?: ExportableTable[];
    includeDeleted?: boolean;
  } = {}
): Promise<DataExportOperationResult<DataExportRow>> {
  try {
    const result = await (client as any).rpc('request_data_export', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_format: format,
      p_requested_tables: options.requestedTables || null,
      p_include_deleted: options.includeDeleted || false,
    });

    if (result.error) throw result.error;

    // Fetch the created export
    const newExport = await getDataExportById(client, result.data as string);
    return newExport;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to request data export',
    };
  }
}

/**
 * Create a new data export item directly
 */
export async function createDataExport(
  client: SupabaseClient<Database>,
  item: DataExportInsert
): Promise<DataExportOperationResult<DataExportRow>> {
  try {
    const { data, error } = await (client as any)
      .from('data_exports')
      .insert({
        organization_id: item.organization_id,
        user_id: item.user_id,
        status: item.status || DEFAULT_DATA_EXPORT_VALUES.status,
        format: item.format,
        requested_tables: item.requested_tables || [],
        include_deleted:
          item.include_deleted ?? DEFAULT_DATA_EXPORT_VALUES.include_deleted,
        metadata: item.metadata || DEFAULT_DATA_EXPORT_VALUES.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create data export');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create data export',
    };
  }
}

/**
 * Update a data export item
 */
export async function updateDataExport(
  client: SupabaseClient<Database>,
  exportId: string,
  updates: DataExportUpdate
): Promise<DataExportOperationResult<DataExportRow>> {
  try {
    const { data, error } = await (client as any)
      .from('data_exports')
      .update(updates)
      .eq('id', exportId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Data export not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update data export',
    };
  }
}

/**
 * Mark export as processing
 */
export async function markExportAsProcessing(
  client: SupabaseClient<Database>,
  exportId: string
): Promise<DataExportOperationResult<boolean>> {
  try {
    const result = await (client as any).rpc('mark_export_processing', {
      p_export_id: exportId,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark export as processing',
    };
  }
}

/**
 * Mark export as completed
 */
export async function markExportAsCompleted(
  client: SupabaseClient<Database>,
  exportId: string,
  options: {
    fileUrl?: string;
    fileSizeBytes?: number;
    recordCount?: number;
  } = {}
): Promise<DataExportOperationResult<boolean>> {
  try {
    const result = await (client as any).rpc('mark_export_completed', {
      p_export_id: exportId,
      p_file_url: options.fileUrl || null,
      p_file_size_bytes: options.fileSizeBytes || null,
      p_record_count: options.recordCount || null,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark export as completed',
    };
  }
}

/**
 * Mark export as failed
 */
export async function markExportAsFailed(
  client: SupabaseClient<Database>,
  exportId: string,
  errorMessage: string
): Promise<DataExportOperationResult<boolean>> {
  try {
    const result = await (client as any).rpc('mark_export_failed', {
      p_export_id: exportId,
      p_error_message: errorMessage,
    });

    if (result.error) throw result.error;

    return { success: true, data: result.data === true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark export as failed',
    };
  }
}

/**
 * Get pending exports ready for processing
 */
export async function getPendingDataExports(
  client: SupabaseClient<Database>,
  limit: number = 10
): Promise<DataExportOperationResult<DataExportRow[]>> {
  try {
    const result = await (client as any).rpc('get_pending_data_exports', {
      p_limit: limit,
    });

    if (result.error) throw result.error;

    return { success: true, data: (result.data as DataExportRow[]) || [] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get pending exports',
    };
  }
}

/**
 * Get export statistics for an organization
 */
export async function getDataExportStats(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<DataExportOperationResult<ExportStats>> {
  try {
    const { data, error } = await (client as any)
      .from('data_exports')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    if (!data) throw new Error('No data exports found');

    const stats: ExportStats = {
      total_exports: data.length,
      completed_exports: data.filter((e: any) => e.status === 'completed')
        .length,
      pending_exports: data.filter((e: any) => e.status === 'pending').length,
      failed_exports: data.filter((e: any) => e.status === 'failed').length,
      total_records_exported: data.reduce(
        (sum: number, e: any) => sum + (e.record_count || 0),
        0
      ),
      total_file_size_bytes: data.reduce(
        (sum: number, e: any) => sum + (e.file_size_bytes || 0),
        0
      ),
    };

    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch export statistics',
    };
  }
}

/**
 * Check if user can access an export
 */
export async function canAccessDataExport(
  client: SupabaseClient<Database>,
  exportId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await (client as any).rpc('can_access_data_export', {
      p_export_id: exportId,
      p_user_id: userId,
    });

    if (result.error) throw result.error;

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Delete an expired export (cleanup)
 */
export async function deleteDataExport(
  client: SupabaseClient<Database>,
  exportId: string
): Promise<DataExportOperationResult<void>> {
  try {
    const { error } = await (client as any)
      .from('data_exports')
      .delete()
      .eq('id', exportId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete data export',
    };
  }
}

/**
 * Validate data export request data
 */
export function validateDataExportRequest(request: {
  format?: string;
  requested_tables?: string[];
  include_deleted?: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const validFormats: DataExportFormat[] = ['json', 'csv'];

  if (
    request.format &&
    !validFormats.includes(request.format as DataExportFormat)
  ) {
    errors.push('Invalid format. Must be json or csv');
  }

  const validTables: ExportableTable[] = [
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
  ];

  if (request.requested_tables) {
    for (const table of request.requested_tables) {
      if (!validTables.includes(table as ExportableTable)) {
        errors.push(`Invalid table: ${table}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

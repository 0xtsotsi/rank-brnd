/**
 * Data Export Types
 *
 * Types for GDPR data export functionality
 */

/**
 * Export status enum
 */
export type DataExportStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

/**
 * Export format enum
 */
export type DataExportFormat = 'json' | 'csv';

/**
 * Available tables for export
 */
export type ExportableTable =
  | 'organizations'
  | 'organization_members'
  | 'team_members'
  | 'team_invitations'
  | 'products'
  | 'articles'
  | 'keywords'
  | 'backlinks'
  | 'exchange_network'
  | 'exchange_matches'
  | 'external_link_sources'
  | 'external_link_opportunities'
  | 'serp_analyses'
  | 'activity_logs'
  | 'integrations'
  | 'rank_tracking'
  | 'competitor_comparisons';

/**
 * Data export request interface
 */
export interface DataExportRequest {
  organization_id: string;
  format: DataExportFormat;
  requested_tables?: ExportableTable[];
  include_deleted?: boolean;
}

/**
 * Data export response interface
 */
export interface DataExport {
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

/**
 * Data export create interface
 */
export interface DataExportCreate {
  organization_id: string;
  user_id: string;
  status: DataExportStatus;
  format: DataExportFormat;
  requested_tables: string[];
  include_deleted: boolean;
}

/**
 * Data export update interface
 */
export interface DataExportUpdate {
  status?: DataExportStatus;
  file_url?: string | null;
  file_size_bytes?: number | null;
  record_count?: number;
  error_message?: string | null;
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Exported data structure
 */
export interface ExportedData {
  organization: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    settings: Record<string, unknown>;
    created_at: string;
  };
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    created_at: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    url: string | null;
    status: string;
    created_at: string;
  }>;
  articles: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    word_count: number;
    published_at: string | null;
    created_at: string;
  }>;
  keywords: Array<{
    id: string;
    keyword: string;
    search_volume: number;
    difficulty: string;
    status: string;
    created_at: string;
  }>;
  backlinks: Array<{
    id: string;
    source_url: string;
    target_url: string;
    status: string;
    created_at: string;
  }>;
  activity_logs: Array<{
    id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
  }>;
  [key: string]: unknown;
}

/**
 * Export statistics
 */
export interface ExportStats {
  total_exports: number;
  completed_exports: number;
  pending_exports: number;
  failed_exports: number;
  total_records_exported: number;
  total_file_size_bytes: number;
}

/**
 * Result type for export operations
 */
export type DataExportResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

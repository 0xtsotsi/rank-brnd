// @ts-nocheck - Database types need to be regenerated with Supabase CLI
/**
 * Integration Types
 * Types for the third-party platform integrations feature
 *
 * Supports integrations with: WordPress, Webflow, Shopify, Ghost, Notion,
 * Squarespace, Wix, Contentful, Strapi, and custom platforms.
 */

import type { Database } from './database';
import type { Json } from './database';

// ============================================================================
// Database-Aligned Types (from Supabase)
// ============================================================================

/**
 * Integration database row type
 */
export type DbIntegration = Database['public']['Tables']['integrations']['Row'];

/**
 * Integration insert type (for creating new records)
 */
export type DbIntegrationInsert =
  Database['public']['Tables']['integrations']['Insert'];

/**
 * Integration update type (for updating existing records)
 */
export type DbIntegrationUpdate =
  Database['public']['Tables']['integrations']['Update'];

/**
 * Integration platform enum (matches database: integration_platform)
 */
export type IntegrationPlatform = DbIntegration['platform'];
export type IntegrationStatus = DbIntegration['status'];

// ============================================================================
// Domain Types (Application Layer)
// ============================================================================

/**
 * Supported platform integrations
 */
export type Platform =
  | 'wordpress'
  | 'webflow'
  | 'shopify'
  | 'ghost'
  | 'notion'
  | 'squarespace'
  | 'wix'
  | 'contentful'
  | 'strapi'
  | 'google'
  | 'google-search-console'
  | 'custom';

/**
 * Integration status values
 */
export type Status = 'active' | 'inactive' | 'error' | 'pending' | 'revoked';

/**
 * Authentication type options
 */
export type AuthType = 'api_key' | 'oauth' | 'bearer_token' | 'basic_auth';

/**
 * Platform-specific configuration interface
 * Each platform has its own configuration structure
 */
export interface IntegrationConfig {
  // WordPress specific
  siteUrl?: string;
  wpApiVersion?: string;
  // Webflow specific
  siteId?: string;
  collectionId?: string;
  // Shopify specific
  shopDomain?: string;
  shopifyApiVersion?: string;
  // Ghost specific
  adminUrl?: string;
  ghostApiVersion?: string;
  // Notion specific
  workspaceId?: string;
  databaseId?: string;
  // Common fields
  webhookUrl?: string;
  webhookSecret?: string;
  syncSettings?: SyncSettings;
  mapping?: FieldMapping;
  [key: string]: Json | string | SyncSettings | FieldMapping | undefined;
}

/**
 * Sync settings for scheduled data synchronization
 */
export interface SyncSettings {
  enabled: boolean;
  interval?: number; // seconds
  syncContent?: boolean;
  syncMedia?: boolean;
  syncProducts?: boolean;
  syncPages?: boolean;
  lastSyncAt?: string;
  nextSyncAt?: string;
}

/**
 * Field mapping for platform-specific data mapping
 */
export interface FieldMapping {
  title?: string;
  content?: string;
  slug?: string;
  featuredImage?: string;
  author?: string;
  tags?: string;
  category?: string;
  publishDate?: string;
  status?: string;
  [key: string]: string | undefined;
}

/**
 * Integration metadata
 */
export interface IntegrationMetadata {
  version?: string;
  connectedBy?: string;
  lastVerifiedAt?: string;
  webhookCount?: number;
  totalSyncs?: number;
  [key: string]: Json | string | number | undefined;
}

/**
 * Integration representing a third-party platform connection
 */
export interface Integration {
  id: string;
  organization_id: string;
  product_id: string | null;
  platform: Platform | string; // Allow string for database compatibility
  name: string;
  description: string | null;
  auth_token: string | null;
  refresh_token: string | null;
  auth_type: AuthType;
  config: IntegrationConfig;
  status: Status;
  last_synced_at: Date | null;
  last_error: string | null;
  last_error_at: Date | null;
  sync_interval_seconds: number;
  metadata: IntegrationMetadata;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Form data for creating/updating an integration
 */
export interface IntegrationFormData {
  name: string;
  description?: string;
  platform: Platform;
  product_id?: string;
  auth_token?: string;
  refresh_token?: string;
  auth_type?: AuthType;
  config?: Partial<IntegrationConfig>;
  sync_interval_seconds?: number;
}

/**
 * Filter options for integrations
 */
export interface IntegrationFilters {
  search: string;
  platform: Platform | 'all';
  status: Status | 'all';
}

/**
 * Integration with related data (for display)
 */
export interface IntegrationWithProduct extends Integration {
  product_name?: string;
  product_url?: string;
}

/**
 * Integration list response with pagination
 */
export interface IntegrationListResponse {
  integrations: Integration[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Integration stats summary
 */
export interface IntegrationStats {
  total_integrations: number;
  active_integrations: number;
  inactive_integrations: number;
  error_integrations: number;
  pending_integrations: number;
  by_platform: Record<Platform | string, number>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Platform display name mapping
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  wordpress: 'WordPress',
  webflow: 'Webflow',
  shopify: 'Shopify',
  ghost: 'Ghost',
  notion: 'Notion',
  squarespace: 'Squarespace',
  wix: 'Wix',
  contentful: 'Contentful',
  strapi: 'Strapi',
  google: 'Google',
  'google-search-console': 'Google Search Console',
  custom: 'Custom',
} as const;

/**
 * Platform icon mapping (for emoji or icon classes)
 */
export const PLATFORM_ICONS: Record<Platform, string> = {
  wordpress: '',
  webflow: '',
  shopify: '',
  ghost: '',
  notion: '',
  squarespace: 'SQ',
  wix: 'W',
  contentful: 'C',
  strapi: 'S',
  google: 'G',
  'google-search-console': 'GSC',
  custom: '',
} as const;

/**
 * Platform color mapping (for visual identification)
 */
export const PLATFORM_COLORS: Record<
  Platform,
  { bg: string; text: string; border: string }
> = {
  wordpress: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  webflow: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  shopify: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  ghost: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
  notion: {
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
  },
  squarespace: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  wix: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  contentful: {
    bg: 'sky-50 dark:bg-sky-900/20',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
  },
  strapi: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  google: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  'google-search-console': {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  custom: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
} as const;

/**
 * Status label mapping
 */
export const STATUS_LABELS: Record<Status, string> = {
  active: 'Active',
  inactive: 'Inactive',
  error: 'Error',
  pending: 'Pending',
  revoked: 'Revoked',
} as const;

/**
 * Status color mapping (for Tailwind CSS)
 */
export const STATUS_COLORS: Record<
  Status,
  { bg: string; text: string; border: string }
> = {
  active: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  inactive: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  revoked: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-200',
    border: 'border-red-300 dark:border-red-700',
  },
} as const;

/**
 * Auth type label mapping
 */
export const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  api_key: 'API Key',
  oauth: 'OAuth',
  bearer_token: 'Bearer Token',
  basic_auth: 'Basic Auth',
} as const;

/**
 * Default sync interval (1 hour in seconds)
 */
export const DEFAULT_SYNC_INTERVAL = 3600;

/**
 * Default integration config
 */
export const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  syncSettings: {
    enabled: true,
    syncContent: true,
    syncMedia: true,
  },
};

/**
 * Default integration metadata
 */
export const DEFAULT_INTEGRATION_METADATA: IntegrationMetadata = {
  totalSyncs: 0,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate platform type
 */
export function isValidPlatform(platform: string): platform is Platform {
  return [
    'wordpress',
    'webflow',
    'shopify',
    'ghost',
    'notion',
    'squarespace',
    'wix',
    'contentful',
    'strapi',
    'google',
    'google-search-console',
    'custom',
  ].includes(platform);
}

/**
 * Validate auth type
 */
export function isValidAuthType(authType: string): authType is AuthType {
  return ['api_key', 'oauth', 'bearer_token', 'basic_auth'].includes(authType);
}

/**
 * Validate sync interval (must be between 60 seconds and 30 days)
 */
export function isValidSyncInterval(seconds: number): boolean {
  return seconds >= 60 && seconds <= 2592000; // 30 days in seconds
}

/**
 * Format sync interval for display
 */
export function formatSyncInterval(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}

/**
 * Get platform display name
 */
export function getPlatformLabel(platform: Platform): string {
  return PLATFORM_LABELS[platform];
}

/**
 * Get status display name
 */
export function getStatusLabel(status: Status): string {
  return STATUS_LABELS[status];
}

/**
 * Convert database integration to domain integration
 */
export function dbIntegrationToIntegration(
  dbIntegration: DbIntegration
): Integration {
  return {
    id: dbIntegration.id,
    organization_id: dbIntegration.organization_id,
    product_id: dbIntegration.product_id,
    platform: dbIntegration.platform as Platform,
    name: dbIntegration.name,
    description: dbIntegration.description,
    auth_token: dbIntegration.auth_token,
    refresh_token: dbIntegration.refresh_token,
    auth_type: (dbIntegration.auth_type ?? 'api_key') as AuthType,
    config: dbIntegration.config as unknown as IntegrationConfig,
    status: dbIntegration.status as Status,
    last_synced_at: dbIntegration.last_synced_at
      ? new Date(dbIntegration.last_synced_at)
      : null,
    last_error: dbIntegration.last_error,
    last_error_at: dbIntegration.last_error_at
      ? new Date(dbIntegration.last_error_at)
      : null,
    sync_interval_seconds:
      dbIntegration.sync_interval_seconds ?? DEFAULT_SYNC_INTERVAL,
    metadata: (dbIntegration.metadata || {}) as unknown as IntegrationMetadata,
    created_at: new Date(dbIntegration.created_at),
    updated_at: new Date(dbIntegration.updated_at),
    deleted_at: dbIntegration.deleted_at
      ? new Date(dbIntegration.deleted_at)
      : null,
  };
}

/**
 * Convert domain integration to database insert
 */
export function integrationToDbInsert(
  integration: Omit<
    Integration,
    'id' | 'created_at' | 'updated_at' | 'deleted_at'
  > & {
    id?: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
  }
): DbIntegrationInsert {
  return {
    organization_id: integration.organization_id,
    product_id: integration.product_id,
    platform: integration.platform as DbIntegrationInsert['platform'],
    name: integration.name,
    description: integration.description || null,
    auth_token: integration.auth_token || null,
    refresh_token: integration.refresh_token || null,
    auth_type: integration.auth_type,
    config: (integration.config ||
      DEFAULT_INTEGRATION_CONFIG) as unknown as Json,
    status: integration.status,
    last_synced_at: integration.last_synced_at
      ? integration.last_synced_at.toISOString()
      : null,
    last_error: integration.last_error || null,
    last_error_at: integration.last_error_at
      ? integration.last_error_at.toISOString()
      : null,
    sync_interval_seconds: integration.sync_interval_seconds,
    metadata: (integration.metadata ||
      DEFAULT_INTEGRATION_METADATA) as unknown as Json,
  };
}

/**
 * Convert domain integration to database update
 */
export function integrationToDbUpdate(
  integration: Partial<Integration>
): DbIntegrationUpdate {
  const update: DbIntegrationUpdate = {};

  if (integration.name !== undefined) update.name = integration.name;
  if (integration.description !== undefined)
    update.description = integration.description;
  if (integration.auth_token !== undefined)
    update.auth_token = integration.auth_token;
  if (integration.refresh_token !== undefined)
    update.refresh_token = integration.refresh_token;
  if (integration.auth_type !== undefined)
    update.auth_type = integration.auth_type;
  if (integration.config !== undefined)
    update.config = integration.config as unknown as Json;
  if (integration.status !== undefined) update.status = integration.status;
  if (integration.last_synced_at !== undefined) {
    update.last_synced_at = integration.last_synced_at
      ? integration.last_synced_at.toISOString()
      : null;
  }
  if (integration.last_error !== undefined)
    update.last_error = integration.last_error;
  if (integration.last_error_at !== undefined) {
    update.last_error_at = integration.last_error_at
      ? integration.last_error_at.toISOString()
      : null;
  }
  if (integration.sync_interval_seconds !== undefined)
    update.sync_interval_seconds = integration.sync_interval_seconds;
  if (integration.metadata !== undefined)
    update.metadata = integration.metadata as unknown as Json;

  return update;
}

/**
 * Convert form data to integration (for creation)
 */
export function formDataToIntegration(
  data: IntegrationFormData,
  organizationId: string,
  id?: string
): Omit<Integration, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
} {
  return {
    ...(id !== undefined ? { id } : {}),
    organization_id: organizationId,
    product_id: data.product_id || null,
    platform: data.platform,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    auth_token: data.auth_token || null,
    refresh_token: data.refresh_token || null,
    auth_type: data.auth_type || 'api_key',
    config: { ...DEFAULT_INTEGRATION_CONFIG, ...data.config },
    status: 'active',
    last_synced_at: null,
    last_error: null,
    last_error_at: null,
    sync_interval_seconds: data.sync_interval_seconds || DEFAULT_SYNC_INTERVAL,
    metadata: { ...DEFAULT_INTEGRATION_METADATA },
    created_at: id ? new Date() : undefined,
    updated_at: new Date(),
    deleted_at: null,
  };
}

/**
 * Convert integration to form data
 */
export function integrationToFormData(
  integration: Integration
): IntegrationFormData {
  // Validate and convert platform to Platform type
  const platform = isValidPlatform(integration.platform)
    ? integration.platform
    : 'custom'; // Fallback to custom for unknown platforms

  return {
    name: integration.name,
    description: integration.description || undefined,
    platform,
    product_id: integration.product_id || undefined,
    auth_token: integration.auth_token || undefined,
    refresh_token: integration.refresh_token || undefined,
    auth_type: integration.auth_type,
    config: integration.config,
    sync_interval_seconds: integration.sync_interval_seconds,
  };
}

/**
 * Check if integration needs sync based on last synced time and interval
 */
export function needsSync(integration: Integration): boolean {
  if (!integration.last_synced_at) return true;
  if (integration.status !== 'active') return false;

  const now = new Date();
  const elapsed = Math.floor(
    (now.getTime() - integration.last_synced_at.getTime()) / 1000
  );
  return elapsed >= integration.sync_interval_seconds;
}

/**
 * Calculate next sync time
 */
export function getNextSyncTime(integration: Integration): Date | null {
  if (integration.status !== 'active') return null;

  const lastSync = integration.last_synced_at || new Date();
  return new Date(
    lastSync.getTime() + integration.sync_interval_seconds * 1000
  );
}

/**
 * Product/Website Types
 * Types for the product management feature with CRUD operations
 *
 * This file provides both database-aligned types and form-facing types
 * for a seamless integration between the UI and the database layer.
 */

import type { Database } from './database';
import type { Json } from './database';

// ============================================================================
// Database-Aligned Types (from Supabase)
// ============================================================================

/**
 * Product database row type
 */
export type DbProduct = Database['public']['Tables']['products']['Row'];

/**
 * Product insert type (for creating new records)
 */
export type DbProductInsert =
  Database['public']['Tables']['products']['Insert'];

/**
 * Product update type (for updating existing records)
 */
export type DbProductUpdate =
  Database['public']['Tables']['products']['Update'];

/**
 * Product status enum (matches database: product_status)
 */
export type ProductStatus = DbProduct['status']; // 'active' | 'archived' | 'pending'

// ============================================================================
// Domain Types (Application Layer)
// ============================================================================

/**
 * Brand colors configuration
 */
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background?: string;
  text?: string;
  [key: string]: Json | string | undefined;
}

/**
 * Tone preferences for content generation
 */
export interface TonePreferences {
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  voice: 'first-person' | 'second-person' | 'third-person';
  style?: string;
  [key: string]: Json | string | undefined;
}

/**
 * Brand tone type (for use in brand settings)
 */
export type BrandTone = TonePreferences['tone'];

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  tracking_id?: string;
  provider?: 'google-analytics' | 'plausible' | 'fathom' | null;
  [key: string]: Json | string | boolean | undefined;
}

/**
 * Product metadata
 */
export interface ProductMetadata {
  logo?: string;
  favicon?: string;
  industry?: string;
  keywords?: string[];
  target_audience?: string;
  [key: string]: Json | string[] | undefined;
}

/**
 * Product or Website being tracked for SEO and content management
 * This is the main application type that extends the database type
 */
export interface Product {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  url: string | null;
  description: string | null;
  status: ProductStatus;
  brand_colors: BrandColors;
  tone_preferences: TonePreferences;
  analytics_config: AnalyticsConfig;
  metadata: ProductMetadata;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Form data for creating/updating a product
 */
export interface ProductFormData {
  name: string;
  slug: string;
  url?: string;
  description?: string;
  status?: ProductStatus;
  brand_colors?: Partial<BrandColors>;
  tone_preferences?: Partial<TonePreferences>;
  analytics_config?: Partial<AnalyticsConfig>;
  metadata?: ProductMetadata;
}

/**
 * Filter options for products
 */
export interface ProductFilters {
  search: string;
  status: ProductStatus | 'all';
}

/**
 * Product with organization name (for display)
 */
export interface ProductWithOrganization extends Product {
  organization_name?: string;
}

/**
 * Product stats summary
 */
export interface ProductStats {
  total_products: number;
  active_products: number;
  archived_products: number;
  pending_products: number;
}

/**
 * Product list response with pagination
 */
export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Brand tone label mapping
 */
export const TONE_LABELS: Record<TonePreferences['tone'], string> = {
  professional: 'Professional',
  casual: 'Casual',
  friendly: 'Friendly',
  formal: 'Formal',
} as const;

/**
 * Brand voice label mapping
 */
export const VOICE_LABELS: Record<TonePreferences['voice'], string> = {
  'first-person': 'First Person',
  'second-person': 'Second Person',
  'third-person': 'Third Person',
} as const;

/**
 * Product status label mapping
 */
export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  pending: 'Pending',
} as const;

/**
 * Product status color mapping (for Tailwind CSS)
 */
export const STATUS_COLORS: Record<
  ProductStatus,
  { bg: string; text: string; border: string }
> = {
  active: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  archived: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
} as const;

/**
 * Default brand colors
 */
export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: '#000000',
  secondary: '#666666',
  accent: '#3b82f6',
};

/**
 * Default tone preferences
 */
export const DEFAULT_TONE_PREFERENCES: TonePreferences = {
  tone: 'professional',
  voice: 'third-person',
};

/**
 * Default analytics config
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: false,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Convert database product to domain product
 */
export function dbProductToProduct(dbProduct: DbProduct): Product {
  return {
    id: dbProduct.id,
    organization_id: dbProduct.organization_id,
    name: dbProduct.name,
    slug: dbProduct.slug,
    url: dbProduct.url,
    description: dbProduct.description,
    status: dbProduct.status,
    brand_colors: dbProduct.brand_colors as unknown as BrandColors,
    tone_preferences: dbProduct.tone_preferences as unknown as TonePreferences,
    analytics_config: dbProduct.analytics_config as unknown as AnalyticsConfig,
    metadata: (dbProduct.metadata || {}) as unknown as ProductMetadata,
    created_at: new Date(dbProduct.created_at),
    updated_at: new Date(dbProduct.updated_at),
    deleted_at: dbProduct.deleted_at ? new Date(dbProduct.deleted_at) : null,
  };
}

/**
 * Convert domain product to database insert
 */
export function productToDbInsert(
  product: Partial<Product> & Pick<Product, 'organization_id' | 'name' | 'slug'>
): DbProductInsert {
  return {
    organization_id: product.organization_id,
    name: product.name,
    slug: product.slug,
    url: product.url || null,
    description: product.description || null,
    status: product.status || 'active',
    brand_colors: (product.brand_colors ||
      DEFAULT_BRAND_COLORS) as unknown as Json,
    tone_preferences: (product.tone_preferences ||
      DEFAULT_TONE_PREFERENCES) as unknown as Json,
    analytics_config: (product.analytics_config ||
      DEFAULT_ANALYTICS_CONFIG) as unknown as Json,
    metadata: (product.metadata || {}) as unknown as Json,
  };
}

/**
 * Convert domain product to database update
 */
export function productToDbUpdate(product: Partial<Product>): DbProductUpdate {
  const update: DbProductUpdate = {};

  if (product.name !== undefined) update.name = product.name;
  if (product.slug !== undefined) update.slug = product.slug;
  if (product.url !== undefined) update.url = product.url;
  if (product.description !== undefined)
    update.description = product.description;
  if (product.status !== undefined) update.status = product.status;
  if (product.brand_colors !== undefined)
    update.brand_colors = product.brand_colors as unknown as Json;
  if (product.tone_preferences !== undefined)
    update.tone_preferences = product.tone_preferences as unknown as Json;
  if (product.analytics_config !== undefined)
    update.analytics_config = product.analytics_config as unknown as Json;
  if (product.metadata !== undefined)
    update.metadata = product.metadata as unknown as Json;

  return update;
}

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert product to form data
 */
export function productToFormData(product: Product): ProductFormData {
  return {
    name: product.name,
    slug: product.slug,
    url: product.url || undefined,
    description: product.description || undefined,
    status: product.status,
    brand_colors: product.brand_colors,
    tone_preferences: product.tone_preferences,
    analytics_config: product.analytics_config,
    metadata: product.metadata,
  };
}

/**
 * Convert form data to product (for creation)
 */
export function formDataToProduct(
  data: ProductFormData,
  organizationId: string,
  id?: string
): Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
} {
  return {
    ...(id !== undefined ? { id } : {}),
    organization_id: organizationId,
    name: data.name.trim(),
    slug: data.slug.trim(),
    url: data.url?.trim() || null,
    description: data.description?.trim() || null,
    status: data.status || 'active',
    brand_colors: {
      ...DEFAULT_BRAND_COLORS,
      ...data.brand_colors,
    },
    tone_preferences: {
      ...DEFAULT_TONE_PREFERENCES,
      ...data.tone_preferences,
    },
    analytics_config: {
      ...DEFAULT_ANALYTICS_CONFIG,
      ...data.analytics_config,
    },
    metadata: data.metadata || {},
    created_at: id ? new Date() : undefined,
    updated_at: new Date(),
    deleted_at: null,
  };
}

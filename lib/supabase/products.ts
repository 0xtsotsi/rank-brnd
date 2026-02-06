// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Products Utilities
 *
 * Helper functions for working with products (websites) owned by organizations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

type ProductStatus = 'active' | 'archived' | 'pending';

/**
 * Brand colors configuration
 */
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Tone preferences configuration
 */
export interface TonePreferences {
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  voice: 'first-person' | 'second-person' | 'third-person';
  style?: string;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  tracking_id?: string;
  provider?: 'google-analytics' | 'plausible' | 'fathom' | null;
}

/**
 * Result type for product operations
 */
export type ProductResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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
  voice: 'formal',
};

/**
 * Default analytics config
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: false,
  tracking_id: undefined,
  provider: null,
};

/**
 * Get a product by ID
 */
export async function getProductById(
  client: SupabaseClient<Database>,
  productId: string
): Promise<ProductResult<Product>> {
  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('id', productId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Product not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product',
    };
  }
}

/**
 * Get a product by slug within an organization
 */
export async function getProductBySlug(
  client: SupabaseClient<Database>,
  organizationId: string,
  slug: string
): Promise<ProductResult<Product>> {
  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Product not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch product',
    };
  }
}

/**
 * Get all products for an organization
 */
export async function getOrganizationProducts(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: { includeDeleted?: boolean; status?: ProductStatus } = {}
): Promise<ProductResult<Product[]>> {
  try {
    let query = client
      .from('products')
      .select('*')
      .eq('organization_id', organizationId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No products found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch products',
    };
  }
}

/**
 * Create a new product
 */
export async function createProduct(
  client: SupabaseClient<Database>,
  product: ProductInsert
): Promise<ProductResult<Product>> {
  try {
    const { data, error } = await client
      .from('products')
      .insert({
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
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create product');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create product',
    };
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  client: SupabaseClient<Database>,
  productId: string,
  updates: ProductUpdate
): Promise<ProductResult<Product>> {
  try {
    const { data, error } = await client
      .from('products')
      .update(updates)
      .eq('id', productId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Product not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update product',
    };
  }
}

/**
 * Soft delete a product
 */
export async function softDeleteProduct(
  client: SupabaseClient<Database>,
  productId: string
): Promise<ProductResult<void>> {
  try {
    const { error } = await client
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete product',
    };
  }
}

/**
 * Permanently delete a product (use with caution)
 */
export async function deleteProduct(
  client: SupabaseClient<Database>,
  productId: string
): Promise<ProductResult<void>> {
  try {
    const { error } = await client
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete product',
    };
  }
}

/**
 * Update product status
 */
export async function updateProductStatus(
  client: SupabaseClient<Database>,
  productId: string,
  status: ProductStatus
): Promise<ProductResult<Product>> {
  return updateProduct(client, productId, { status });
}

/**
 * Update product brand colors
 */
export async function updateProductBrandColors(
  client: SupabaseClient<Database>,
  productId: string,
  brandColors: BrandColors
): Promise<ProductResult<Product>> {
  return updateProduct(client, productId, {
    brand_colors: brandColors as unknown as Json,
  });
}

/**
 * Update product tone preferences
 */
export async function updateProductTonePreferences(
  client: SupabaseClient<Database>,
  productId: string,
  tonePreferences: TonePreferences
): Promise<ProductResult<Product>> {
  return updateProduct(client, productId, {
    tone_preferences: tonePreferences as unknown as Json,
  });
}

/**
 * Update product analytics configuration
 */
export async function updateProductAnalyticsConfig(
  client: SupabaseClient<Database>,
  productId: string,
  analyticsConfig: AnalyticsConfig
): Promise<ProductResult<Product>> {
  return updateProduct(client, productId, {
    analytics_config: analyticsConfig as unknown as Json,
  });
}

/**
 * Check if a user can access a product (via organization membership)
 */
export async function canUserAccessProduct(
  client: SupabaseClient<Database>,
  productId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_product', {
      p_product_id: productId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique slug for a product within an organization
 */
export async function generateUniqueProductSlug(
  client: SupabaseClient<Database>,
  organizationId: string,
  name: string
): Promise<string> {
  // Convert to URL-friendly slug
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Check if slug exists within the organization and add suffix if needed
  let suffix = 0;
  let uniqueSlug = slug;
  const MAX_ATTEMPTS = 100; // Prevent infinite loops

  while (suffix < MAX_ATTEMPTS) {
    const { data } = await client
      .from('products')
      .select('slug')
      .eq('organization_id', organizationId)
      .eq('slug', uniqueSlug)
      .maybeSingle();

    if (!data) {
      return uniqueSlug;
    }

    suffix++;
    uniqueSlug = `${slug}-${suffix}`;
  }

  throw new Error(
    `Unable to generate unique product slug after ${MAX_ATTEMPTS} attempts. Last attempted: ${uniqueSlug}`
  );
}

/**
 * Validate brand colors
 */
export function validateBrandColors(colors: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for required keys
  const requiredKeys = ['primary', 'secondary', 'accent'];
  for (const key of requiredKeys) {
    if (!colors[key]) {
      errors.push(`Missing required color: ${key}`);
    } else if (typeof colors[key] !== 'string') {
      errors.push(`Color ${key} must be a string`);
    } else if (!/^#[0-9A-Fa-f]{6}$/.test(colors[key] as string)) {
      errors.push(`Color ${key} must be a valid hex color (e.g., #000000)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate tone preferences
 */
export function validateTonePreferences(preferences: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const validTones = ['professional', 'casual', 'friendly', 'formal'];
  const validVoices = ['first-person', 'second-person', 'third-person'];

  if (preferences.tone && typeof preferences.tone === 'string') {
    if (!validTones.includes(preferences.tone)) {
      errors.push(`Invalid tone: ${preferences.tone}`);
    }
  } else {
    errors.push('Missing or invalid tone preference');
  }

  if (preferences.voice && typeof preferences.voice === 'string') {
    if (!validVoices.includes(preferences.voice)) {
      errors.push(`Invalid voice: ${preferences.voice}`);
    }
  } else {
    errors.push('Missing or invalid voice preference');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate analytics configuration
 */
export function validateAnalyticsConfig(config: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const validProviders = ['google-analytics', 'plausible', 'fathom', null];

  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (config.provider && !validProviders.includes(config.provider as never)) {
    errors.push(`Invalid provider: ${config.provider}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

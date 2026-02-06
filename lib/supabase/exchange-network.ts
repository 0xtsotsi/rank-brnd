// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Exchange Network Utilities
 *
 * Helper functions for working with exchange network sites tracked by organizations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type ExchangeNetwork = Database['public']['Tables']['exchange_network']['Row'];
type ExchangeNetworkInsert =
  Database['public']['Tables']['exchange_network']['Insert'];
type ExchangeNetworkUpdate =
  Database['public']['Tables']['exchange_network']['Update'];

type ExchangeNetworkStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * Result type for exchange network operations
 */
export type ExchangeNetworkResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default values for optional fields
 */
export const DEFAULT_EXCHANGE_NETWORK_VALUES = {
  status: 'active' as ExchangeNetworkStatus,
  credits_available: 0,
  tags: [],
  metadata: {},
};

/**
 * Get an exchange network site by ID
 */
export async function getExchangeNetworkSiteById(
  client: SupabaseClient<Database>,
  siteId: string
): Promise<ExchangeNetworkResult<ExchangeNetwork>> {
  try {
    const { data, error } = await client
      .from('exchange_network')
      .select('*')
      .eq('id', siteId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Exchange network site not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch exchange network site',
    };
  }
}

/**
 * Get all exchange network sites for an organization
 */
export async function getOrganizationExchangeNetworkSites(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    includeDeleted?: boolean;
    productId?: string;
    status?: ExchangeNetworkStatus;
    niche?: string;
    minAuthority?: number;
    maxAuthority?: number;
    minCredits?: number;
    maxCredits?: number;
    minQualityScore?: number;
    maxSpamScore?: number;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?:
      | 'domain'
      | 'authority'
      | 'niche'
      | 'credits_available'
      | 'quality_score'
      | 'spam_score'
      | 'status'
      | 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ExchangeNetworkResult<ExchangeNetwork[]>> {
  try {
    let query = client
      .from('exchange_network')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.niche) {
      query = query.eq('niche', options.niche);
    }

    if (options.minAuthority !== undefined) {
      query = query.gte('authority', options.minAuthority);
    }

    if (options.maxAuthority !== undefined) {
      query = query.lte('authority', options.maxAuthority);
    }

    if (options.minCredits !== undefined) {
      query = query.gte('credits_available', options.minCredits);
    }

    if (options.maxCredits !== undefined) {
      query = query.lte('credits_available', options.maxCredits);
    }

    if (options.minQualityScore !== undefined) {
      query = query.gte('quality_score', options.minQualityScore);
    }

    if (options.maxSpamScore !== undefined) {
      query = query.lte('spam_score', options.maxSpamScore);
    }

    if (options.search) {
      query = query.or(
        `domain.ilike.%${options.search}%,niche.ilike.%${options.search}%,contact_name.ilike.%${options.search}%,contact_email.ilike.%${options.search}%,notes.ilike.%${options.search}%`
      );
    }

    if (options.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }

    // Apply sorting
    const sortColumn = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortColumn, {
      ascending: sortOrder === 'asc',
      nullsFirst: false,
    });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        (options.offset || 0) + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No exchange network sites found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch exchange network sites',
    };
  }
}

/**
 * Get all exchange network sites for a product
 */
export async function getProductExchangeNetworkSites(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    includeDeleted?: boolean;
    status?: ExchangeNetworkStatus;
    limit?: number;
  } = {}
): Promise<ExchangeNetworkResult<ExchangeNetwork[]>> {
  try {
    let query = client
      .from('exchange_network')
      .select('*')
      .eq('product_id', productId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('authority', {
      ascending: false,
      nullsFirst: false,
    });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No exchange network sites found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch exchange network sites',
    };
  }
}

/**
 * Create a new exchange network site
 */
export async function createExchangeNetworkSite(
  client: SupabaseClient<Database>,
  site: ExchangeNetworkInsert
): Promise<ExchangeNetworkResult<ExchangeNetwork>> {
  try {
    const { data, error } = await client
      .from('exchange_network')
      .insert({
        organization_id: site.organization_id,
        product_id: site.product_id || null,
        site_id: site.site_id || null,
        domain: site.domain,
        authority: site.authority || null,
        niche: site.niche || null,
        credits_available:
          site.credits_available ??
          DEFAULT_EXCHANGE_NETWORK_VALUES.credits_available,
        quality_score: site.quality_score || null,
        spam_score: site.spam_score || null,
        status: site.status || DEFAULT_EXCHANGE_NETWORK_VALUES.status,
        contact_email: site.contact_email || null,
        contact_name: site.contact_name || null,
        notes: site.notes || null,
        tags: (site.tags ||
          DEFAULT_EXCHANGE_NETWORK_VALUES.tags) as unknown as Json,
        metadata: (site.metadata ||
          DEFAULT_EXCHANGE_NETWORK_VALUES.metadata) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create exchange network site');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create exchange network site',
    };
  }
}

/**
 * Bulk create exchange network sites
 */
export async function bulkCreateExchangeNetworkSites(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId: string | null,
  sites: Array<{
    site_id?: string;
    domain: string;
    authority?: number;
    niche?: string;
    credits_available?: number;
    quality_score?: number;
    spam_score?: number;
    contact_email?: string;
    contact_name?: string;
    tags?: string[];
    notes?: string;
  }>
): Promise<
  ExchangeNetworkResult<{
    successful: number;
    failed: number;
    errors: string[];
  }>
> {
  const errors: string[] = [];
  let successful = 0;

  for (const site of sites) {
    try {
      const result = await createExchangeNetworkSite(client, {
        organization_id: organizationId,
        product_id: productId || undefined,
        site_id: site.site_id,
        domain: site.domain,
        authority: site.authority,
        niche: site.niche,
        credits_available: site.credits_available,
        quality_score: site.quality_score,
        spam_score: site.spam_score,
        contact_email: site.contact_email,
        contact_name: site.contact_name,
        tags: site.tags,
        notes: site.notes,
      });

      if (result.success) {
        successful++;
      } else {
        errors.push(`${site.domain}: ${result.error}`);
      }
    } catch (error) {
      errors.push(
        `${site.domain}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return {
    success: true,
    data: {
      successful,
      failed: errors.length,
      errors,
    },
  };
}

/**
 * Update an exchange network site
 */
export async function updateExchangeNetworkSite(
  client: SupabaseClient<Database>,
  siteId: string,
  updates: ExchangeNetworkUpdate
): Promise<ExchangeNetworkResult<ExchangeNetwork>> {
  try {
    const { data, error } = await client
      .from('exchange_network')
      .update(updates)
      .eq('id', siteId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Exchange network site not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update exchange network site',
    };
  }
}

/**
 * Update exchange network site status
 */
export async function updateExchangeNetworkSiteStatus(
  client: SupabaseClient<Database>,
  siteId: string,
  status: ExchangeNetworkStatus
): Promise<ExchangeNetworkResult<ExchangeNetwork>> {
  const updates: ExchangeNetworkUpdate = {
    status,
    last_verified_at: new Date().toISOString(),
  };

  return updateExchangeNetworkSite(client, siteId, updates);
}

/**
 * Update credits available for an exchange network site
 */
export async function updateExchangeNetworkSiteCredits(
  client: SupabaseClient<Database>,
  siteId: string,
  change: number,
  operation: 'add' | 'subtract' | 'set' = 'add'
): Promise<ExchangeNetworkResult<ExchangeNetwork>> {
  try {
    // First get current credits
    const currentResult = await getExchangeNetworkSiteById(client, siteId);
    if (!currentResult.success) {
      return { success: false, error: currentResult.error };
    }

    const currentCredits = currentResult.data.credits_available || 0;
    let newCredits: number;

    switch (operation) {
      case 'add':
        newCredits = Math.max(0, currentCredits + change);
        break;
      case 'subtract':
        newCredits = Math.max(0, currentCredits - change);
        break;
      case 'set':
        newCredits = Math.max(0, change);
        break;
      default:
        newCredits = currentCredits;
    }

    const updates: ExchangeNetworkUpdate = {
      credits_available: newCredits,
    };

    return updateExchangeNetworkSite(client, siteId, updates);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update exchange network credits',
    };
  }
}

/**
 * Verify exchange network site (updates last_verified_at)
 */
export async function verifyExchangeNetworkSite(
  client: SupabaseClient<Database>,
  siteId: string,
  isActive: boolean
): Promise<ExchangeNetworkResult<ExchangeNetwork>> {
  const updates: ExchangeNetworkUpdate = {
    last_verified_at: new Date().toISOString(),
    status: isActive ? 'active' : 'inactive',
  };

  return updateExchangeNetworkSite(client, siteId, updates);
}

/**
 * Soft delete an exchange network site
 */
export async function softDeleteExchangeNetworkSite(
  client: SupabaseClient<Database>,
  siteId: string
): Promise<ExchangeNetworkResult<void>> {
  try {
    const { error } = await client
      .from('exchange_network')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', siteId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete exchange network site',
    };
  }
}

/**
 * Permanently delete an exchange network site (use with caution)
 */
export async function deleteExchangeNetworkSite(
  client: SupabaseClient<Database>,
  siteId: string
): Promise<ExchangeNetworkResult<void>> {
  try {
    const { error } = await client
      .from('exchange_network')
      .delete()
      .eq('id', siteId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete exchange network site',
    };
  }
}

/**
 * Check if a user can access an exchange network site (via organization membership)
 */
export async function canUserAccessExchangeNetworkSite(
  client: SupabaseClient<Database>,
  siteId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_exchange_network', {
      p_exchange_network_id: siteId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get exchange network statistics for an organization
 */
export async function getExchangeNetworkStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string
): Promise<
  ExchangeNetworkResult<{
    total: number;
    byStatus: Record<ExchangeNetworkStatus, number>;
    totalCredits: number;
    avgAuthority: number;
    avgQualityScore: number;
    byNiche: Record<string, number>;
  }>
> {
  try {
    let query = client
      .from('exchange_network')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No exchange network sites found');

    const byStatus: Record<ExchangeNetworkStatus, number> = {
      active: 0,
      inactive: 0,
      pending: 0,
      suspended: 0,
    };

    const byNiche: Record<string, number> = {};
    let totalCredits = 0;
    let totalAuthority = 0;
    let authorityCount = 0;
    let totalQualityScore = 0;
    let qualityScoreCount = 0;

    for (const site of data) {
      byStatus[site.status as ExchangeNetworkStatus]++;

      if (site.niche) {
        byNiche[site.niche] = (byNiche[site.niche] || 0) + 1;
      } else {
        byNiche['Uncategorized'] = (byNiche['Uncategorized'] || 0) + 1;
      }

      totalCredits += site.credits_available || 0;

      if (site.authority !== null) {
        totalAuthority += site.authority;
        authorityCount++;
      }

      if (site.quality_score !== null) {
        totalQualityScore += Number(site.quality_score);
        qualityScoreCount++;
      }
    }

    return {
      success: true,
      data: {
        total: data.length,
        byStatus,
        totalCredits,
        avgAuthority: authorityCount > 0 ? totalAuthority / authorityCount : 0,
        avgQualityScore:
          qualityScoreCount > 0 ? totalQualityScore / qualityScoreCount : 0,
        byNiche,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch exchange network stats',
    };
  }
}

/**
 * Validate exchange network site data
 */
export function validateExchangeNetworkSite(site: {
  domain?: string;
  authority?: number;
  quality_score?: number;
  spam_score?: number;
  credits_available?: number;
  contact_email?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (site.domain !== undefined) {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(site.domain)) {
      errors.push('Domain must be a valid domain name');
    }
  }

  if (
    site.authority !== undefined &&
    (typeof site.authority !== 'number' ||
      site.authority < 0 ||
      site.authority > 100)
  ) {
    errors.push('Authority must be a number between 0 and 100');
  }

  if (
    site.quality_score !== undefined &&
    (typeof site.quality_score !== 'number' ||
      site.quality_score < 0 ||
      site.quality_score > 1)
  ) {
    errors.push('Quality score must be a number between 0 and 1');
  }

  if (
    site.spam_score !== undefined &&
    (typeof site.spam_score !== 'number' ||
      site.spam_score < 0 ||
      site.spam_score > 1)
  ) {
    errors.push('Spam score must be a number between 0 and 1');
  }

  if (
    site.credits_available !== undefined &&
    (typeof site.credits_available !== 'number' || site.credits_available < 0)
  ) {
    errors.push('Credits available must be a non-negative number');
  }

  if (site.contact_email !== undefined && site.contact_email !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(site.contact_email)) {
      errors.push('Contact email must be a valid email address');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

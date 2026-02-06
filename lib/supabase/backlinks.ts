// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Backlinks Utilities
 *
 * Helper functions for working with backlinks tracked by organizations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type Backlink = Database['public']['Tables']['backlinks']['Row'];
type BacklinkInsert = Database['public']['Tables']['backlinks']['Insert'];
type BacklinkUpdate = Database['public']['Tables']['backlinks']['Update'];

type BacklinkStatus = 'pending' | 'active' | 'lost' | 'disavowed' | 'spam';
type LinkType = 'dofollow' | 'nofollow' | 'sponsored' | 'ugc';

/**
 * Result type for backlink operations
 */
export type BacklinkResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default values for optional fields
 */
export const DEFAULT_BACKLINK_VALUES = {
  status: 'pending' as BacklinkStatus,
  tags: [],
  metadata: {},
};

/**
 * Get a backlink by ID
 */
export async function getBacklinkById(
  client: SupabaseClient<Database>,
  backlinkId: string
): Promise<BacklinkResult<Backlink>> {
  try {
    const { data, error } = await client
      .from('backlinks')
      .select('*')
      .eq('id', backlinkId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Backlink not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch backlink',
    };
  }
}

/**
 * Get all backlinks for an organization
 */
export async function getOrganizationBacklinks(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    includeDeleted?: boolean;
    productId?: string;
    articleId?: string;
    status?: BacklinkStatus;
    linkType?: LinkType;
    minDomainAuthority?: number;
    maxDomainAuthority?: number;
    minPageAuthority?: number;
    maxPageAuthority?: number;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?:
      | 'source_url'
      | 'target_url'
      | 'domain_authority'
      | 'page_authority'
      | 'status'
      | 'link_type'
      | 'first_seen_at'
      | 'last_verified_at'
      | 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<BacklinkResult<Backlink[]>> {
  try {
    let query = client
      .from('backlinks')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.articleId) {
      query = query.eq('article_id', options.articleId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.linkType) {
      query = query.eq('link_type', options.linkType);
    }

    if (options.minDomainAuthority !== undefined) {
      query = query.gte('domain_authority', options.minDomainAuthority);
    }

    if (options.maxDomainAuthority !== undefined) {
      query = query.lte('domain_authority', options.maxDomainAuthority);
    }

    if (options.minPageAuthority !== undefined) {
      query = query.gte('page_authority', options.minPageAuthority);
    }

    if (options.maxPageAuthority !== undefined) {
      query = query.lte('page_authority', options.maxPageAuthority);
    }

    if (options.search) {
      query = query.or(
        `source_url.ilike.%${options.search}%,target_url.ilike.%${options.search}%,anchor_text.ilike.%${options.search}%`
      );
    }

    if (options.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }

    // Apply sorting
    const sortColumn = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

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
    if (!data) throw new Error('No backlinks found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch backlinks',
    };
  }
}

/**
 * Get all backlinks for a product
 */
export async function getProductBacklinks(
  client: SupabaseClient<Database>,
  productId: string,
  options: {
    includeDeleted?: boolean;
    status?: BacklinkStatus;
    limit?: number;
  } = {}
): Promise<BacklinkResult<Backlink[]>> {
  try {
    let query = client
      .from('backlinks')
      .select('*')
      .eq('product_id', productId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('domain_authority', {
      ascending: false,
      nullsFirst: false,
    });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No backlinks found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch backlinks',
    };
  }
}

/**
 * Get all backlinks for an article
 */
export async function getArticleBacklinks(
  client: SupabaseClient<Database>,
  articleId: string,
  options: {
    includeDeleted?: boolean;
    status?: BacklinkStatus;
    limit?: number;
  } = {}
): Promise<BacklinkResult<Backlink[]>> {
  try {
    let query = client
      .from('backlinks')
      .select('*')
      .eq('article_id', articleId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('domain_authority', {
      ascending: false,
      nullsFirst: false,
    });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No backlinks found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch backlinks',
    };
  }
}

/**
 * Create a new backlink
 */
export async function createBacklink(
  client: SupabaseClient<Database>,
  backlink: BacklinkInsert
): Promise<BacklinkResult<Backlink>> {
  try {
    const { data, error } = await client
      .from('backlinks')
      .insert({
        organization_id: backlink.organization_id,
        product_id: backlink.product_id || null,
        article_id: backlink.article_id || null,
        source_url: backlink.source_url,
        target_url: backlink.target_url,
        domain_authority: backlink.domain_authority || null,
        page_authority: backlink.page_authority || null,
        spam_score: backlink.spam_score || null,
        link_type: backlink.link_type || null,
        anchor_text: backlink.anchor_text || null,
        status: backlink.status || DEFAULT_BACKLINK_VALUES.status,
        notes: backlink.notes || null,
        tags: (backlink.tags ||
          DEFAULT_BACKLINK_VALUES.tags) as unknown as Json,
        metadata: (backlink.metadata ||
          DEFAULT_BACKLINK_VALUES.metadata) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create backlink');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create backlink',
    };
  }
}

/**
 * Bulk create backlinks
 */
export async function bulkCreateBacklinks(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId: string | null,
  articleId: string | null,
  backlinks: Array<{
    source_url: string;
    target_url: string;
    domain_authority?: number;
    page_authority?: number;
    spam_score?: number;
    link_type?: LinkType;
    anchor_text?: string;
    tags?: string[];
    notes?: string;
  }>
): Promise<
  BacklinkResult<{ successful: number; failed: number; errors: string[] }>
> {
  const errors: string[] = [];
  let successful = 0;

  for (const bl of backlinks) {
    try {
      const result = await createBacklink(client, {
        organization_id: organizationId,
        product_id: productId || undefined,
        article_id: articleId || undefined,
        source_url: bl.source_url,
        target_url: bl.target_url,
        domain_authority: bl.domain_authority,
        page_authority: bl.page_authority,
        spam_score: bl.spam_score,
        link_type: bl.link_type,
        anchor_text: bl.anchor_text,
        tags: bl.tags,
        notes: bl.notes,
      });

      if (result.success) {
        successful++;
      } else {
        errors.push(`${bl.source_url}: ${result.error}`);
      }
    } catch (error) {
      errors.push(
        `${bl.source_url}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
 * Update a backlink
 */
export async function updateBacklink(
  client: SupabaseClient<Database>,
  backlinkId: string,
  updates: BacklinkUpdate
): Promise<BacklinkResult<Backlink>> {
  try {
    const { data, error } = await client
      .from('backlinks')
      .update(updates)
      .eq('id', backlinkId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Backlink not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update backlink',
    };
  }
}

/**
 * Update backlink status
 */
export async function updateBacklinkStatus(
  client: SupabaseClient<Database>,
  backlinkId: string,
  status: BacklinkStatus
): Promise<BacklinkResult<Backlink>> {
  const updates: BacklinkUpdate = {
    status,
    last_verified_at: new Date().toISOString(),
  };

  if (status === 'lost') {
    updates.lost_at = new Date().toISOString();
  }

  return updateBacklink(client, backlinkId, updates);
}

/**
 * Verify backlink (checks if still active and updates status/last_verified_at)
 */
export async function verifyBacklink(
  client: SupabaseClient<Database>,
  backlinkId: string,
  isActive: boolean
): Promise<BacklinkResult<Backlink>> {
  const updates: BacklinkUpdate = {
    last_verified_at: new Date().toISOString(),
    status: isActive ? 'active' : 'lost',
  };

  if (!isActive) {
    updates.lost_at = new Date().toISOString();
  }

  return updateBacklink(client, backlinkId, updates);
}

/**
 * Soft delete a backlink
 */
export async function softDeleteBacklink(
  client: SupabaseClient<Database>,
  backlinkId: string
): Promise<BacklinkResult<void>> {
  try {
    const { error } = await client
      .from('backlinks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', backlinkId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete backlink',
    };
  }
}

/**
 * Permanently delete a backlink (use with caution)
 */
export async function deleteBacklink(
  client: SupabaseClient<Database>,
  backlinkId: string
): Promise<BacklinkResult<void>> {
  try {
    const { error } = await client
      .from('backlinks')
      .delete()
      .eq('id', backlinkId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete backlink',
    };
  }
}

/**
 * Check if a user can access a backlink (via organization membership)
 */
export async function canUserAccessBacklink(
  client: SupabaseClient<Database>,
  backlinkId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_backlink', {
      p_backlink_id: backlinkId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get backlink statistics for an organization
 */
export async function getBacklinkStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string,
  articleId?: string
): Promise<
  BacklinkResult<{
    total: number;
    byStatus: Record<BacklinkStatus, number>;
    byLinkType: Record<string, number>;
    avgDomainAuthority: number;
    totalReferringDomains: number;
  }>
> {
  try {
    let query = client
      .from('backlinks')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (articleId) {
      query = query.eq('article_id', articleId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No backlinks found');

    const byStatus: Record<BacklinkStatus, number> = {
      pending: 0,
      active: 0,
      lost: 0,
      disavowed: 0,
      spam: 0,
    };

    const byLinkType: Record<string, number> = {
      dofollow: 0,
      nofollow: 0,
      sponsored: 0,
      ugc: 0,
      unknown: 0,
    };

    let totalDomainAuthority = 0;
    let domainAuthorityCount = 0;
    const referringDomains = new Set<string>();

    for (const backlink of data) {
      byStatus[backlink.status as BacklinkStatus]++;

      const linkType = backlink.link_type || 'unknown';
      if (byLinkType[linkType] !== undefined) {
        byLinkType[linkType]++;
      } else {
        byLinkType.unknown++;
      }

      if (backlink.domain_authority !== null) {
        totalDomainAuthority += backlink.domain_authority;
        domainAuthorityCount++;
      }

      // Extract domain from source_url for referring domains count
      try {
        const url = new URL(backlink.source_url);
        referringDomains.add(url.hostname);
      } catch {
        // Invalid URL, skip
      }
    }

    return {
      success: true,
      data: {
        total: data.length,
        byStatus,
        byLinkType,
        avgDomainAuthority:
          domainAuthorityCount > 0
            ? totalDomainAuthority / domainAuthorityCount
            : 0,
        totalReferringDomains: referringDomains.size,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch backlink stats',
    };
  }
}

/**
 * Validate backlink data
 */
export function validateBacklink(backlink: {
  source_url?: string;
  target_url?: string;
  domain_authority?: number;
  page_authority?: number;
  spam_score?: number;
  anchor_text?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (backlink.source_url !== undefined) {
    try {
      new URL(backlink.source_url);
    } catch {
      errors.push('Source URL must be a valid URL');
    }
  }

  if (backlink.target_url !== undefined) {
    try {
      new URL(backlink.target_url);
    } catch {
      errors.push('Target URL must be a valid URL');
    }
  }

  if (
    backlink.domain_authority !== undefined &&
    (typeof backlink.domain_authority !== 'number' ||
      backlink.domain_authority < 0 ||
      backlink.domain_authority > 100)
  ) {
    errors.push('Domain authority must be a number between 0 and 100');
  }

  if (
    backlink.page_authority !== undefined &&
    (typeof backlink.page_authority !== 'number' ||
      backlink.page_authority < 0 ||
      backlink.page_authority > 100)
  ) {
    errors.push('Page authority must be a number between 0 and 100');
  }

  if (
    backlink.spam_score !== undefined &&
    (typeof backlink.spam_score !== 'number' ||
      backlink.spam_score < 0 ||
      backlink.spam_score > 1)
  ) {
    errors.push('Spam score must be a number between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

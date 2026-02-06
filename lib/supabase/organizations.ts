// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Organizations Utilities
 *
 * Helper functions for working with organizations and organization members.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Organization = Database['public']['Tables']['organizations']['Row'];
type OrganizationInsert =
  Database['public']['Tables']['organizations']['Insert'];
type OrganizationUpdate =
  Database['public']['Tables']['organizations']['Update'];
type OrganizationMember =
  Database['public']['Tables']['organization_members']['Row'];
type OrganizationMemberInsert =
  Database['public']['Tables']['organization_members']['Insert'];
type OrganizationMemberUpdate =
  Database['public']['Tables']['organization_members']['Update'];

type OrganizationTier = 'free' | 'starter' | 'pro' | 'agency';
type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Result type for organization operations
 */
export type OrganizationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get an organization by ID
 */
export async function getOrganizationById(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<OrganizationResult<Organization>> {
  try {
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Organization not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch organization',
    };
  }
}

/**
 * Get an organization by slug
 */
export async function getOrganizationBySlug(
  client: SupabaseClient<Database>,
  slug: string
): Promise<OrganizationResult<Organization>> {
  try {
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Organization not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch organization',
    };
  }
}

/**
 * Get an organization by Stripe customer ID
 */
export async function getOrganizationByStripeCustomerId(
  client: SupabaseClient<Database>,
  stripeCustomerId: string
): Promise<OrganizationResult<Organization>> {
  try {
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Organization not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch organization',
    };
  }
}

/**
 * Get all organizations for a user (using the database function)
 */
export async function getUserOrganizations(
  client: SupabaseClient<Database>,
  userId: string
): Promise<
  OrganizationResult<Array<Organization & { role: OrganizationRole }>>
> {
  try {
    const { data, error } = await client.rpc(
      'get_user_organizations' as never,
      {
        p_user_id: userId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('No organizations found');

    return {
      success: true,
      data: data as Array<Organization & { role: OrganizationRole }>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch user organizations',
    };
  }
}

/**
 * Create a new organization
 */
export async function createOrganization(
  client: SupabaseClient<Database>,
  organization: OrganizationInsert & { ownerId: string }
): Promise<OrganizationResult<Organization>> {
  try {
    // Start a transaction by creating the organization first
    const { data: orgData, error: orgError } = await client
      .from('organizations')
      .insert({
        name: organization.name,
        slug: organization.slug,
        clerk_id: organization.clerk_id || null,
        image_url: organization.image_url || null,
        stripe_customer_id: organization.stripe_customer_id || null,
        tier: organization.tier || 'free',
        settings: organization.settings || {},
      })
      .select()
      .single();

    if (orgError) throw orgError;
    if (!orgData) throw new Error('Failed to create organization');

    // Add the owner as a member
    const { error: memberError } = await client
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: organization.ownerId,
        role: 'owner',
      });

    if (memberError) throw memberError;

    return { success: true, data: orgData };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create organization',
    };
  }
}

/**
 * Update an organization
 */
export async function updateOrganization(
  client: SupabaseClient<Database>,
  organizationId: string,
  updates: OrganizationUpdate
): Promise<OrganizationResult<Organization>> {
  try {
    const { data, error } = await client
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Organization not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update organization',
    };
  }
}

/**
 * Delete an organization
 */
export async function deleteOrganization(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<OrganizationResult<void>> {
  try {
    const { error } = await client
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete organization',
    };
  }
}

/**
 * Update organization tier
 */
export async function updateOrganizationTier(
  client: SupabaseClient<Database>,
  organizationId: string,
  tier: OrganizationTier
): Promise<OrganizationResult<Organization>> {
  return updateOrganization(client, organizationId, { tier });
}

/**
 * Update organization settings
 */
export async function updateOrganizationSettings(
  client: SupabaseClient<Database>,
  organizationId: string,
  settings: Database['public']['Tables']['organizations']['Row']['settings']
): Promise<OrganizationResult<Organization>> {
  return updateOrganization(client, organizationId, { settings });
}

/**
 * Get members of an organization
 */
export async function getOrganizationMembers(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<OrganizationResult<OrganizationMember[]>> {
  try {
    const { data, error } = await client
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) throw error;
    if (!data) throw new Error('No members found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch organization members',
    };
  }
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  role: OrganizationRole = 'member'
): Promise<OrganizationResult<OrganizationMember>> {
  try {
    const { data, error } = await client
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to add member');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to add organization member',
    };
  }
}

/**
 * Update a member's role in an organization
 */
export async function updateOrganizationMemberRole(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  role: OrganizationRole
): Promise<OrganizationResult<OrganizationMember>> {
  try {
    const { data, error } = await client
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Member not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update member role',
    };
  }
}

/**
 * Remove a member from an organization
 */
export async function removeOrganizationMember(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<OrganizationResult<void>> {
  try {
    const { error } = await client
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to remove organization member',
    };
  }
}

/**
 * Check if a user is a member of an organization
 */
export async function isOrganizationMember(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('is_organization_member', {
      p_org_id: organizationId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get a user's role in an organization
 */
export async function getOrganizationRole(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<OrganizationRole | null> {
  try {
    const result = await client.rpc<OrganizationRole>('get_organization_role', {
      p_org_id: organizationId,
      p_user_id: userId,
    });

    return result.data || null;
  } catch {
    return null;
  }
}

/**
 * Check if a user has a specific role or higher in an organization
 */
export async function hasOrganizationRole(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  minRole: OrganizationRole
): Promise<boolean> {
  const roleHierarchy: Record<OrganizationRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4,
  };

  const role = await getOrganizationRole(client, organizationId, userId);

  if (!role) return false;

  return roleHierarchy[role] >= roleHierarchy[minRole];
}

/**
 * Generate a unique slug for an organization
 */
export async function generateUniqueSlug(
  client: SupabaseClient<Database>,
  name: string
): Promise<string> {
  // Convert to URL-friendly slug
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Check if slug exists and add suffix if needed
  let suffix = 0;
  let uniqueSlug = slug;
  const MAX_ATTEMPTS = 100; // Prevent infinite loops

  while (suffix < MAX_ATTEMPTS) {
    const { data } = await client
      .from('organizations')
      .select('slug')
      .eq('slug', uniqueSlug)
      .maybeSingle();

    if (!data) {
      return uniqueSlug;
    }

    suffix++;
    uniqueSlug = `${slug}-${suffix}`;
  }

  throw new Error(
    `Unable to generate unique slug after ${MAX_ATTEMPTS} attempts. Last attempted: ${uniqueSlug}`
  );
}

/**
 * Validate organization settings
 */
export function validateOrganizationSettings(
  settings: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Define allowed settings keys
  const allowedKeys = [
    'branding',
    'notifications',
    'integrations',
    'limits',
    'features',
  ];

  // Check for unknown keys
  for (const key of Object.keys(settings)) {
    if (!allowedKeys.includes(key)) {
      errors.push(`Unknown setting key: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Default settings for new organizations
 */
export const DEFAULT_ORGANIZATION_SETTINGS: Database['public']['Tables']['organizations']['Row']['settings'] =
  {
    branding: {
      logo: null,
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
    },
    notifications: {
      email: true,
      push: false,
      weekly: true,
    },
    integrations: {
      slack: null,
      discord: null,
    },
    limits: {
      projects: 3,
      members: 5,
      storage: 1024, // MB
    },
    features: {
      analytics: false,
      customDomain: false,
      apiAccess: false,
    },
  };

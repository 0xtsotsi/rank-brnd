// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Team Members Utilities
 *
 * Helper functions for working with team members within organizations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type TeamMember = Database['public']['Tables']['team_members']['Row'];
type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert'];
type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update'];

export type TeamMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * Result type for team member operations
 */
export type TeamMemberResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Extended team member info with user details
 */
export type TeamMemberWithUser = TeamMember & {
  user: {
    id: string;
    clerk_id: string;
    email: string;
    name: string;
    avatar_url: string | null;
  };
};

/**
 * Get all team members for an organization
 */
export async function getTeamMembersByOrganization(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: { includePending?: boolean } = {}
): Promise<TeamMemberResult<TeamMemberWithUser[]>> {
  try {
    const { data, error } = await client
      .from('team_members')
      .select(
        `
        *,
        user:user_id (
          id,
          clerk_id,
          email,
          name,
          avatar_url
        )
      `
      )
      .eq('organization_id', organizationId)
      .order('invited_at', { ascending: false });

    if (error) throw error;
    if (!data) throw new Error('No team members found');

    // Filter out pending invitations if requested
    let filteredData = data as TeamMemberWithUser[];
    if (!options.includePending) {
      filteredData = filteredData.filter((tm) => tm.accepted_at !== null);
    }

    return { success: true, data: filteredData };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch team members',
    };
  }
}

/**
 * Get team members for an organization using the database function
 */
export async function getOrganizationTeamMembers(
  client: SupabaseClient<Database>,
  organizationId: string,
  includePending = true
): Promise<
  TeamMemberResult<
    Array<{
      id: string;
      user_id: string;
      email: string;
      name: string;
      avatar_url: string | null;
      role: TeamMemberRole;
      invited_at: string;
      accepted_at: string | null;
      is_pending: boolean;
    }>
  >
> {
  try {
    const { data, error } = await client.rpc(
      'get_organization_team_members' as never,
      {
        p_organization_id: organizationId,
        p_include_pending: includePending,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('No team members found');

    return {
      success: true,
      data: data as Array<{
        id: string;
        user_id: string;
        email: string;
        name: string;
        avatar_url: string | null;
        role: TeamMemberRole;
        invited_at: string;
        accepted_at: string | null;
        is_pending: boolean;
      }>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch team members',
    };
  }
}

/**
 * Get a single team member by ID
 */
export async function getTeamMemberById(
  client: SupabaseClient<Database>,
  teamMemberId: string
): Promise<TeamMemberResult<TeamMember>> {
  try {
    const { data, error } = await client
      .from('team_members')
      .select('*')
      .eq('id', teamMemberId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Team member not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch team member',
    };
  }
}

/**
 * Get a team member by organization and user
 */
export async function getTeamMemberByOrgAndUser(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<TeamMemberResult<TeamMember>> {
  try {
    const { data, error } = await client
      .from('team_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Team member not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch team member',
    };
  }
}

/**
 * Add a team member to an organization
 */
export async function addTeamMember(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  role: TeamMemberRole = 'viewer'
): Promise<TeamMemberResult<TeamMember>> {
  try {
    // Use the database function which handles upsert
    const { data, error } = await client.rpc(
      'add_team_member' as never,
      {
        p_organization_id: organizationId,
        p_user_id: userId,
        p_role: role,
      } as never
    );

    if (error) throw error;

    // Fetch the created/updated record
    const result = await getTeamMemberByOrgAndUser(
      client,
      organizationId,
      userId
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to add team member',
    };
  }
}

/**
 * Accept a team invitation
 */
export async function acceptTeamInvitation(
  client: SupabaseClient<Database>,
  teamMemberId: string,
  userId: string
): Promise<TeamMemberResult<TeamMember>> {
  try {
    const { data, error } = await client.rpc(
      'accept_team_invitation' as never,
      {
        p_team_member_id: teamMemberId,
        p_user_id: userId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to accept invitation');

    // Fetch the updated record
    const result = await getTeamMemberById(client, teamMemberId);
    if (!result.success) {
      throw new Error(result.error);
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to accept team invitation',
    };
  }
}

/**
 * Update a team member's role
 */
export async function updateTeamMemberRole(
  client: SupabaseClient<Database>,
  teamMemberId: string,
  newRole: TeamMemberRole,
  requestingUserId: string
): Promise<TeamMemberResult<TeamMember>> {
  try {
    const { data, error } = await client.rpc(
      'update_team_member_role' as never,
      {
        p_team_member_id: teamMemberId,
        p_new_role: newRole,
        p_requesting_user_id: requestingUserId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to update team member role');

    // Fetch the updated record
    const result = await getTeamMemberById(client, teamMemberId);
    if (!result.success) {
      throw new Error(result.error);
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update team member role',
    };
  }
}

/**
 * Remove a team member from an organization
 */
export async function removeTeamMember(
  client: SupabaseClient<Database>,
  teamMemberId: string,
  requestingUserId: string
): Promise<TeamMemberResult<void>> {
  try {
    const { data, error } = await client.rpc(
      'remove_team_member' as never,
      {
        p_team_member_id: teamMemberId,
        p_requesting_user_id: requestingUserId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to remove team member');

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to remove team member',
    };
  }
}

/**
 * Get user's team memberships
 */
export async function getUserTeamMemberships(
  client: SupabaseClient<Database>,
  userId: string
): Promise<
  TeamMemberResult<
    Array<{
      id: string;
      organization_id: string;
      organization_name: string;
      role: TeamMemberRole;
      invited_at: string;
      accepted_at: string | null;
      is_pending: boolean;
    }>
  >
> {
  try {
    const { data, error } = await client.rpc(
      'get_user_team_memberships' as never,
      {
        p_user_id: userId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('No team memberships found');

    return {
      success: true,
      data: data as Array<{
        id: string;
        organization_id: string;
        organization_name: string;
        role: TeamMemberRole;
        invited_at: string;
        accepted_at: string | null;
        is_pending: boolean;
      }>,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch team memberships',
    };
  }
}

/**
 * Check if user has a specific team role in an organization
 */
export async function hasTeamRole(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  requiredRoles: TeamMemberRole[]
): Promise<boolean> {
  try {
    const result = await client.rpc('has_team_role', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_required_roles: requiredRoles,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get user's team role in an organization
 */
export async function getTeamRole(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string
): Promise<TeamMemberRole | null> {
  try {
    const result = await client.rpc<TeamMemberRole>('get_team_role', {
      p_organization_id: organizationId,
      p_user_id: userId,
    });

    return result.data || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has at least a minimum role level in an organization
 */
export async function hasMinTeamRole(
  client: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  minRole: TeamMemberRole
): Promise<boolean> {
  const roleHierarchy: Record<TeamMemberRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
    owner: 4,
  };

  const role = await getTeamRole(client, organizationId, userId);

  if (!role) return false;

  return roleHierarchy[role] >= roleHierarchy[minRole];
}

/**
 * Get pending invitations for an organization
 */
export async function getPendingInvitations(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<TeamMemberResult<TeamMemberWithUser[]>> {
  try {
    const { data, error } = await client
      .from('team_members')
      .select(
        `
        *,
        user:user_id (
          id,
          clerk_id,
          email,
          name,
          avatar_url
        )
      `
      )
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .order('invited_at', { ascending: false });

    if (error) throw error;
    if (!data) throw new Error('No pending invitations found');

    return { success: true, data: data as TeamMemberWithUser[] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch pending invitations',
    };
  }
}

/**
 * Count team members in an organization
 */
export async function countTeamMembers(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: { includePending?: boolean } = {}
): Promise<TeamMemberResult<number>> {
  try {
    let query = client
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (!options.includePending) {
      query = query.not('accepted_at', 'is', null);
    }

    const { count, error } = await query;

    if (error) throw error;

    return { success: true, data: count || 0 };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to count team members',
    };
  }
}

/**
 * Validate team member role
 */
export function isValidTeamRole(role: string): role is TeamMemberRole {
  return ['owner', 'admin', 'editor', 'viewer'].includes(role);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: TeamMemberRole): string {
  const displayNames: Record<TeamMemberRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
  };

  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: TeamMemberRole): string {
  const descriptions: Record<TeamMemberRole, string> = {
    owner: 'Full access to all settings and can manage team members',
    admin: 'Can manage team members and access all organization resources',
    editor: 'Can create and edit content within the organization',
    viewer: 'Read-only access to organization resources',
  };

  return descriptions[role] || '';
}

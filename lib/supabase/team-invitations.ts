/**
 * Team Invitations Utilities
 *
 * Helper functions for working with team invitations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type TeamInvitation = Database['public']['Tables']['team_invitations']['Row'];
type TeamInvitationInsert =
  Database['public']['Tables']['team_invitations']['Insert'];
type TeamInvitationUpdate =
  Database['public']['Tables']['team_invitations']['Update'];

export type TeamMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type TeamInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

/**
 * Result type for team invitation operations
 */
export type TeamInvitationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Extended team invitation info with organization and inviter details
 */
export type TeamInvitationWithDetails = TeamInvitation & {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  invited_by: {
    id: string;
    name: string;
    email: string;
  };
};

/**
 * Invitation validation result
 */
export type InvitationValidationResult = {
  id: string;
  organization_id: string;
  email: string;
  role: TeamMemberRole;
  invited_by_user_id: string;
  is_valid: boolean;
};

/**
 * Create a team invitation
 */
export async function createTeamInvitation(
  client: SupabaseClient<Database>,
  organizationId: string,
  email: string,
  role: TeamMemberRole = 'viewer',
  invitedByUserId: string
): Promise<TeamInvitationResult<TeamInvitation>> {
  try {
    // Use the database function which handles upsert
    const { data, error } = await client.rpc(
      'create_team_invitation' as never,
      {
        p_organization_id: organizationId,
        p_email: email,
        p_role: role,
        p_invited_by_user_id: invitedByUserId,
      } as never
    );

    if (error) throw error;

    // Fetch the created/updated record
    const { data: invitation, error: fetchError } = await client
      .from('team_invitations')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;
    if (!invitation) throw new Error('Failed to create invitation');

    return { success: true, data: invitation };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create team invitation',
    };
  }
}

/**
 * Validate an invitation token
 */
export async function validateInvitationToken(
  client: SupabaseClient<Database>,
  token: string
): Promise<TeamInvitationResult<InvitationValidationResult>> {
  try {
    const { data, error } = (await client.rpc(
      'validate_invitation_token' as never,
      {
        p_token: token,
      } as never
    )) as { data: InvitationValidationResult[] | null; error: any };

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Invalid invitation token');
    }

    const result = data[0] as InvitationValidationResult;

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate invitation token',
    };
  }
}

/**
 * Accept an invitation by token (creates team member record)
 */
export async function acceptInvitationByToken(
  client: SupabaseClient<Database>,
  token: string,
  userId: string
): Promise<TeamInvitationResult<string>> {
  try {
    const { data, error } = await client.rpc(
      'accept_team_invitation_by_token' as never,
      {
        p_token: token,
        p_user_id: userId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to accept invitation');

    return { success: true, data: data as string };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to accept invitation',
    };
  }
}

/**
 * Cancel a team invitation
 */
export async function cancelTeamInvitation(
  client: SupabaseClient<Database>,
  invitationId: string,
  requestingUserId: string
): Promise<TeamInvitationResult<void>> {
  try {
    const { data, error } = await client.rpc(
      'cancel_team_invitation' as never,
      {
        p_invitation_id: invitationId,
        p_requesting_user_id: requestingUserId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to cancel invitation');

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to cancel invitation',
    };
  }
}

/**
 * Get pending invitations for an organization
 */
export async function getPendingInvitations(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<
  TeamInvitationResult<
    Array<{
      id: string;
      email: string;
      role: TeamMemberRole;
      token: string;
      invited_by_user_id: string;
      invited_by_name: string;
      invited_by_email: string;
      expires_at: string;
      created_at: string;
    }>
  >
> {
  try {
    const { data, error } = await client.rpc(
      'get_organization_pending_invitations' as never,
      {
        p_organization_id: organizationId,
      } as never
    );

    if (error) throw error;
    if (!data) throw new Error('No pending invitations found');

    return {
      success: true,
      data: data as Array<{
        id: string;
        email: string;
        role: TeamMemberRole;
        token: string;
        invited_by_user_id: string;
        invited_by_name: string;
        invited_by_email: string;
        expires_at: string;
        created_at: string;
      }>,
    };
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
 * Get invitation by token (for validation during signup)
 */
export async function getInvitationByToken(
  client: SupabaseClient<Database>,
  token: string
): Promise<TeamInvitationResult<TeamInvitationWithDetails>> {
  try {
    const { data, error } = await client
      .from('team_invitations')
      .select(
        `
        *,
        organization:organization_id (
          id,
          name,
          slug
        ),
        invited_by:invited_by_user_id (
          id,
          name,
          email
        )
      `
      )
      .eq('token', token)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invitation not found');

    return { success: true, data: data as TeamInvitationWithDetails };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch invitation',
    };
  }
}

/**
 * Get pending invitation by email
 */
export async function getPendingInvitationsByEmail(
  client: SupabaseClient<Database>,
  email: string
): Promise<TeamInvitationResult<TeamInvitationWithDetails[]>> {
  try {
    const { data, error } = await client
      .from('team_invitations')
      .select(
        `
        *,
        organization:organization_id (
          id,
          name,
          slug
        ),
        invited_by:invited_by_user_id (
          id,
          name,
          email
        )
      `
      )
      .eq('email', email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) throw new Error('No invitations found');

    return { success: true, data: data as TeamInvitationWithDetails[] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch invitations',
    };
  }
}

/**
 * Mark expired invitations as expired
 */
export async function expireOldInvitations(
  client: SupabaseClient<Database>
): Promise<TeamInvitationResult<number>> {
  try {
    const { data, error } = await client.rpc('expire_old_invitations' as never);

    if (error) throw error;

    return { success: true, data: (data as number) ?? 0 };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to expire old invitations',
    };
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Get invitation status display name
 */
export function getInvitationStatusDisplayName(
  status: TeamInvitationStatus
): string {
  const displayNames: Record<TeamInvitationStatus, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };

  return displayNames[status] || status;
}

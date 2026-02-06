// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Team Members API Route
 * Handles CRUD operations for team members within organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getOrganizationTeamMembers,
  addTeamMember,
  removeTeamMember,
  getUserTeamMemberships,
  getPendingInvitations,
  hasMinTeamRole,
} from '@/lib/supabase/team-members';
import {
  teamMembersQuerySchema,
  teamMembersPostSchema,
} from '@/lib/schemas/team-members';
import { ZodError } from 'zod';

/**
 * GET /api/team-members
 * Fetch team members with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Check if this is a request for pending invitations or user memberships
    const path = request.nextUrl.pathname;

    if (path.endsWith('/pending')) {
      // Get pending invitations for an organization
      const organizationId = searchParams.get('organization_id');
      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id is required' },
          { status: 400 }
        );
      }

      const client = getSupabaseServerClient();

      // Verify user has admin or owner role
      const hasAccess = await hasMinTeamRole(
        client,
        organizationId,
        userId,
        'admin'
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      const result = await getPendingInvitations(client, organizationId);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        invitations: result.data,
        total: result.data.length,
      });
    }

    if (path.endsWith('/memberships')) {
      // Get user's team memberships
      const client = getSupabaseServerClient();
      const result = await getUserTeamMemberships(client, userId);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        memberships: result.data,
        total: result.data.length,
      });
    }

    // Parse and validate query parameters
    const queryParams = {
      organization_id: searchParams.get('organization_id') || undefined,
      include_pending: searchParams.get('include_pending') === 'true',
      role: searchParams.get('role') as
        | 'owner'
        | 'admin'
        | 'editor'
        | 'viewer'
        | null,
      sort:
        (searchParams.get('sort') as
          | 'invited_at'
          | 'accepted_at'
          | 'role'
          | 'name') || 'invited_at',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
    };

    const validatedParams = teamMembersQuerySchema.parse(queryParams);

    // Verify user is a member of the organization
    const client = getSupabaseServerClient();
    const isMember = await hasMinTeamRole(
      client,
      validatedParams.organization_id,
      userId,
      'viewer'
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    const result = await getOrganizationTeamMembers(
      client,
      validatedParams.organization_id,
      validatedParams.include_pending
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Filter by role if specified
    let filteredData = result.data;
    if (validatedParams.role) {
      filteredData = filteredData.filter(
        (tm) => tm.role === validatedParams.role
      );
    }

    // Sort the data
    filteredData.sort((a, b) => {
      const aValue = a[validatedParams.sort];
      const bValue = b[validatedParams.sort];

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue < bValue) return validatedParams.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return validatedParams.order === 'asc' ? 1 : -1;
      return 0;
    });

    return NextResponse.json({
      team_members: filteredData,
      total: filteredData.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team-members
 * Add a team member or bulk invite members
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = teamMembersPostSchema.parse(body);

    const client = getSupabaseServerClient();

    // Verify user has admin or owner role in the organization
    const hasAccess = await hasMinTeamRole(
      client,
      validatedData.organization_id,
      userId,
      'admin'
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to add team members' },
        { status: 403 }
      );
    }

    if (validatedData.bulk && validatedData.members) {
      // Bulk invite
      const results = await Promise.allSettled(
        validatedData.members.map((member) =>
          addTeamMember(
            client,
            validatedData.organization_id,
            member.user_id,
            member.role
          )
        )
      );

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;
      const failed = results.filter(
        (r) =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && !r.value.success)
      ).length;

      return NextResponse.json({
        total: validatedData.members.length,
        successful,
        failed,
      });
    }

    // Single team member addition
    const result = await addTeamMember(
      client,
      validatedData.organization_id,
      validatedData.user_id,
      validatedData.role
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team-members?team_member_id=<id>
 * Remove a team member
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('team_member_id');

    if (!teamMemberId) {
      return NextResponse.json(
        { error: 'Team member ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Remove team member (permissions are checked inside the function)
    const result = await removeTeamMember(client, teamMemberId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}

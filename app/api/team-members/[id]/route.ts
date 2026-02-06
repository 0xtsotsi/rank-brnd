// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Individual Team Member API Route
 * Handles operations for a specific team member
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getTeamMemberById,
  updateTeamMemberRole,
  removeTeamMember,
  acceptTeamInvitation,
} from '@/lib/supabase/team-members';
import { updateTeamMemberSchema } from '@/lib/schemas/team-members';
import { ZodError } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/team-members/[id]
 * Get a specific team member
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const teamMemberId = params.id;

    const client = getSupabaseServerClient();

    // Get the team member
    const result = await getTeamMemberById(client, teamMemberId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // Verify user has access to this organization
    const { data: member } = result;

    // Check if user is the member being requested or has admin/owner role
    const { data: userRecord } = await client
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    const isOwnMembership = userRecord && userRecord.id === member.user_id;
    const { data: ownTeamMembership } = await client
      .from('team_members')
      .select('role')
      .eq('organization_id', member.organization_id)
      .eq('user_id', userRecord?.id || '')
      .maybeSingle();

    const isAdmin =
      ownTeamMembership && ['admin', 'owner'].includes(ownTeamMembership.role);

    if (!isOwnMembership && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Get user details
    const { data: userData } = await client
      .from('users')
      .select('id, clerk_id, email, name, avatar_url')
      .eq('id', member.user_id)
      .single();

    return NextResponse.json({
      ...member,
      user: userData,
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team member' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/team-members/[id]
 * Update a team member's role
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const teamMemberId = params.id;

    const body = await request.json();
    const validatedData = updateTeamMemberSchema.parse(body);

    if (!validatedData.role) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Update team member role (permissions are checked inside the function)
    const result = await updateTeamMemberRole(
      client,
      teamMemberId,
      validatedData.role,
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        {
          status:
            result.error.includes('permission') ||
            result.error.includes('Forbidden')
              ? 403
              : 500,
        }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team-members/[id]
 * Remove a team member
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const teamMemberId = params.id;

    const client = getSupabaseServerClient();

    // Remove team member (permissions are checked inside the function)
    const result = await removeTeamMember(client, teamMemberId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        {
          status:
            result.error.includes('permission') ||
            result.error.includes('Forbidden')
              ? 403
              : 500,
        }
      );
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

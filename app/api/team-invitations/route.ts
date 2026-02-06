// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Team Invitations API Route
 * Handles CRUD operations for team invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getPendingInvitations,
  createTeamInvitation,
} from '@/lib/supabase/team-invitations';
import {
  pendingInvitationsQuerySchema,
  createTeamInvitationSchema,
} from '@/lib/schemas/team-invitations';
import { hasMinTeamRole } from '@/lib/supabase/team-members';

/**
 * GET /api/team-invitations
 * Fetch team invitations with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = request.nextUrl.pathname;

    // Check if this is a request for pending invitations
    if (path.endsWith('/pending')) {
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
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      const result = await getPendingInvitations(client, organizationId);

      return NextResponse.json(result.success ? result.data : []);
    }

    // Get all invitations for organization
    const organizationId = searchParams.get('organization_id');
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();
    const result = await getPendingInvitations(client, organizationId);

    return NextResponse.json(result.success ? result.data : []);
  } catch (error) {
    console.error('Error fetching team invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team-invitations
 * Create team invitation
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createTeamInvitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error },
        { status: 400 }
      );
    }

    const { organization_id, email, role } = result.data;
    const client = getSupabaseServerClient();

    // Verify user has admin or owner role
    const hasAccess = await hasMinTeamRole(
      client,
      organization_id,
      userId,
      'admin'
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const invitationResult = await createTeamInvitation(
      client,
      organization_id,
      email,
      role,
      userId
    );

    if (!invitationResult.success) {
      return NextResponse.json(
        { error: invitationResult.error || 'Failed to create invitation' },
        { status: 400 }
      );
    }

    return NextResponse.json(invitationResult.data, { status: 201 });
  } catch (error) {
    console.error('Error creating team invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team-invitations/[id]
 * Cancel team invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');
    const client = getSupabaseServerClient();

    // First fetch the invitation to get the organization ID
    const { data: invitation } = await client
      .from('team_invitations')
      .select('organization_id')
      .eq('id', invitationId)
      .single();

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const hasAccess = await hasMinTeamRole(
      client,
      invitation.organization_id,
      userId,
      'admin'
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Call the correct function with invitationId
    // TODO: Implement cancelTeamInvitation properly
    return NextResponse.json({
      success: true,
      message: 'Cancellation not implemented yet',
    });
  } catch (error) {
    console.error('Error cancelling team invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

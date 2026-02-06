// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Accept Team Invitation API Route
 * Handles accepting team invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  acceptTeamInvitation,
  getTeamMemberById,
} from '@/lib/supabase/team-members';
import { acceptTeamInvitationSchema } from '@/lib/schemas/team-members';
import { ZodError } from 'zod';

/**
 * POST /api/team-members/accept
 * Accept a team invitation
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = acceptTeamInvitationSchema.parse(body);

    const client = getSupabaseServerClient();

    // First, verify the team member exists and belongs to the user
    const memberResult = await getTeamMemberById(
      client,
      validatedData.team_member_id
    );

    if (!memberResult.success) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Get the user's internal ID
    const { data: userRecord } = await client
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify this invitation belongs to the user
    if (memberResult.data.user_id !== userRecord.id) {
      return NextResponse.json(
        { error: 'Forbidden - This invitation is not for you' },
        { status: 403 }
      );
    }

    // Check if already accepted
    if (memberResult.data.accepted_at) {
      return NextResponse.json(
        { error: 'Invitation already accepted' },
        { status: 400 }
      );
    }

    // Accept the invitation
    const result = await acceptTeamInvitation(
      client,
      validatedData.team_member_id,
      userId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      team_member: result.data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error accepting team invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept team invitation' },
      { status: 500 }
    );
  }
}

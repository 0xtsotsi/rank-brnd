/**
 * Accept Invitation by Token API Route
 * Handles accepting team invitations using a token (called after signup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  acceptInvitationByToken,
  validateInvitationToken,
} from '@/lib/supabase/team-invitations';
import { acceptInvitationSchema } from '@/lib/schemas/team-invitations';
import { ZodError } from 'zod';

/**
 * POST /api/team-invitations/accept-by-token
 * Accept a team invitation using a token
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = acceptInvitationSchema.parse(body);

    const client = getSupabaseServerClient();

    // Get the user's internal ID and email
    const { data: userRecord } = await client
      .from('users')
      .select('id, email')
      .eq('clerk_id', userId)
      .single();

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    type UserRecord = { id: string; email: string };
    const userData = userRecord as UserRecord;

    // First validate the token
    const validationResult = await validateInvitationToken(
      client,
      validatedData.token
    );

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    if (!validationResult.data.is_valid) {
      return NextResponse.json(
        { error: 'Invitation is invalid or has expired' },
        { status: 400 }
      );
    }

    // Verify email matches
    if (
      validationResult.data.email.toLowerCase() !== userData.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      );
    }

    // Accept the invitation
    const result = await acceptInvitationByToken(
      client,
      validatedData.token,
      userData.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      team_member_id: result.data,
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

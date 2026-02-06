/**
 * Validate Invitation Token API Route
 * Handles validation of invitation tokens (public endpoint for signup flow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  validateInvitationToken,
  getInvitationByToken,
} from '@/lib/supabase/team-invitations';
import { validateInvitationTokenSchema } from '@/lib/schemas/team-invitations';
import { ZodError } from 'zod';

/**
 * GET /api/team-invitations/validate?token=<token>
 * Validate an invitation token and return invitation details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const validatedData = validateInvitationTokenSchema.parse({ token });

    const client = getSupabaseServerClient();

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

    // If valid, get the full invitation details
    const invitationResult = await getInvitationByToken(
      client,
      validatedData.token
    );

    if (!invitationResult.success) {
      return NextResponse.json(
        { error: invitationResult.error },
        { status: 404 }
      );
    }

    const invitation = invitationResult.data;

    // Check if invitation is still valid
    const isExpired =
      new Date(invitation.expires_at) < new Date() ||
      invitation.status !== 'pending';

    return NextResponse.json({
      valid: !isExpired && validationResult.data.is_valid,
      invitation: isExpired
        ? undefined
        : {
            organization: {
              id: invitation.organization.id,
              name: invitation.organization.name,
              slug: invitation.organization.slug,
            },
            email: invitation.email,
            role: invitation.role,
            invited_by: {
              name: invitation.invited_by.name,
              email: invitation.invited_by.email,
            },
            expires_at: invitation.expires_at,
          },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid token', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error validating invitation token:', error);
    return NextResponse.json(
      { error: 'Failed to validate invitation token' },
      { status: 500 }
    );
  }
}

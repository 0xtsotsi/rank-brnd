/**
 * Check Invitation Status API Route
 * Public endpoint to check if an email has pending invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { getPendingInvitationsByEmail } from '@/lib/supabase/team-invitations';
import { checkInvitationStatusSchema } from '@/lib/schemas/team-invitations';
import { ZodError } from 'zod';

/**
 * GET /api/team-invitations/check?email=<email>
 * Check if an email has pending team invitations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const validatedData = checkInvitationStatusSchema.parse({ email });

    const client = getSupabaseServerClient();

    const result = await getPendingInvitationsByEmail(
      client,
      validatedData.email
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return only non-sensitive information
    const invitations = result.data.map((inv) => ({
      organization: {
        name: inv.organization.name,
        slug: inv.organization.slug,
      },
      role: inv.role,
      invited_by: inv.invited_by.name,
      expires_at: inv.expires_at,
    }));

    return NextResponse.json({
      has_pending_invitations: invitations.length > 0,
      invitations,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error checking invitation status:', error);
    return NextResponse.json(
      { error: 'Failed to check invitation status' },
      { status: 500 }
    );
  }
}

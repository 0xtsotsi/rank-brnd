/**
 * Auth Session API Route
 *
 * Returns the current user's session information including organization ID.
 * This endpoint is used by client components to get authentication context.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { getUserOrganizations } from '@/lib/supabase/organizations';

/**
 * GET /api/auth/session
 * Get current session information
 */
export async function GET() {
  try {
    const { userId, orgId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', userId: null, orgId: null, organizations: [] },
        { status: 401 }
      );
    }

    let organizations: any[] = [];

    // Fetch user's organizations from Supabase
    try {
      const client = getSupabaseServerClient();
      const orgResult = await getUserOrganizations(client, userId);

      if (orgResult.success && orgResult.data) {
        organizations = orgResult.data.map((org: any) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.role,
          tier: org.tier,
        }));
      }
    } catch (orgError) {
      // Log but don't fail - organizations might not exist yet
      console.error('Error fetching organizations:', orgError);
    }

    return NextResponse.json({
      userId,
      orgId: orgId || (organizations.length > 0 ? organizations[0].id : null),
      organizations,
      email: (sessionClaims as any)?.email,
      fullName:
        (sessionClaims?.metadata as any)?.firstName ||
        sessionClaims?.given_name ||
        (sessionClaims?.metadata as any)?.lastName ||
        sessionClaims?.family_name
          ? `${(sessionClaims?.metadata as any)?.firstName || sessionClaims?.given_name || ''} ${
              (sessionClaims?.metadata as any)?.lastName ||
              sessionClaims?.family_name ||
              ''
            }`.trim()
          : null,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch session',
        userId: null,
        orgId: null,
        organizations: [],
      },
      { status: 500 }
    );
  }
}

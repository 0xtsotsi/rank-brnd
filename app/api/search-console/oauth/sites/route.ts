/**
 * Google Search Console Sites API Route
 *
 * Lists all Google Search Console properties (sites) available to the authenticated user.
 *
 * @endpoint GET /api/search-console/oauth/sites - List available GSC sites
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleSearchConsoleClient } from '@/lib/google-search-console';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { decryptFromIntegration } from '@/lib/oauth/token-storage';
import type { OAuthTokens } from '@/lib/oauth';

/**
 * GET /api/search-console/oauth/sites
 * List all Google Search Console sites available to the user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to access Google Search Console',
        },
        { status: 401 }
      );
    }

    const client = getSupabaseServerClient();

    // Get user's organization
    const { data: orgMember } = await client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!orgMember) {
      return NextResponse.json(
        {
          error: 'No organization found',
          message: 'User is not a member of any organization',
        },
        { status: 404 }
      );
    }

    // Get the Google Search Console integration
    const { data: integration, error: integrationError } = await client
      .from('integrations')
      .select('*')
      .eq('organization_id', (orgMember as any).organization_id)
      .eq('platform', 'google-search-console')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        {
          error: 'Integration not found',
          message: 'Google Search Console is not connected',
        },
        { status: 404 }
      );
    }

    // Decrypt access token
    const accessToken = await decryptFromIntegration(
      (integration as any).auth_token
    );
    const tokens: OAuthTokens = {
      accessToken,
      refreshToken: (integration as any).refresh_token
        ? await decryptFromIntegration((integration as any).refresh_token)
        : null,
      obtainedAt:
        ((integration as any).metadata as any)?.obtained_at ||
        new Date().toISOString(),
    };

    // Create GSC client and fetch sites
    const gscClient = await GoogleSearchConsoleClient.fromTokens(tokens);
    const sites = await gscClient.listSites();

    return NextResponse.json({
      success: true,
      sites,
      total: sites.length,
    });
  } catch (error) {
    console.error('Error fetching Google Search Console sites:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sites',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Google Search Console OAuth Callback API Route
 *
 * Handles the OAuth 2.0 callback from Google.
 * Exchanges authorization code for access and refresh tokens.
 *
 * @endpoint GET /api/search-console/oauth/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { handleOAuthCallback } from '@/lib/oauth';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { encryptForIntegration } from '@/lib/oauth/token-storage';

/**
 * GET /api/search-console/oauth/callback
 * Handle OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=unauthorized', request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors from Google
    if (error) {
      console.error('Google OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/dashboard/integrations?error=${error}&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=missing_code', request.url)
      );
    }

    if (!state) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=missing_state', request.url)
      );
    }

    // Get OAuth credentials from environment
    const clientId =
      process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search-console/oauth/callback`;

    // Validate credentials
    if (!clientId) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/integrations?error=config_missing&field=client_id',
          request.url
        )
      );
    }

    if (!clientSecret) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/integrations?error=config_missing&field=client_secret',
          request.url
        )
      );
    }

    // Exchange authorization code for tokens
    const tokens = await handleOAuthCallback({
      platform: 'google-search-console',
      code,
      state,
      redirectUri,
      clientId,
      clientSecret,
      organizationId: userId,
    });

    // Store the integration in the database
    const client = getSupabaseServerClient();

    // First, get or create the user's default organization
    const { data: orgMember } = await client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!orgMember) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=no_organization', request.url)
      );
    }

    // Check if integration already exists for this org
    const { data: existingIntegration } = await client
      .from('integrations')
      .select('id')
      .eq('organization_id', (orgMember as any).organization_id)
      .eq('platform', 'google-search-console')
      .single();

    // Encrypt tokens for storage
    const encryptedAccessToken = await encryptForIntegration(
      tokens.accessToken
    );
    const encryptedRefreshToken = tokens.refreshToken
      ? await encryptForIntegration(tokens.refreshToken)
      : null;

    if (existingIntegration) {
      // Update existing integration
      await (client as any)
        .from('integrations')
        .update({
          auth_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          auth_type: 'oauth',
          status: 'active',
          updated_at: new Date().toISOString(),
          metadata: {
            ...tokens,
            obtained_at: tokens.obtainedAt,
          },
        })
        .eq('id', (existingIntegration as any).id);
    } else {
      // Create new integration
      await client.from('integrations').insert({
        organization_id: (orgMember as any).organization_id,
        platform: 'google-search-console',
        name: 'Google Search Console',
        description: 'Connect to Google Search Console for search analytics',
        auth_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        auth_type: 'oauth',
        status: 'active',
        config: {},
        metadata: {
          ...tokens,
          obtained_at: tokens.obtainedAt,
        },
      } as any);
    }

    // Redirect to integrations page with success
    return NextResponse.redirect(
      new URL(
        '/dashboard/integrations?success=google_search_console_connected',
        request.url
      )
    );
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?error=oauth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`,
        request.url
      )
    );
  }
}

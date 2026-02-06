/**
 * Google Search Console OAuth Connection API Route
 *
 * Provides endpoints to connect and manage Google Search Console via OAuth 2.0.
 *
 * @endpoint GET /api/search-console/oauth/authorize - Get OAuth authorization URL
 * @endpoint POST /api/search-console/oauth/authorize - Generate OAuth authorization URL
 * @endpoint GET /api/search-console/oauth/callback - Handle OAuth callback
 * @endpoint POST /api/search-console/oauth/refresh - Refresh access token
 * @endpoint GET /api/search-console/oauth/sites - List available sites
 * @endpoint POST /api/search-console/oauth/sync - Sync data from GSC
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  generateAuthorizationUrl,
  handleOAuthCallback,
  getStoredTokens,
} from '@/lib/oauth';
import { GoogleSearchConsoleClient } from '@/lib/google-search-console';
import { getSupabaseServerClient } from '@/lib/supabase/client';

/**
 * GET /api/search-console/oauth/authorize
 * Get OAuth configuration for Google Search Console
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to connect Google Search Console',
        },
        { status: 401 }
      );
    }

    const clientId =
      process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
    const isConfigured = !!clientId;

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search-console/oauth/callback`;

    return NextResponse.json({
      platform: 'google-search-console',
      supportsOAuth: true,
      isConfigured,
      scopes: ['openid', 'https://www.googleapis.com/auth/webmasters.readonly'],
      redirectUri,
    });
  } catch (error) {
    console.error('Google OAuth configuration error:', error);
    return NextResponse.json(
      { error: 'Failed to get OAuth configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search-console/oauth/authorize
 * Generate OAuth authorization URL for Google Search Console
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to connect Google Search Console',
        },
        { status: 401 }
      );
    }

    const clientId =
      process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message:
            'Google OAuth client ID not configured. Please set GOOGLE_CLIENT_ID environment variable.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { redirectUri: customRedirectUri, state: customState } = body;

    const redirectUri =
      customRedirectUri ||
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search-console/oauth/callback`;

    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ];

    const authUrl = await generateAuthorizationUrl({
      platform: 'google-search-console',
      redirectUri,
      clientId,
      scopes,
      state: customState,
    });

    return NextResponse.json({
      success: true,
      platform: 'google-search-console',
      authUrl,
      redirectUri,
      scopes,
    });
  } catch (error) {
    console.error('Google OAuth authorization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate authorization URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

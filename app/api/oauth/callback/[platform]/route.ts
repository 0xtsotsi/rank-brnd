/**
 * OAuth Callback API Route
 *
 * Handles OAuth 2.0 callback for all supported CMS platforms.
 *
 * @endpoint GET /api/oauth/callback/:platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { handleOAuthCallback, supportsOAuth } from '@/lib/oauth';
import type { OAuthTokens } from '@/lib/oauth';

/**
 * GET handler - OAuth callback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to connect an integration',
        },
        { status: 401 }
      );
    }

    const { platform } = await params;

    // Check if platform supports OAuth
    if (!supportsOAuth(platform)) {
      return NextResponse.json(
        {
          error: 'Unsupported platform',
          message: `OAuth is not supported for ${platform}`,
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors from provider
    if (error) {
      return NextResponse.json(
        {
          error: 'OAuth Error',
          message: errorDescription || error,
          platform,
        },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.json(
        {
          error: 'Invalid callback',
          message: 'Authorization code is required',
        },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: 'Invalid callback', message: 'State parameter is required' },
        { status: 400 }
      );
    }

    // Get OAuth credentials from environment
    const envPrefix = platform.toUpperCase();
    const clientId =
      process.env[`${envPrefix}_CLIENT_ID`] ||
      process.env[`${envPrefix}_OAUTH_CLIENT_ID`];
    const clientSecret =
      process.env[`${envPrefix}_CLIENT_SECRET`] ||
      process.env[`${envPrefix}_OAUTH_CLIENT_SECRET`];
    const redirectUri =
      process.env[`${envPrefix}_REDIRECT_URI`] ||
      process.env[`${envPrefix}_OAUTH_REDIRECT_URI`] ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/${platform}`;

    // Validate credentials
    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: `OAuth client ID not configured for ${platform}`,
        },
        { status: 500 }
      );
    }

    // Exchange code for tokens
    const tokens = await handleOAuthCallback({
      platform,
      code,
      state,
      redirectUri,
      clientId,
      clientSecret,
      organizationId: userId, // In production, get from user's org
    });

    // Return success response with tokens (frontend will store these)
    return NextResponse.json({
      success: true,
      platform,
      tokens: {
        accessToken: tokens.accessToken,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        expiresIn: tokens.expiresIn,
        // Include platform-specific data
        ...(tokens.workspaceId && { workspaceId: tokens.workspaceId }),
        ...(tokens.workspaceName && { workspaceName: tokens.workspaceName }),
      },
      message: 'Successfully connected',
    });
  } catch (error) {
    console.error('OAuth callback error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'OAuth callback failed',
        message: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

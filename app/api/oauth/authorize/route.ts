/**
 * OAuth Authorization API Route
 *
 * Generates OAuth authorization URLs for initiating OAuth flows.
 *
 * @endpoint POST /api/oauth/authorize - Generate authorization URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  generateAuthorizationUrl,
  supportsOAuth,
  getDefaultScopes,
} from '@/lib/oauth';
import { z } from 'zod';

/**
 * Request schema for generating authorization URL
 */
const authorizeRequestSchema = z.object({
  platform: z.string().min(1),
  redirectUri: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
  state: z.string().optional(),
  shopDomain: z.string().optional(),
});

/**
 * POST handler - Generate OAuth authorization URL
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validationResult = authorizeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { platform, redirectUri, scopes, state, shopDomain } =
      validationResult.data;

    // Check if platform supports OAuth
    if (!supportsOAuth(platform)) {
      return NextResponse.json(
        {
          error: 'Unsupported platform',
          message: `OAuth is not supported for ${platform}. Please use API key authentication.`,
          supportedPlatforms: [
            'wordpress',
            'webflow',
            'shopify',
            'notion',
            'squarespace',
            'contentful',
            'google',
            'google-search-console',
          ],
        },
        { status: 400 }
      );
    }

    // Get OAuth client ID from environment
    const envPrefix = platform.toUpperCase();
    const clientId =
      process.env[`${envPrefix}_CLIENT_ID`] ||
      process.env[`${envPrefix}_OAUTH_CLIENT_ID`];

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: `OAuth client ID not configured for ${platform}`,
        },
        { status: 500 }
      );
    }

    // Build redirect URI
    const finalRedirectUri =
      redirectUri ||
      process.env[`${envPrefix}_REDIRECT_URI`] ||
      process.env[`${envPrefix}_OAUTH_REDIRECT_URI`] ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/${platform}`;

    // Get default scopes if not provided
    const finalScopes =
      scopes && scopes.length > 0 ? scopes : getDefaultScopes(platform);

    // Generate authorization URL
    const authUrl = await generateAuthorizationUrl({
      platform,
      redirectUri: finalRedirectUri,
      clientId,
      scopes: finalScopes,
      state,
      shopDomain,
    });

    return NextResponse.json({
      success: true,
      platform,
      authUrl,
      redirectUri: finalRedirectUri,
      scopes: finalScopes,
    });
  } catch (error) {
    console.error('OAuth authorization error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate authorization URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Get OAuth configuration for a platform
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      );
    }

    const hasOAuth = supportsOAuth(platform);
    const envPrefix = platform.toUpperCase();
    const isConfigured = !!(
      process.env[`${envPrefix}_CLIENT_ID`] ||
      process.env[`${envPrefix}_OAUTH_CLIENT_ID`]
    );

    return NextResponse.json({
      platform,
      supportsOAuth: hasOAuth,
      isConfigured,
      scopes: getDefaultScopes(platform),
      redirectUri:
        process.env[`${envPrefix}_REDIRECT_URI`] ||
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback/${platform}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get OAuth configuration' },
      { status: 500 }
    );
  }
}

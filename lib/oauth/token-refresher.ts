/**
 * Token Refresher
 *
 * Handles OAuth token refresh for platforms that support refresh tokens.
 */

import {
  getTokens,
  storeTokens,
  encryptToken,
  decryptToken,
} from './token-storage';
import type { OAuthTokens } from './types';

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  platform: string,
  integrationId: string
): Promise<OAuthTokens | null> {
  const stored = await getTokens(platform, integrationId);

  if (!stored || !stored.refreshToken) {
    return null;
  }

  // Platform-specific refresh endpoints
  const refreshEndpoints: Record<string, string> = {
    wordpress: 'https://public-api.wordpress.com/oauth2/token',
    webflow: 'https://api.webflow.com/oauth/access_token',
    notion: 'https://api.notion.com/v1/oauth/token',
    squarespace: 'https://auth.squarespace.com/api/1/oauth/token',
    contentful: 'https://be.contentful.com/oauth/token',
    google: 'https://oauth2.googleapis.com/token',
    'google-search-console': 'https://oauth2.googleapis.com/token',
  };

  const refreshUrl = refreshEndpoints[platform];
  if (!refreshUrl) {
    console.warn(`Token refresh not supported for platform: ${platform}`);
    return stored; // Return existing tokens
  }

  try {
    const refreshedTokens = await performRefresh(
      platform,
      refreshUrl,
      stored.refreshToken
    );

    // Store new tokens
    await storeTokens(
      platform,
      {
        ...refreshedTokens,
        obtainedAt: new Date().toISOString(),
      },
      { integrationId }
    );

    return refreshedTokens;
  } catch (error) {
    console.error(`Token refresh failed for ${platform}:`, error);
    return null;
  }
}

/**
 * Perform the actual refresh request
 */
async function performRefresh(
  platform: string,
  refreshUrl: string,
  refreshToken: string
): Promise<OAuthTokens> {
  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: buildRefreshBody(platform, refreshToken),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Refresh failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  return parseRefreshResponse(platform, data, refreshToken);
}

/**
 * Build refresh request body for each platform
 */
function buildRefreshBody(platform: string, refreshToken: string): string {
  const params: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };

  // Add client credentials if available
  const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

  if (clientId) {
    params.client_id = clientId;
  }

  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  return new URLSearchParams(params).toString();
}

/**
 * Parse refresh response
 */
function parseRefreshResponse(
  platform: string,
  data: any,
  oldRefreshToken: string
): OAuthTokens {
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || oldRefreshToken,
    tokenType: data.token_type || 'Bearer',
    expiresIn:
      data.expires_in || data.expires_in ? Number(data.expires_in) : null,
    scope: data.scope || null,
    obtainedAt: new Date().toISOString(),
  };

  // Platform-specific handling
  if (platform === 'notion') {
    // Notion doesn't use refresh tokens
    tokens.refreshToken = null;
  }

  return tokens;
}

/**
 * Batch refresh multiple tokens
 */
export async function refreshMultipleTokens(
  entries: Array<{ platform: string; integrationId: string }>
): Promise<Map<string, OAuthTokens | null>> {
  const results = new Map<string, OAuthTokens | null>();

  await Promise.all(
    entries.map(async (entry) => {
      const key = `${entry.platform}:${entry.integrationId}`;
      const result = await refreshAccessToken(
        entry.platform,
        entry.integrationId
      );
      results.set(key, result);
    })
  );

  return results;
}

/**
 * Check if token is expired or will expire soon
 */
export function isTokenExpired(
  tokens: OAuthTokens,
  bufferSeconds: number = 300
): boolean {
  if (!tokens.expiresIn) {
    return false; // No expiry info, assume valid
  }

  const obtainedAt = new Date(tokens.obtainedAt);
  const expiresAt = new Date(obtainedAt.getTime() + tokens.expiresIn * 1000);
  const now = new Date();

  return now.getTime() > expiresAt.getTime() - bufferSeconds * 1000;
}

/**
 * Get token expiry information
 */
export function getTokenExpiry(tokens: OAuthTokens): {
  expiresAt: Date;
  isExpired: boolean;
  expiresSoon: boolean;
  secondsRemaining: number;
} {
  const obtainedAt = new Date(tokens.obtainedAt);
  const expiresAt = tokens.expiresIn
    ? new Date(obtainedAt.getTime() + tokens.expiresIn * 1000)
    : null;
  const now = new Date();

  if (!expiresAt) {
    return {
      expiresAt: new Date(0),
      isExpired: false,
      expiresSoon: false,
      secondsRemaining: Infinity,
    };
  }

  const secondsRemaining = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
  );
  const isExpired = secondsRemaining === 0;
  const expiresSoon = secondsRemaining < 300; // Less than 5 minutes

  return {
    expiresAt,
    isExpired,
    expiresSoon,
    secondsRemaining,
  };
}

/**
 * Auto-refresh wrapper - ensures valid token before operation
 */
export async function withValidToken<T>(
  platform: string,
  integrationId: string,
  operation: (tokens: OAuthTokens) => Promise<T>
): Promise<T> {
  let tokens = await getTokens(platform, integrationId);

  if (!tokens) {
    throw new Error('No tokens found for integration');
  }

  // Check if refresh needed
  if (tokens.refreshToken && isTokenExpired(tokens)) {
    const refreshed = await refreshAccessToken(platform, integrationId);
    if (refreshed) {
      tokens = refreshed;
    }
  }

  // Still expired? Throw error
  if (isTokenExpired(tokens, 0)) {
    throw new Error('Access token is expired and could not be refreshed');
  }

  return operation(tokens);
}

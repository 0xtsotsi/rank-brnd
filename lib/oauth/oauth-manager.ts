/**
 * OAuth Manager
 *
 * Handles OAuth 2.0 flows for CMS integrations including:
 * - Authorization URL generation
 * - Token exchange
 * - Token refresh
 * - Token validation
 */

import { createState, validateState } from './state-manager';
import {
  encryptToken,
  decryptToken,
  storeTokens,
  getTokens,
  deleteTokens,
} from './token-storage';
import { refreshAccessToken } from './token-refresher';
import type {
  OAuthConfig,
  OAuthTokens,
  OAuthCallbackParams,
  AuthorizationUrlParams,
} from './types';

/**
 * Generate OAuth authorization URL
 */
export async function generateAuthorizationUrl(
  params: AuthorizationUrlParams
): Promise<string> {
  const { platform, redirectUri, clientId, scopes, state } = params;

  // Validate required parameters
  if (!platform || !redirectUri || !clientId) {
    throw new Error(
      'Missing required OAuth parameters: platform, redirectUri, clientId'
    );
  }

  // Generate state if not provided
  const oauthState = state || (await createState(platform, redirectUri));

  // Platform-specific authorization endpoints
  const authEndpoints: Record<string, string> = {
    wordpress: 'https://public-api.wordpress.com/oauth2/authorize',
    webflow: 'https://webflow.com/oauth/authorize',
    shopify: `https://${params.shopDomain || ''}.myshopify.com/admin/oauth/authorize`,
    ghost: '', // Ghost uses custom flow
    notion: 'https://api.notion.com/v1/oauth/authorize',
    squarespace: 'https://auth.squarespace.com/api/1/oauth/authorize',
    contentful: 'https://be.contentful.com/oauth/authorize',
    strapi: '', // Strapi uses custom implementation
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    'google-search-console': 'https://accounts.google.com/o/oauth2/v2/auth',
  };

  const authUrl = authEndpoints[platform];
  if (!authUrl) {
    throw new Error(
      `OAuth authorization not supported for platform: ${platform}`
    );
  }

  // Build authorization URL
  const url = new URL(authUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', oauthState);

  if (scopes && scopes.length > 0) {
    url.searchParams.set('scope', scopes.join(' '));
  }

  // Platform-specific parameters
  if (platform === 'shopify') {
    url.searchParams.set(
      'scope',
      scopes?.join(',') || 'read_products,write_products'
    );
  }

  // Google specific parameters
  if (platform === 'google' || platform === 'google-search-console') {
    url.searchParams.set('access_type', 'offline'); // Enable refresh token
    url.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
  }

  return url.toString();
}

/**
 * Handle OAuth callback
 * Exchanges authorization code for access tokens
 */
export async function handleOAuthCallback(
  params: OAuthCallbackParams
): Promise<OAuthTokens> {
  const {
    platform,
    code,
    state,
    redirectUri,
    clientId,
    clientSecret,
    shopDomain,
  } = params;

  // Validate state parameter to prevent CSRF attacks
  const stateValidation = await validateState(state);
  if (!stateValidation.valid) {
    throw new Error('Invalid or expired OAuth state. Please try again.');
  }

  // Verify platform matches
  if (stateValidation.platform !== platform) {
    throw new Error('Platform mismatch in OAuth flow');
  }

  // Determine redirect URI (use provided or fall back to state validation)
  const finalRedirectUri = redirectUri || stateValidation.redirectUri;
  if (!finalRedirectUri) {
    throw new Error('Redirect URI is required for OAuth token exchange');
  }

  // Validate required credentials
  if (!clientId) {
    throw new Error('Client ID is required for OAuth token exchange');
  }
  if (!clientSecret) {
    throw new Error('Client secret is required for OAuth token exchange');
  }

  // Exchange authorization code for tokens
  const tokens = await exchangeCodeForTokens(platform, {
    code,
    redirectUri: finalRedirectUri,
    clientId,
    clientSecret,
    shopDomain,
  });

  // Encrypt and store tokens securely
  await storeTokens(platform, tokens, {
    organizationId: params.organizationId,
    productId: params.productId,
  });

  return tokens;
}

/**
 * Exchange authorization code for access tokens
 */
async function exchangeCodeForTokens(
  platform: string,
  config: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
    shopDomain?: string;
  }
): Promise<OAuthTokens> {
  const tokenEndpoints: Record<string, string> = {
    wordpress: 'https://public-api.wordpress.com/oauth2/token',
    webflow: 'https://api.webflow.com/oauth/access_token',
    shopify: `https://${config.shopDomain || ''}.myshopify.com/admin/oauth/access_token`,
    notion: 'https://api.notion.com/v1/oauth/token',
    squarespace: 'https://auth.squarespace.com/api/1/oauth/token',
    contentful: 'https://be.contentful.com/oauth/token',
    google: 'https://oauth2.googleapis.com/token',
    'google-search-console': 'https://oauth2.googleapis.com/token',
  };

  const tokenUrl = tokenEndpoints[platform];
  if (!tokenUrl) {
    throw new Error(`Token exchange not supported for platform: ${platform}`);
  }

  // Platform-specific request formats
  let body: Record<string, string>;
  let headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  switch (platform) {
    case 'wordpress':
      body = {
        grant_type: 'authorization_code',
        code: config.code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      };
      break;

    case 'webflow':
      body = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: config.code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      };
      break;

    case 'shopify':
      body = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: config.code,
      };
      break;

    case 'notion':
      body = {
        grant_type: 'authorization_code',
        code: config.code,
        redirect_uri: config.redirectUri,
      };
      headers['Authorization'] =
        `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
      break;

    case 'squarespace':
      body = {
        grant_type: 'authorization_code',
        code: config.code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      };
      break;

    case 'contentful':
      body = {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code: config.code,
      };
      break;

    case 'google':
    case 'google-search-console':
      body = {
        grant_type: 'authorization_code',
        code: config.code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      };
      break;

    default:
      throw new Error(`Unsupported platform for token exchange: ${platform}`);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  // Parse platform-specific token responses
  return parseTokenResponse(platform, data);
}

/**
 * Parse token response from OAuth provider
 */
function parseTokenResponse(platform: string, data: any): OAuthTokens {
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    tokenType: data.token_type || 'Bearer',
    expiresIn:
      data.expires_in || data.expires_in ? Number(data.expires_in) : null,
    scope: data.scope || null,
    obtainedAt: new Date().toISOString(),
  };

  // Platform-specific parsing
  if (platform === 'notion') {
    tokens.accessToken = data.access_token;
    tokens.workspaceId = data.workspace_id;
    tokens.workspaceName = data.workspace_name;
    tokens.botId = data.bot_id;
    tokens.owner = data.owner;
  }

  if (platform === 'webflow') {
    tokens.refreshToken = data.refresh_token;
  }

  if (platform === 'shopify') {
    tokens.accessToken = data.access_token;
    tokens.scope = data.scope;
  }

  return tokens;
}

/**
 * Get stored tokens for a platform
 */
export async function getStoredTokens(
  platform: string,
  integrationId: string
): Promise<OAuthTokens | null> {
  const tokens = await getTokens(platform, integrationId);
  if (!tokens) {
    return null;
  }

  // Check if token needs refresh
  if (needsRefresh(tokens)) {
    return await refreshAccessToken(platform, integrationId);
  }

  return tokens;
}

/**
 * Check if token needs refresh
 */
function needsRefresh(tokens: OAuthTokens): boolean {
  if (!tokens.expiresIn || !tokens.refreshToken) {
    return false;
  }

  const obtainedAt = new Date(tokens.obtainedAt);
  const expiresAt = new Date(obtainedAt.getTime() + tokens.expiresIn * 1000);
  const now = new Date();

  // Refresh if token expires within 5 minutes
  return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
}

/**
 * Revoke OAuth tokens (logout/disconnect)
 */
export async function revokeTokens(
  platform: string,
  integrationId: string
): Promise<void> {
  await deleteTokens(platform, integrationId);
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(config: OAuthConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.platform) {
    errors.push('Platform is required');
  }

  if (!config.clientId) {
    errors.push('Client ID is required');
  }

  if (!config.clientSecret && config.requiresSecret !== false) {
    errors.push('Client Secret is required');
  }

  if (!config.redirectUri) {
    errors.push('Redirect URI is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * OAuth scopes for each platform
 */
export const OAUTH_SCOPES = {
  wordpress: ['auth', 'posts', 'comments', 'taxonomies', 'media'],
  webflow: ['sites:read', 'sites:write', 'cms:read', 'cms:write'],
  shopify: ['read_products', 'write_products', 'read_content', 'write_content'],
  notion: [],
  squarespace: ['website.content.read', 'website.content.write'],
  contentful: ['content_management'],
  ghost: [],
  strapi: [],
  google: ['openid', 'https://www.googleapis.com/auth/webmasters.readonly'],
  'google-search-console': [
    'openid',
    'https://www.googleapis.com/auth/webmasters.readonly',
  ],
} as const;

/**
 * Get default OAuth scopes for a platform
 */
export function getDefaultScopes(platform: string): string[] {
  return [...(OAUTH_SCOPES[platform as keyof typeof OAUTH_SCOPES] || [])];
}

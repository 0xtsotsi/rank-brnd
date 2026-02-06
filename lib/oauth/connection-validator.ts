/**
 * Connection Validator
 *
 * Validates OAuth connections and checks connection status.
 */

import { getTokens, decryptFromIntegration } from './token-storage';
import { isTokenExpired, getTokenExpiry } from './token-refresher';
import type { ConnectionValidation, OAuthTokens } from './types';

/**
 * Platform-specific API endpoints for validation
 */
const VALIDATION_ENDPOINTS: Record<string, string> = {
  wordpress: 'https://public-api.wordpress.com/rest/v1.1/me',
  webflow: 'https://api.webflow.com/v2/user',
  shopify: '', // Shopify requires shop domain
  ghost: '', // Ghost uses admin API URL
  notion: 'https://api.notion.com/v1/users/me',
  squarespace: '', // Squarespace validation is complex
  contentful: 'https://api.contentful.com/spaces',
  strapi: '', // Custom URL
  google: 'https://www.googleapis.com/oauth2/v3/tokeninfo',
  'google-search-console': 'https://www.googleapis.com/oauth2/v3/tokeninfo',
};

/**
 * Validate connection status for an integration
 */
export async function validateConnection(
  platform: string,
  integrationId: string,
  config?: {
    baseUrl?: string;
    shopDomain?: string;
    adminUrl?: string;
  }
): Promise<ConnectionValidation> {
  const validatedAt = new Date().toISOString();

  try {
    // Get stored tokens
    const tokens = await getTokens(platform, integrationId);

    if (!tokens) {
      return {
        status: 'disconnected',
        isValid: false,
        message: 'No authentication credentials found',
        validatedAt,
      };
    }

    // Check token expiry
    const expiryInfo = getTokenExpiry(tokens);

    if (expiryInfo.isExpired) {
      return {
        status: 'expired',
        isValid: false,
        message: 'Authentication token has expired',
        error: 'TOKEN_EXPIRED',
        validatedAt,
        tokenExpiry: {
          expiresAt: expiryInfo.expiresAt.toISOString(),
          isExpired: expiryInfo.isExpired,
          expiresSoon: expiryInfo.expiresSoon,
        },
      };
    }

    if (expiryInfo.expiresSoon) {
      return {
        status: 'pending',
        isValid: true,
        message: 'Authentication token will expire soon',
        validatedAt,
        tokenExpiry: {
          expiresAt: expiryInfo.expiresAt.toISOString(),
          isExpired: expiryInfo.isExpired,
          expiresSoon: expiryInfo.expiresSoon,
        },
      };
    }

    // Perform actual API validation
    const apiValid = await validateWithApi(platform, tokens, config);

    if (!apiValid.valid) {
      return {
        status: 'error',
        isValid: false,
        message: apiValid.message || 'API validation failed',
        error: apiValid.error,
        validatedAt,
        tokenExpiry: {
          expiresAt: expiryInfo.expiresAt.toISOString(),
          isExpired: expiryInfo.isExpired,
          expiresSoon: expiryInfo.expiresSoon,
        },
      };
    }

    return {
      status: 'connected',
      isValid: true,
      message: 'Connection is valid and active',
      validatedAt,
      tokenExpiry: {
        expiresAt: expiryInfo.expiresAt.toISOString(),
        isExpired: expiryInfo.isExpired,
        expiresSoon: expiryInfo.expiresSoon,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      isValid: false,
      message: 'Connection validation failed',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      validatedAt,
    };
  }
}

/**
 * Validate connection by making API request
 */
async function validateWithApi(
  platform: string,
  tokens: OAuthTokens,
  config?: {
    baseUrl?: string;
    shopDomain?: string;
    adminUrl?: string;
  }
): Promise<{ valid: boolean; message?: string; error?: string }> {
  const endpoint = getValidationEndpoint(platform, config);

  if (!endpoint) {
    // Some platforms don't have standard validation endpoints
    return { valid: true, message: 'No validation endpoint available' };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return {
        valid: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      };
    }

    if (response.status === 403) {
      return {
        valid: false,
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
      };
    }

    return {
      valid: false,
      error: `HTTP_${response.status}`,
      message: response.statusText,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'NETWORK_ERROR',
      message:
        error instanceof Error ? error.message : 'Network request failed',
    };
  }
}

/**
 * Get validation endpoint for platform
 */
function getValidationEndpoint(
  platform: string,
  config?: {
    baseUrl?: string;
    shopDomain?: string;
    adminUrl?: string;
  }
): string | null {
  if (platform === 'shopify' && config?.shopDomain) {
    return `https://${config.shopDomain}/admin/api/shopify-api-version/current/shop.json`;
  }

  if (platform === 'ghost' && config?.adminUrl) {
    return `${config.adminUrl}/ghost/api/v3/admin/users/me/`;
  }

  if (platform === 'strapi' && config?.baseUrl) {
    return `${config.baseUrl}/api/users/me`;
  }

  return VALIDATION_ENDPOINTS[platform] || null;
}

/**
 * Validate connection from stored integration data
 */
export async function validateIntegrationConnection(
  authToken: string,
  platform: string,
  config?: {
    baseUrl?: string;
    shopDomain?: string;
    adminUrl?: string;
    siteUrl?: string;
  }
): Promise<ConnectionValidation> {
  const validatedAt = new Date().toISOString();

  try {
    // Decrypt token if encrypted
    let accessToken = authToken;
    try {
      accessToken = await decryptFromIntegration(authToken);
    } catch {
      // Token might not be encrypted, use as-is
    }

    const tokens: OAuthTokens = {
      accessToken,
      refreshToken: null,
      obtainedAt: new Date().toISOString(),
    };

    const apiValid = await validateWithApi(platform, tokens, config);

    if (!apiValid.valid) {
      return {
        status: 'error',
        isValid: false,
        message: apiValid.message || 'API validation failed',
        error: apiValid.error,
        validatedAt,
      };
    }

    return {
      status: 'connected',
      isValid: true,
      message: 'Connection is valid and active',
      validatedAt,
    };
  } catch (error) {
    return {
      status: 'error',
      isValid: false,
      message: 'Connection validation failed',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      validatedAt,
    };
  }
}

/**
 * Batch validate multiple integrations
 */
export async function validateMultipleConnections(
  integrations: Array<{
    platform: string;
    integrationId: string;
    config?: {
      baseUrl?: string;
      shopDomain?: string;
      adminUrl?: string;
    };
  }>
): Promise<Map<string, ConnectionValidation>> {
  const results = new Map<string, ConnectionValidation>();

  await Promise.all(
    integrations.map(async (integration) => {
      const key = `${integration.platform}:${integration.integrationId}`;
      const result = await validateConnection(
        integration.platform,
        integration.integrationId,
        integration.config
      );
      results.set(key, result);
    })
  );

  return results;
}

/**
 * Get connection status summary
 */
export async function getConnectionSummary(organizationId: string): Promise<{
  total: number;
  connected: number;
  disconnected: number;
  error: number;
  pending: number;
  expired: number;
}> {
  // This would query the database for integrations
  // For now, return mock data structure
  return {
    total: 0,
    connected: 0,
    disconnected: 0,
    error: 0,
    pending: 0,
    expired: 0,
  };
}

/**
 * Test credentials without storing
 */
export async function testCredentials(
  platform: string,
  accessToken: string,
  config?: {
    baseUrl?: string;
    shopDomain?: string;
    adminUrl?: string;
  }
): Promise<{ valid: boolean; message?: string; error?: string }> {
  const tokens: OAuthTokens = {
    accessToken,
    refreshToken: null,
    obtainedAt: new Date().toISOString(),
  };

  return validateWithApi(platform, tokens, config);
}

/**
 * Revoke connection (logout)
 */
export async function revokeConnection(
  platform: string,
  integrationId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { deleteTokens } = await import('./token-storage');
    await deleteTokens(platform, integrationId);

    return {
      success: true,
      message: 'Connection revoked successfully',
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to revoke connection',
    };
  }
}

/**
 * Check if platform supports OAuth
 */
export function supportsOAuth(platform: string): boolean {
  const oauthPlatforms = [
    'wordpress',
    'webflow',
    'shopify',
    'notion',
    'squarespace',
    'contentful',
    'google',
    'google-search-console',
  ];

  return oauthPlatforms.includes(platform);
}

/**
 * Get OAuth authorization URL for platform
 */
export async function getOAuthUrl(
  platform: string,
  redirectUri: string,
  clientId: string,
  scopes?: string[],
  state?: string
): Promise<string> {
  const { generateAuthorizationUrl } = await import('./oauth-manager');

  return generateAuthorizationUrl({
    platform,
    redirectUri,
    clientId,
    scopes,
    state,
  });
}

/**
 * Handle OAuth callback
 */
export async function handleCallback(
  platform: string,
  code: string,
  state: string,
  config: {
    redirectUri?: string;
    clientId?: string;
    clientSecret?: string;
    organizationId?: string;
    productId?: string;
    shopDomain?: string;
  }
): Promise<OAuthTokens> {
  const { handleOAuthCallback: handleCallback } =
    await import('./oauth-manager');

  return handleCallback({
    platform,
    code,
    state,
    redirectUri: config.redirectUri,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    organizationId: config.organizationId,
    productId: config.productId,
    shopDomain: config.shopDomain,
  });
}

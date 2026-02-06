/**
 * OAuth Types
 *
 * Common types for OAuth 2.0 flows
 */

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  /** Platform identifier */
  platform: string;
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret */
  clientSecret?: string;
  /** Redirect URI after authorization */
  redirectUri: string;
  /** OAuth scopes */
  scopes?: string[];
  /** Whether client secret is required (default: true) */
  requiresSecret?: boolean;
  /** Additional platform-specific config */
  shopDomain?: string;
}

/**
 * Parameters for generating authorization URL
 */
export interface AuthorizationUrlParams {
  /** Platform identifier */
  platform: string;
  /** OAuth redirect URI */
  redirectUri: string;
  /** OAuth client ID */
  clientId: string;
  /** OAuth scopes */
  scopes?: string[];
  /** State parameter (generated if not provided) */
  state?: string;
  /** Shop domain for Shopify */
  shopDomain?: string;
}

/**
 * OAuth callback parameters
 */
export interface OAuthCallbackParams {
  /** Platform identifier */
  platform: string;
  /** Authorization code from callback */
  code: string;
  /** State parameter from callback */
  state: string;
  /** OAuth redirect URI */
  redirectUri?: string;
  /** OAuth client ID */
  clientId?: string;
  /** OAuth client secret */
  clientSecret?: string;
  /** Organization ID for multi-tenancy */
  organizationId?: string;
  /** Product ID (optional) */
  productId?: string;
  /** Shop domain for Shopify */
  shopDomain?: string;
}

/**
 * OAuth tokens response
 */
export interface OAuthTokens {
  /** Access token */
  accessToken: string;
  /** Refresh token (if available) */
  refreshToken: string | null;
  /** Token type (usually "Bearer") */
  tokenType?: string;
  /** Token lifetime in seconds */
  expiresIn?: number | null;
  /** Granted scopes */
  scope?: string | null;
  /** When the token was obtained */
  obtainedAt: string;
  /** Notion-specific: workspace ID */
  workspaceId?: string;
  /** Notion-specific: workspace name */
  workspaceName?: string;
  /** Notion-specific: bot ID */
  botId?: string;
  /** Notion-specific: owner info */
  owner?: {
    type: string;
    id: string;
  };
}

/**
 * Stored OAuth tokens with metadata
 */
export interface StoredOAuthTokens extends OAuthTokens {
  /** Integration ID */
  integrationId: string;
  /** Platform identifier */
  platform: string;
  /** When tokens were stored */
  storedAt: string;
  /** Last refresh timestamp */
  refreshedAt?: string;
}

/**
 * OAuth state data
 */
export interface OAuthStateData {
  /** Platform identifier */
  platform: string;
  /** Redirect URI */
  redirectUri: string;
  /** Timestamp when state was created */
  createdAt: string;
  /** Expiration timestamp */
  expiresAt: string;
  /** Organization ID */
  organizationId?: string;
  /** Product ID */
  productId?: string;
}

/**
 * Connection status
 */
export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'pending'
  | 'expired';

/**
 * Connection validation result
 */
export interface ConnectionValidation {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether connection is valid */
  isValid: boolean;
  /** Status message */
  message?: string;
  /** Additional error details */
  error?: string;
  /** Timestamp of validation */
  validatedAt: string;
  /** Token expiry info */
  tokenExpiry?: {
    /** When token expires */
    expiresAt: string;
    /** Whether token is expired */
    isExpired: boolean;
    /** Whether token will expire soon */
    expiresSoon: boolean;
  };
}

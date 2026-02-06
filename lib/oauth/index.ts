/**
 * OAuth Module
 *
 * Complete OAuth 2.0 flow management for CMS integrations.
 *
 * @example
 * ```typescript
 * import { generateAuthorizationUrl, handleOAuthCallback } from '@/lib/oauth';
 *
 * // Start OAuth flow
 * const authUrl = await generateAuthorizationUrl({
 *   platform: 'wordpress',
 *   redirectUri: 'https://example.com/api/oauth/callback/wordpress',
 *   clientId: 'your-client-id',
 * });
 *
 * // Handle callback
 * const tokens = await handleOAuthCallback({
 *   platform: 'wordpress',
 *   code: 'authorization-code',
 *   state: 'state-parameter',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 * });
 * ```
 */

// Types
export type {
  OAuthConfig,
  OAuthTokens,
  StoredOAuthTokens,
  AuthorizationUrlParams,
  OAuthCallbackParams,
  ConnectionValidation,
} from './types';

// OAuth Manager
export {
  generateAuthorizationUrl,
  handleOAuthCallback,
  getStoredTokens,
  revokeTokens,
  validateOAuthConfig,
  OAUTH_SCOPES,
  getDefaultScopes,
} from './oauth-manager';

// Token Storage
export {
  encryptToken,
  decryptToken,
  storeTokens,
  getTokens,
  deleteTokens,
  encryptForIntegration,
  decryptFromIntegration,
  getTokensByOrganization,
  revokeAllOrganizationTokens,
} from './token-storage';

// Token Refresher
export {
  refreshAccessToken,
  refreshMultipleTokens,
  isTokenExpired,
  getTokenExpiry,
  withValidToken,
} from './token-refresher';

// Connection Validator
export {
  validateConnection,
  validateIntegrationConnection,
  validateMultipleConnections,
  getConnectionSummary,
  testCredentials,
  revokeConnection,
  supportsOAuth,
  getOAuthUrl,
  handleCallback,
} from './connection-validator';

// State Manager
export {
  createState,
  validateState,
  clearAllStates,
  getActiveStateCount,
} from './state-manager';

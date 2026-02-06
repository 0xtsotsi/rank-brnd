/**
 * Token Storage
 *
 * Secure storage for OAuth tokens using encryption.
 * Tokens are encrypted before storage and decrypted on retrieval.
 */

import type { OAuthTokens, StoredOAuthTokens } from './types';

// Encryption key should be stored in environment variable
const ENCRYPTION_KEY = process.env.OAUTH_TOKEN_ENCRYPTION_KEY || '';

// Ensure encryption key is available
if (!ENCRYPTION_KEY) {
  console.warn(
    'WARNING: OAUTH_TOKEN_ENCRYPTION_KEY not set. Tokens will not be encrypted.'
  );
}

/**
 * Encrypt sensitive data using AES-GCM
 */
export async function encryptToken(data: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    // Fallback: base64 encode (not secure, but functional)
    return Buffer.from(data).toString('base64');
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt sensitive data using AES-GCM
 */
export async function decryptToken(encryptedData: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    // Fallback: base64 decode
    return Buffer.from(encryptedData, 'base64').toString();
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const combined = Buffer.from(encryptedData, 'base64');
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(encrypted)
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Store OAuth tokens securely
 * In production, this should store to database with encryption
 */
export async function storeTokens(
  platform: string,
  tokens: OAuthTokens,
  metadata: {
    organizationId?: string;
    productId?: string;
    integrationId?: string;
  }
): Promise<void> {
  const integrationId = metadata.integrationId || `${platform}-${Date.now()}`;

  // Encrypt access token
  const encryptedAccessToken = await encryptToken(tokens.accessToken);
  let encryptedRefreshToken: string | null = null;

  if (tokens.refreshToken) {
    encryptedRefreshToken = await encryptToken(tokens.refreshToken);
  }

  const storedTokens: StoredOAuthTokens = {
    ...tokens,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    integrationId,
    platform,
    storedAt: new Date().toISOString(),
  };

  // Store in database (mock implementation here)
  // In production, use Supabase or similar
  await storeTokensInDatabase(storedTokens, metadata);
}

/**
 * Retrieve and decrypt OAuth tokens
 */
export async function getTokens(
  platform: string,
  integrationId: string
): Promise<OAuthTokens | null> {
  // Retrieve from database
  const stored = await getTokensFromDatabase(integrationId);

  if (!stored) {
    return null;
  }

  // Decrypt access token
  const accessToken = await decryptToken(stored.accessToken);
  let refreshToken: string | null = null;

  if (stored.refreshToken) {
    refreshToken = await decryptToken(stored.refreshToken);
  }

  return {
    accessToken,
    refreshToken,
    tokenType: stored.tokenType,
    expiresIn: stored.expiresIn,
    scope: stored.scope,
    obtainedAt: stored.obtainedAt,
    workspaceId: stored.workspaceId,
    workspaceName: stored.workspaceName,
    botId: stored.botId,
    owner: stored.owner,
  };
}

/**
 * Delete stored tokens
 */
export async function deleteTokens(
  platform: string,
  integrationId: string
): Promise<void> {
  await deleteTokensFromDatabase(integrationId);
}

// ============================================================================
// Database Operations (Mock Implementation)
// ============================================================================

// Mock in-memory storage (replace with actual database calls)
const tokenDatabase = new Map<
  string,
  StoredOAuthTokens & { organizationId?: string; productId?: string }
>();

async function storeTokensInDatabase(
  tokens: StoredOAuthTokens,
  metadata: { organizationId?: string; productId?: string }
): Promise<void> {
  const key = `${tokens.platform}:${tokens.integrationId}`;
  tokenDatabase.set(key, {
    ...tokens,
    organizationId: metadata.organizationId,
    productId: metadata.productId,
  });
}

async function getTokensFromDatabase(
  integrationId: string
): Promise<
  (StoredOAuthTokens & { organizationId?: string; productId?: string }) | null
> {
  for (const [key, value] of Array.from(tokenDatabase.entries())) {
    if (
      key.endsWith(`:${integrationId}`) ||
      value.integrationId === integrationId
    ) {
      return value;
    }
  }
  return null;
}

async function deleteTokensFromDatabase(integrationId: string): Promise<void> {
  for (const [key, value] of Array.from(tokenDatabase.entries())) {
    if (
      key.endsWith(`:${integrationId}`) ||
      value.integrationId === integrationId
    ) {
      tokenDatabase.delete(key);
      return;
    }
  }
}

/**
 * Get tokens by organization
 */
export async function getTokensByOrganization(
  organizationId: string
): Promise<Array<{ platform: string; integrationId: string }>> {
  const results: Array<{ platform: string; integrationId: string }> = [];

  for (const [key, value] of Array.from(tokenDatabase.entries())) {
    if (value.organizationId === organizationId) {
      results.push({
        platform: value.platform,
        integrationId: value.integrationId,
      });
    }
  }

  return results;
}

/**
 * Revoke all tokens for an organization
 */
export async function revokeAllOrganizationTokens(
  organizationId: string
): Promise<void> {
  const keysToDelete: string[] = [];

  for (const [key, value] of Array.from(tokenDatabase.entries())) {
    if (value.organizationId === organizationId) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    tokenDatabase.delete(key);
  }
}

/**
 * Encrypt data for storage in integrations table
 */
export async function encryptForIntegration(token: string): Promise<string> {
  return encryptToken(token);
}

/**
 * Decrypt data from integrations table
 */
export async function decryptFromIntegration(
  encryptedToken: string
): Promise<string> {
  return decryptToken(encryptedToken);
}

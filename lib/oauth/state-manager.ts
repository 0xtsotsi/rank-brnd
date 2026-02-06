/**
 * OAuth State Manager
 *
 * Manages OAuth state parameters to prevent CSRF attacks.
 * States are stored temporarily with expiration.
 */

import type { OAuthStateData } from './types';

// In-memory state storage with TTL
// In production, this should use Redis or similar
const stateStore = new Map<string, OAuthStateData>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a cryptographically random state string
 */
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Create and store OAuth state
 */
export async function createState(
  platform: string,
  redirectUri: string,
  organizationId?: string,
  productId?: string
): Promise<string> {
  const state = generateRandomState();
  const now = new Date();

  const stateData: OAuthStateData = {
    platform,
    redirectUri,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + STATE_TTL_MS).toISOString(),
    organizationId,
    productId,
  };

  stateStore.set(state, stateData);

  // Clean up expired states
  cleanupExpiredStates();

  return state;
}

/**
 * Validate OAuth state parameter
 */
export async function validateState(state: string): Promise<{
  valid: boolean;
  platform?: string;
  redirectUri?: string;
  error?: string;
}> {
  const stateData = stateStore.get(state);

  if (!stateData) {
    return { valid: false, error: 'State not found or expired' };
  }

  const now = new Date();
  const expiresAt = new Date(stateData.expiresAt);

  if (now > expiresAt) {
    stateStore.delete(state);
    return { valid: false, error: 'State expired' };
  }

  // Remove state after successful validation (one-time use)
  stateStore.delete(state);

  return {
    valid: true,
    platform: stateData.platform,
    redirectUri: stateData.redirectUri,
  };
}

/**
 * Clean up expired states
 */
function cleanupExpiredStates(): void {
  const now = new Date();
  for (const [state, data] of Array.from(stateStore.entries())) {
    const expiresAt = new Date(data.expiresAt);
    if (now > expiresAt) {
      stateStore.delete(state);
    }
  }
}

/**
 * Clean up all states (useful for testing)
 */
export function clearAllStates(): void {
  stateStore.clear();
}

/**
 * Get active state count (for monitoring)
 */
export function getActiveStateCount(): number {
  cleanupExpiredStates();
  return stateStore.size;
}

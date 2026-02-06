/**
 * CSRF Protection Utilities
 *
 * This module provides CSRF (Cross-Site Request Forgery) protection
 * using the double submit cookie pattern with encrypted tokens.
 *
 * Implementation details:
 * - Tokens are generated using crypto.randomUUID() for uniqueness
 * - Tokens are hashed using SHA-256 before storage in cookies
 * - Origin header validation is performed for state-changing operations
 * - Secure, httpOnly, SameSite=strict cookies are used
 */

import { cookies } from 'next/headers';

// Cookie name for CSRF token
const CSRF_COOKIE_NAME = 'csrf_token';
// Header name for CSRF token in requests
const CSRF_HEADER_NAME = 'x-csrf-token';
// Token expiration time (24 hours)
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * State-changing HTTP methods that require CSRF protection
 */
export const STATE_CHANGING_METHODS = new Set([
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
]);

/**
 * Generate a CSRF token
 * Creates a unique random token for CSRF protection
 */
export async function generateCSRFToken(): Promise<string> {
  return crypto.randomUUID();
}

/**
 * Hash a token using SHA-256
 * Used for secure storage and comparison
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a CSRF session object with hashed token and expiry
 */
interface CSRFSession {
  hash: string;
  expires: number;
}

/**
 * Generate a CSRF token and set it as a cookie
 * Returns the raw token to be sent to the client
 */
export async function createCSRFSession(): Promise<string> {
  const token = await generateCSRFToken();
  const hash = await hashToken(token);
  const expires = Date.now() + TOKEN_EXPIRY_MS;

  const session: CSRFSession = { hash, expires };

  // Store the hashed token in a cookie
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_EXPIRY_MS / 1000,
  });

  return token;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Compares two strings in constant time regardless of their content
 * Reference: OWASP CSRF Prevention Cheat Sheet
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate a CSRF token from the request
 * Compares the provided token with the stored hashed token
 * Uses timing-safe comparison to prevent timing attacks
 */
export async function validateCSRFToken(
  providedToken: string
): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(CSRF_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return false;
  }

  try {
    const session: CSRFSession = JSON.parse(sessionCookie.value);

    // Check expiration
    if (Date.now() > session.expires) {
      return false;
    }

    // Hash the provided token
    const providedHash = await hashToken(providedToken);

    // Compare hashes using timing-safe comparison
    // This prevents timing attacks that could leak token information
    return timingSafeEqual(session.hash, providedHash);
  } catch {
    return false;
  }
}

/**
 * Validate the Origin header for state-changing requests
 * Helps prevent CSRF attacks by verifying the request source
 */
export function validateOrigin(
  requestOrigin: string | null,
  requestReferer: string | null,
  allowedOrigins: string[]
): boolean {
  // If no origin or referer, reject (better to be safe)
  if (!requestOrigin && !requestReferer) {
    return false;
  }

  // Check origin first (more reliable)
  if (requestOrigin) {
    const originUrl = new URL(requestOrigin);
    const origin = `${originUrl.protocol}//${originUrl.host}`;
    if (allowedOrigins.includes(origin)) {
      return true;
    }
  }

  // Fallback to referer
  if (requestReferer) {
    const refererUrl = new URL(requestReferer);
    const referer = `${refererUrl.protocol}//${refererUrl.host}`;
    if (allowedOrigins.includes(referer)) {
      return true;
    }
  }

  return false;
}

/**
 * Get allowed origins from environment variables
 * Defaults to localhost for development and the APP_URL for production
 */
export function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const origins = [appUrl];

  // Add localhost URLs for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://localhost:3001');
  }

  return origins;
}

/**
 * CSRF error response
 */
export class CSRFError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'CSRFError';
  }
}

/**
 * Extract CSRF token from request headers
 */
export function getCSRFTokenFromHeaders(headers: Headers): string | null {
  return headers.get(CSRF_HEADER_NAME);
}

/**
 * Get the CSRF cookie name (for client-side reference)
 */
export function getCSRFCookieName(): string {
  return CSRF_COOKIE_NAME;
}

/**
 * Get the CSRF header name (for client-side reference)
 */
export function getCSRFHeaderName(): string {
  return CSRF_HEADER_NAME;
}

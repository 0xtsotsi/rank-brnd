/**
 * useCSRF Hook
 *
 * Client-side hook for managing CSRF tokens in React components.
 * Automatically fetches a token on mount and provides it for use in API requests.
 */

import { useState, useEffect } from 'react';

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_CACHE_KEY = 'csrf_token';
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

interface CSRFState {
  token: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface CachedToken {
  token: string;
  timestamp: number;
}

/**
 * Fetch a new CSRF token from the server
 */
async function fetchCSRFToken(): Promise<string> {
  const response = await fetch('/api/csrf-token', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Get cached token if still valid
 */
function getCachedToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CSRF_TOKEN_CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedToken = JSON.parse(cached);
    const now = Date.now();

    // Check if token is still valid
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.token;
    }

    // Token expired, remove from cache
    localStorage.removeItem(CSRF_TOKEN_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache a token locally
 */
function cacheToken(token: string): void {
  if (typeof window === 'undefined') return;

  try {
    const cached: CachedToken = {
      token,
      timestamp: Date.now(),
    };
    localStorage.setItem(CSRF_TOKEN_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Hook for managing CSRF tokens
 *
 * Usage:
 * ```tsx
 * const { token, loading, error, refresh } = useCSRF();
 *
 * // Use token in fetch calls
 * fetch('/api/data', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'x-csrf-token': token || '',
 *   },
 *   body: JSON.stringify({ data }),
 * });
 * ```
 */
export function useCSRF(): CSRFState {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadToken = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get cached token first
      const cached = getCachedToken();
      if (cached) {
        setToken(cached);
        setLoading(false);
        return;
      }

      // Fetch new token
      const newToken = await fetchCSRFToken();
      setToken(newToken);
      cacheToken(newToken);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load CSRF token'
      );
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    // Clear cache and fetch new token
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CSRF_TOKEN_CACHE_KEY);
    }
    await loadToken();
  };

  useEffect(() => {
    loadToken();
  }, []);

  return { token, loading, error, refresh };
}

/**
 * Enhance headers with CSRF token
 *
 * Usage:
 * ```tsx
 * const headers = withCSRFToken({
 *   'Content-Type': 'application/json',
 * });
 * ```
 */
export function withCSRFToken(baseHeaders: HeadersInit = {}): HeadersInit {
  const cached = getCachedToken();
  if (cached) {
    return {
      ...baseHeaders,
      [CSRF_HEADER_NAME]: cached,
    };
  }
  return baseHeaders;
}

/**
 * Fetch wrapper that automatically includes CSRF token
 *
 * Usage:
 * ```tsx
 * const response = await csrfFetch('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ data }),
 * });
 * ```
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const cached = getCachedToken();
  const headers: HeadersInit = {
    ...((options.headers as HeadersInit) || {}),
    ...(cached ? { [CSRF_HEADER_NAME]: cached } : {}),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

export { CSRF_HEADER_NAME };

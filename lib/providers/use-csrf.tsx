/**
 * useCSRF Hook
 *
 * Custom hook for managing CSRF tokens.
 * Fetches and caches CSRF tokens for API requests.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseCSRFReturn {
  token: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetch CSRF token from the API
 */
async function fetchCSRFToken(): Promise<string> {
  const response = await fetch('/api/csrf-token', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Hook to manage CSRF token state
 */
export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newToken = await fetchCSRFToken();
      setToken(newToken);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch CSRF token'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    token,
    loading,
    error,
    refresh,
  };
}

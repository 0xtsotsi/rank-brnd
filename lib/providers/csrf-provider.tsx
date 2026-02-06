/**
 * CSRF Provider
 *
 * Context provider for managing CSRF tokens at the app level.
 * Wraps the application and provides CSRF token to all components.
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCSRF as useCSRFHook } from './use-csrf';

interface CSRFContextValue {
  token: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextValue | null>(null);

interface CSRFProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages CSRF tokens for the app
 */
export function CSRFProvider({ children }: CSRFProviderProps) {
  const csrf = useCSRFHook();

  return <CSRFContext.Provider value={csrf}>{children}</CSRFContext.Provider>;
}

/**
 * Hook to access CSRF context
 *
 * Usage:
 * ```tsx
 * const { token, loading, error } = useCSRFContext();
 *
 * fetch('/api/data', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'x-csrf-token': token || '',
 *   },
 * });
 * ```
 */
export function useCSRFContext(): CSRFContextValue {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRFContext must be used within a CSRFProvider');
  }
  return context;
}

/**
 * Re-export the hook for direct use
 */
export { useCSRFHook as useCSRF };

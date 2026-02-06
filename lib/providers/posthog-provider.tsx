/**
 * PostHog Analytics Provider
 *
 * Context provider for PostHog analytics at the app level.
 * Wraps the application and provides PostHog client to all components.
 *
 * Features:
 * - Automatic page view tracking
 * - User identification with Clerk integration
 * - Event capture utility
 * - Server-side rendering support
 */

'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PostHogProviderBase } from 'posthog-js/react';

interface PostHogContextValue {
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
  isInitialized: boolean;
}

const PostHogContext = createContext<PostHogContextValue | null>(null);

interface PostHogProviderProps {
  children: ReactNode;
}

/**
 * Get PostHog configuration from environment variables
 */
function getPostHogConfig() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!key) {
    // In development, allow the app to run without PostHog
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'PostHog: NEXT_PUBLIC_POSTHOG_KEY is not set. Analytics will be disabled.'
      );
    }
    return null;
  }

  return { key, host };
}

/**
 * Initialize PostHog client
 */
function initPostHog() {
  const config = getPostHogConfig();

  if (!config) {
    return false;
  }

  posthog.init(config.key, {
    api_host: config.host,
    capture_pageview: false, // We'll handle pageviews manually for better control
    capture_pageleave: true,
    persistence: 'localStorage',
    loaded: (ph) => {
      // PostHog is ready
      if (process.env.NODE_ENV === 'development') {
        console.log('PostHog initialized successfully');
      }
    },
  });

  return true;
}

/**
 * Provider component that manages PostHog for the app
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const isInitialized = initPostHog();

  useEffect(() => {
    // Track page views on route changes
    const handleRouteChange = () => {
      if (isInitialized) {
        posthog.capture('$pageview');
      }
    };

    // Initial page view
    handleRouteChange();

    // Listen for route changes
    // Next.js App Router uses navigation events
    if (typeof window !== 'undefined') {
      // Intercept pushState and replaceState for client-side navigation
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function (...args) {
        originalPushState.apply(this, args);
        setTimeout(handleRouteChange, 0);
      };

      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        setTimeout(handleRouteChange, 0);
      };

      // Handle popstate (back/forward button)
      window.addEventListener('popstate', handleRouteChange);

      return () => {
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [isInitialized]);

  const contextValue: PostHogContextValue = {
    capture: (eventName, properties) => {
      if (isInitialized) {
        posthog.capture(eventName, properties);
      }
    },
    identify: (userId, properties) => {
      if (isInitialized) {
        posthog.identify(userId, properties);
      }
    },
    reset: () => {
      if (isInitialized) {
        posthog.reset();
      }
    },
    isInitialized,
  };

  return (
    <PostHogContext.Provider value={contextValue}>
      <PostHogProviderBase client={posthog}>{children}</PostHogProviderBase>
    </PostHogContext.Provider>
  );
}

/**
 * Hook to access PostHog context
 *
 * Usage:
 * ```tsx
 * const { capture, identify, reset, isInitialized } = usePostHog();
 *
 * // Track an event
 * capture('button_clicked', { button: 'signup' });
 *
 * // Identify a user
 * identify('user_123', { email: 'user@example.com', plan: 'pro' });
 *
 * // Reset on logout
 * reset();
 * ```
 */
export function usePostHog(): PostHogContextValue {
  const context = useContext(PostHogContext);
  if (!context) {
    // Return a no-op implementation if PostHog is not available
    return {
      capture: () => {},
      identify: () => {},
      reset: () => {},
      isInitialized: false,
    };
  }
  return context;
}

/**
 * Re-export the PostHog client for direct use
 */
export { posthog };

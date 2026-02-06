/**
 * User Analytics Hook
 *
 * Integrates Clerk authentication with PostHog analytics.
 * Automatically identifies users in PostHog when they authenticate.
 *
 * Usage:
 * ```tsx
 * import { useUserAnalytics } from '@/lib/hooks/use-user-analytics';
 *
 * function AppLayout({ children }) {
 *   useUserAnalytics(); // Automatically tracks user
 *   return <div>{children}</div>;
 * }
 * ```
 */

'use client';

import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { analytics } from '@/lib/analytics';

/**
 * Hook that automatically tracks user authentication state in PostHog
 *
 * Features:
 * - Identifies user when they sign in
 * - Updates user properties from Clerk profile
 * - Resets analytics on sign out
 * - Tracks authentication events
 */
export function useUserAnalytics() {
  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  useEffect(() => {
    // Wait for both auth and user data to load
    if (!isAuthLoaded || !isUserLoaded) {
      return;
    }

    // User is signed in - identify them in PostHog
    if (userId && user) {
      // Get user properties from Clerk
      const email = user.primaryEmailAddress?.emailAddress;
      const fullName = user.fullName;
      const firstName = user.firstName;
      const lastName = user.lastName;
      const username = user.username;
      const imageUrl = user.imageUrl;

      // Build user properties object
      const userProperties: Record<string, string | boolean | undefined> = {
        email,
        name: fullName || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        username: username || undefined,
        avatar_url: imageUrl || undefined,
        // Clerk-specific fields
        clerk_user_id: userId,
        has_image: !!imageUrl,
        email_verified:
          user.primaryEmailAddress?.verification?.status === 'verified',
      };

      // Identify user in PostHog
      analytics.identify(userId, userProperties);

      // Track sign-in event (only once per session)
      if (!sessionStorage.getItem('auth_sign_in_tracked')) {
        analytics.auth.signInCompleted('clerk');
        sessionStorage.setItem('auth_sign_in_tracked', 'true');
      }
    } else {
      // User is signed out - reset PostHog
      analytics.reset();

      // Clear session tracking flag
      sessionStorage.removeItem('auth_sign_in_tracked');
    }
  }, [isAuthLoaded, isUserLoaded, userId, user]);
}

/**
 * Hook that tracks page views with user context
 *
 * Use this in individual page components to track page-specific events
 */
export function usePageTracking(
  pageName: string,
  properties?: Record<string, unknown>
) {
  const { userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!userId) {
      return;
    }

    const pageProperties = {
      ...properties,
      page_name: pageName,
      user_email: user?.primaryEmailAddress?.emailAddress,
      user_name: user?.fullName,
    };

    analytics.trackPageView(pageName, pageProperties);
  }, [pageName, userId, user, properties]);
}

/**
 * Hook that returns user properties for analytics
 *
 * Use this to get consistent user properties across your app
 */
export function useUserProperties() {
  const { userId } = useAuth();
  const { user } = useUser();

  if (!userId || !user) {
    return null;
  }

  return {
    user_id: userId,
    email: user.primaryEmailAddress?.emailAddress,
    name: user.fullName,
    first_name: user.firstName,
    last_name: user.lastName,
    username: user.username,
    avatar_url: user.imageUrl,
    email_verified:
      user.primaryEmailAddress?.verification?.status === 'verified',
    has_image: !!user.imageUrl,
  };
}

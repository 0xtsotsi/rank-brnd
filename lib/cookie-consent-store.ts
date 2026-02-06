'use client';

/**
 * Cookie Consent Store
 *
 * Client-side state management for cookie consent preferences using Zustand.
 * Handles user consent choices with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CookieConsent,
  CookieConsentState,
  CookieCategory,
} from '@/types/cookie-consent';
import {
  DEFAULT_COOKIE_CONSENT,
  ACCEPT_ALL_COOKIE_CONSENT,
  REJECT_ALL_COOKIE_CONSENT,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
} from '@/types/cookie-consent';

// Re-export types for convenience
export type { CookieConsent, CookieConsentState, CookieCategory };

/**
 * Cookie consent store interface
 */
export interface CookieConsentStore extends CookieConsentState {
  /** Accept all cookies */
  acceptAll: () => void;
  /** Reject all optional cookies */
  rejectAll: () => void;
  /** Update specific category consent */
  setCategory: (category: CookieCategory, value: boolean) => void;
  /** Update multiple categories at once */
  setCategories: (categories: Partial<CookieConsent>) => void;
  /** Check if a specific category has consent */
  hasConsent: (category: CookieCategory) => boolean;
  /** Check if user has given any consent */
  hasGivenConsent: () => boolean;
  /** Reset consent state */
  resetConsent: () => void;
  /** Open preferences dialog */
  openPreferences: () => void;
  /** Close preferences dialog */
  closePreferences: () => void;
  /** Whether preferences dialog is open */
  isPreferencesOpen: boolean;
  /** Whether the banner should be shown */
  showBanner: boolean;
  /** Dismiss the banner (accept current selection) */
  dismissBanner: () => void;
  /** Show the banner manually */
  showBannerManually: () => void;
}

/**
 * Create the cookie consent store with persistence
 */
export const useCookieConsentStore = create<CookieConsentStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_COOKIE_CONSENT,

      // UI state (not persisted)
      isPreferencesOpen: false,
      showBanner: false,

      // Accept all cookies
      acceptAll: () => {
        set({
          ...ACCEPT_ALL_COOKIE_CONSENT,
          lastUpdated: new Date().toISOString(),
          showBanner: false,
        });
      },

      // Reject all optional cookies
      rejectAll: () => {
        set({
          ...REJECT_ALL_COOKIE_CONSENT,
          lastUpdated: new Date().toISOString(),
          showBanner: false,
        });
      },

      // Update specific category consent
      setCategory: (category: CookieCategory, value: boolean) => {
        set((state) => ({
          ...state,
          [category]: category === 'essential' ? true : value, // Essential cannot be disabled
          lastUpdated: new Date().toISOString(),
          hasConsented: true,
        }));
      },

      // Update multiple categories at once
      setCategories: (categories: Partial<CookieConsent>) => {
        set((state) => ({
          ...state,
          ...categories,
          essential: true, // Always keep essential enabled
          lastUpdated: new Date().toISOString(),
          hasConsented: true,
        }));
      },

      // Check if a specific category has consent
      hasConsent: (category: CookieCategory) => {
        const state = get();
        return state[category];
      },

      // Check if user has given any consent
      hasGivenConsent: () => {
        return get().hasConsented;
      },

      // Reset consent state
      resetConsent: () => {
        set({
          ...DEFAULT_COOKIE_CONSENT,
          showBanner: true,
        });
      },

      // Open preferences dialog
      openPreferences: () => {
        set({ isPreferencesOpen: true });
      },

      // Close preferences dialog
      closePreferences: () => {
        set({ isPreferencesOpen: false });
      },

      // Dismiss the banner (user has made a choice)
      dismissBanner: () => {
        set({ showBanner: false, hasConsented: true });
      },

      // Show the banner manually (e.g., from footer link)
      showBannerManually: () => {
        set({ showBanner: true });
      },
    }),
    {
      name: COOKIE_CONSENT_STORAGE_KEY,
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(name);
        },
      },
      partialize: (state) => {
        const {
          isPreferencesOpen,
          showBanner,
          ...persistedState
        } = state;
        return persistedState as any;
      },
      skipHydration: true,
      // Check version on hydration - reset if version mismatch
      onRehydrateStorage: () => (state) => {
        if (state && state.version !== COOKIE_CONSENT_VERSION) {
          // Version mismatch, reset to default
          state.essential = DEFAULT_COOKIE_CONSENT.essential;
          state.analytics = DEFAULT_COOKIE_CONSENT.analytics;
          state.marketing = DEFAULT_COOKIE_CONSENT.marketing;
          state.preferences = DEFAULT_COOKIE_CONSENT.preferences;
          state.lastUpdated = new Date().toISOString();
          state.version = COOKIE_CONSENT_VERSION;
          state.hasConsented = false;
        }
      },
    }
  )
);

/**
 * Hook to check if a specific category has consent
 */
export function useHasConsent(category: CookieCategory): boolean {
  return useCookieConsentStore((state) => state.hasConsent(category));
}

/**
 * Hook to get all consent preferences
 */
export function useCookieConsent(): CookieConsentState {
  return useCookieConsentStore((state) => ({
    essential: state.essential,
    analytics: state.analytics,
    marketing: state.marketing,
    preferences: state.preferences,
    lastUpdated: state.lastUpdated,
    version: state.version,
    hasConsented: state.hasConsented,
  }));
}

/**
 * Hook to check if analytics cookies are enabled
 */
export function useAnalyticsConsent(): boolean {
  return useCookieConsentStore((state) => state.analytics);
}

/**
 * Hook to check if marketing cookies are enabled
 */
export function useMarketingConsent(): boolean {
  return useCookieConsentStore((state) => state.marketing);
}

/**
 * Initialize cookie consent on app mount
 * Returns whether the banner should be shown
 */
export function initializeCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;

  const state = useCookieConsentStore.getState();

  // Show banner if user hasn't consented yet
  if (!state.hasConsented) {
    useCookieConsentStore.setState({ showBanner: true });
    return true;
  }

  return false;
}

/**
 * Action hooks for convenience
 */
export const useSetCategory = () =>
  useCookieConsentStore((state) => state.setCategory);
export const useSetCategories = () =>
  useCookieConsentStore((state) => state.setCategories);
export const useAcceptAll = () =>
  useCookieConsentStore((state) => state.acceptAll);
export const useRejectAll = () =>
  useCookieConsentStore((state) => state.rejectAll);
export const useOpenPreferences = () =>
  useCookieConsentStore((state) => state.openPreferences);
export const useClosePreferences = () =>
  useCookieConsentStore((state) => state.closePreferences);
export const useDismissBanner = () =>
  useCookieConsentStore((state) => state.dismissBanner);

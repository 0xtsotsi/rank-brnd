/**
 * Cookie Consent Types
 *
 * Types for GDPR-compliant cookie consent management.
 */

/**
 * Cookie category types following GDPR guidelines
 */
export type CookieCategory =
  | 'essential'
  | 'analytics'
  | 'marketing'
  | 'preferences';

/**
 * Cookie consent state for each category
 */
export interface CookieConsent {
  /** Essential cookies (always enabled, cannot be disabled) */
  essential: boolean;
  /** Analytics/performance cookies */
  analytics: boolean;
  /** Marketing/advertising cookies */
  marketing: boolean;
  /** Preferences/functionality cookies */
  preferences: boolean;
}

/**
 * Full consent state including metadata
 */
export interface CookieConsentState extends CookieConsent {
  /** When consent was last updated */
  lastUpdated: string;
  /** Version of the consent policy */
  version: number;
  /** Whether user has made an explicit choice */
  hasConsented: boolean;
}

/**
 * Cookie category description for UI display
 */
export interface CookieCategoryInfo {
  id: CookieCategory;
  name: string;
  description: string;
  /** Whether this category can be disabled */
  optional: boolean;
  /** Examples of cookies in this category */
  examples: string[];
}

/**
 * Default consent state (all optional categories disabled until user accepts)
 */
export const DEFAULT_COOKIE_CONSENT: CookieConsentState = {
  essential: true, // Always enabled
  analytics: false,
  marketing: false,
  preferences: false,
  lastUpdated: new Date().toISOString(),
  version: 1,
  hasConsented: false,
};

/**
 * Consent state when user accepts all cookies
 */
export const ACCEPT_ALL_COOKIE_CONSENT: CookieConsentState = {
  essential: true,
  analytics: true,
  marketing: true,
  preferences: true,
  lastUpdated: new Date().toISOString(),
  version: 1,
  hasConsented: true,
};

/**
 * Consent state when user rejects all optional cookies
 */
export const REJECT_ALL_COOKIE_CONSENT: CookieConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  preferences: false,
  lastUpdated: new Date().toISOString(),
  version: 1,
  hasConsented: true,
};

/**
 * Cookie category descriptions for display in the consent dialog
 */
export const COOKIE_CATEGORIES: Readonly<CookieCategoryInfo[]> = [
  {
    id: 'essential',
    name: 'Essential Cookies',
    description:
      'Required for the site to function properly. These include authentication, security, and session management.',
    optional: false,
    examples: ['Authentication tokens', 'CSRF tokens', 'Session cookies'],
  },
  {
    id: 'analytics',
    name: 'Analytics Cookies',
    description:
      'Help us understand how users interact with our site by collecting anonymous usage data.',
    optional: true,
    examples: ['PostHog analytics', 'Google Analytics', 'Page views tracking'],
  },
  {
    id: 'marketing',
    name: 'Marketing Cookies',
    description:
      'Used to deliver relevant advertisements and measure campaign effectiveness.',
    optional: true,
    examples: ['Facebook Pixel', 'Google Ads', 'LinkedIn Insight Tag'],
  },
  {
    id: 'preferences',
    name: 'Preferences Cookies',
    description:
      'Remember your settings and preferences to provide enhanced features.',
    optional: true,
    examples: ['Theme selection', 'Language preferences', 'Product selection'],
  },
] as const;

/**
 * Storage key for cookie consent in localStorage
 */
export const COOKIE_CONSENT_STORAGE_KEY = 'rankbrnd_cookie_consent';

/**
 * Current consent policy version
 */
export const COOKIE_CONSENT_VERSION = 1;

/**
 * Check if a specific cookie category has consent
 */
export function hasCategoryConsent(
  consent: CookieConsentState,
  category: CookieCategory
): boolean {
  return consent[category];
}

/**
 * Check if any optional cookies have consent
 */
export function hasAnyOptionalConsent(consent: CookieConsentState): boolean {
  return consent.analytics || consent.marketing || consent.preferences;
}

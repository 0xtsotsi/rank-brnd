/**
 * Cookie Script Loader
 *
 * Utilities for conditionally loading third-party scripts based on cookie consent.
 * Use these hooks and utilities to ensure scripts only load when users have consented.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { CookieCategory } from '@/types/cookie-consent';
import { useCookieConsentStore } from '@/lib/cookie-consent-store';

/**
 * Script loading configuration
 */
export interface ConsentScriptConfig {
  /** Unique identifier for the script */
  id: string;
  /** Cookie category required for this script */
  category: CookieCategory;
  /** Script source URL */
  src: string;
  /** Whether to load asynchronously (default: true) */
  async?: boolean;
  /** Whether to defer loading (default: false) */
  defer?: boolean;
  /** Additional attributes to add to the script tag */
  attributes?: Record<string, string>;
  /** Callback when script loads successfully */
  onLoad?: () => void;
  /** Callback when script fails to load */
  onError?: () => void;
  /** Script content (inline scripts) */
  content?: string;
}

/**
 * Hook to load a third-party script based on cookie consent
 *
 * @example
 * ```tsx
 * useConsentScript({
 *   id: 'google-analytics',
 *   category: 'analytics',
 *   src: 'https://www.googletagmanager.com/gtag/js?id=GA_ID',
 *   async: true,
 * });
 * ```
 */
export function useConsentScript(config: ConsentScriptConfig): boolean {
  const hasLoaded = useRef(false);
  const hasConsent = useCookieConsentStore((state) =>
    state.hasConsent(config.category)
  );

  useEffect(() => {
    // Don't load if no consent or already loaded
    if (!hasConsent || hasLoaded.current) {
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.getElementById(config.id);
    if (existingScript) {
      hasLoaded.current = true;
      return;
    }

    // Create and insert script
    const script = document.createElement('script');
    script.id = config.id;

    if (config.content) {
      script.textContent = config.content;
    } else if (config.src) {
      script.src = config.src;
      if (config.async !== false) script.async = true;
      if (config.defer) script.defer = true;
    }

    // Add custom attributes
    if (config.attributes) {
      Object.entries(config.attributes).forEach(([key, value]) => {
        script.setAttribute(key, value);
      });
    }

    // Set up event handlers
    script.onload = () => {
      hasLoaded.current = true;
      config.onLoad?.();
    };

    script.onerror = () => {
      console.error(`Failed to load script: ${config.id}`);
      config.onError?.();
    };

    // Insert into document
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Note: We don't remove the script on unmount to avoid breaking
      // third-party integrations that expect the script to persist
    };
  }, [hasConsent, config.id]);

  return hasLoaded.current && hasConsent;
}

/**
 * Hook to load Google Analytics based on consent
 */
export function useGoogleAnalytics(measurementId: string): boolean {
  const hasLoaded = useRef(false);
  const hasConsent = useCookieConsentStore((state) => state.analytics);

  useEffect(() => {
    if (!hasConsent || hasLoaded.current) return;

    // Load gtag.js
    const script = document.createElement('script');
    script.id = 'google-analytics';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    const initScript = document.createElement('script');
    initScript.id = 'google-analytics-init';
    initScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    `;
    document.head.appendChild(initScript);

    hasLoaded.current = true;
  }, [hasConsent, measurementId]);

  return hasLoaded.current && hasConsent;
}

/**
 * Hook to load PostHog analytics based on consent
 */
export function usePostHogAnalytics(apiKey: string, host?: string): boolean {
  const hasLoaded = useRef(false);
  const hasConsent = useCookieConsentStore((state) => state.analytics);

  useEffect(() => {
    if (!hasConsent || hasLoaded.current) return;

    // PostHog is typically loaded through their provider
    // This is a fallback for direct script loading
    const script = document.createElement('script');
    script.id = 'posthog-analytics';
    script.textContent = `
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(e,t.useState=t.useState||function(){return{curr:i}});function p(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(e,t.getCaptureSettings=t.getCaptureSettings||function(){return{}});function r(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(e,t.identify=t.identify||function(){},t=t||{};var o=t.persistLocalStorage;void 0!==o&&(e.FORCED_EXTERNAL_PERSISTENCE=o);var h=t.apiHost||"${host || 'https://app.posthog.com'}";function l(t){return"false"===t||"null"===t}function d(t,e){t=e.split("."),2==t.length&&(t=t[0],e=t[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(t,t.capture=t.capture||function(){t.push([arguments])},t=t||{};var c=t.api_host||"${host || 'https://app.posthog.com'}";!function(t,e){e=t.createElement("script");e.type="text/javascript";e.async=!0;e.src=e.api_host+"/static/array.js";t.getElementsByTagName("head")[0].appendChild(e)}(document);
      })();
      posthog.init('${apiKey}', {api_host: '${host || 'https://app.posthog.com'}'});
    `;
    document.head.appendChild(script);

    hasLoaded.current = true;
  }, [hasConsent, apiKey, host]);

  return hasLoaded.current && hasConsent;
}

/**
 * Check if a specific cookie category has consent
 * Use this to conditionally render tracking components
 */
export function useHasConsent(category: CookieCategory): boolean {
  return useCookieConsentStore((state) => state.hasConsent(category));
}

/**
 * Check if analytics cookies are enabled
 */
export function useAnalyticsConsent(): boolean {
  return useCookieConsentStore((state) => state.analytics);
}

/**
 * Check if marketing cookies are enabled
 */
export function useMarketingConsent(): boolean {
  return useCookieConsentStore((state) => state.marketing);
}

/**
 * Check if preferences cookies are enabled
 */
export function usePreferencesConsent(): boolean {
  return useCookieConsentStore((state) => state.preferences);
}

/**
 * Server-side safe check for consent
 * Always returns false on server, use client-side hooks for real consent status
 */
export function canLoadScript(category: CookieCategory): boolean {
  if (typeof window === 'undefined') return false;

  // Check localStorage directly for SSR scenarios
  const storageKey = 'rankbrnd_cookie_consent';
  const stored = localStorage.getItem(storageKey);

  if (!stored) return false;

  try {
    const consent = JSON.parse(stored);
    const state = consent.state;
    return state?.[category] === true;
  } catch {
    return false;
  }
}

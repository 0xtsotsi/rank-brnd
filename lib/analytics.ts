/**
 * Analytics Utilities
 *
 * Centralized analytics tracking using PostHog.
 * Provides type-safe event tracking for the application.
 *
 * Usage:
 * ```tsx
 * import { trackEvent, trackPageView, identifyUser } from '@/lib/analytics';
 *
 * // Track an event
 * trackEvent('user_signed_up', { method: 'google' });
 *
 * // Identify a user (call after authentication)
 * identifyUser('user_123', { email: 'user@example.com' });
 * ```
 */

import posthog from 'posthog-js';

/**
 * Check if PostHog is initialized and ready
 */
function isPostHogReady(): boolean {
  if (typeof window === 'undefined') return false;
  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

// ============================================================================
// Event Types - Define all tracked events here for type safety
// ============================================================================

/**
 * User Authentication Events
 */
export const AUTH_EVENTS = {
  SIGN_UP_STARTED: 'auth_sign_up_started',
  SIGN_UP_COMPLETED: 'auth_sign_up_completed',
  SIGN_IN_COMPLETED: 'auth_sign_in_completed',
  SIGN_OUT: 'auth_sign_out',
  PASSWORD_RESET_STARTED: 'auth_password_reset_started',
  PASSWORD_RESET_COMPLETED: 'auth_password_reset_completed',
} as const;

/**
 * Onboarding Events
 */
export const ONBOARDING_EVENTS = {
  STARTED: 'onboarding_started',
  STEP_COMPLETED: 'onboarding_step_completed',
  COMPLETED: 'onboarding_completed',
  SKIPPED: 'onboarding_skipped',
} as const;

/**
 * Feature Usage Events
 */
export const FEATURE_EVENTS = {
  KEYWORD_SEARCH_PERFORMED: 'feature_keyword_search_performed',
  CONTENT_GENERATED: 'feature_content_generated',
  CONTENT_PUBLISHED: 'feature_content_published',
  SERP_ANALYSIS_RUN: 'feature_serp_analysis_run',
  COMPETITOR_ANALYSIS_VIEWED: 'feature_competitor_analysis_viewed',
  CALENDAR_EVENT_CREATED: 'feature_calendar_event_created',
} as const;

/**
 * Subscription Events
 */
export const SUBSCRIPTION_EVENTS = {
  PRICING_PAGE_VIEWED: 'subscription_pricing_page_viewed',
  CHECKOUT_STARTED: 'subscription_checkout_started',
  CHECKOUT_COMPLETED: 'subscription_checkout_completed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
} as const;

/**
 * UI Interaction Events
 */
export const UI_EVENTS = {
  BUTTON_CLICKED: 'ui_button_clicked',
  MODAL_OPENED: 'ui_modal_opened',
  MODAL_CLOSED: 'ui_modal_closed',
  TAB_CHANGED: 'ui_tab_changed',
  SIDEBAR_TOGGLED: 'ui_sidebar_toggled',
} as const;

/**
 * Error Events
 */
export const ERROR_EVENTS = {
  API_ERROR: 'error_api',
  CLIENT_ERROR: 'error_client',
  NETWORK_ERROR: 'error_network',
} as const;

// ============================================================================
// Core Analytics Functions
// ============================================================================

/**
 * Track a custom event
 *
 * @param eventName - Name of the event to track
 * @param properties - Additional properties to include with the event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogReady()) return;

  try {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

/**
 * Track a page view
 *
 * @param pageName - Name or path of the page
 * @param properties - Additional properties
 */
export function trackPageView(
  pageName?: string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogReady()) return;

  try {
    posthog.capture('$pageview', {
      ...(pageName && { $current_url: pageName }),
      ...properties,
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

/**
 * Identify a user
 *
 * Call this when a user logs in or signs up.
 *
 * @param userId - Unique identifier for the user
 * @param properties - User properties to set
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogReady()) return;

  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Set user properties
 *
 * @param properties - Properties to set on the current user
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (!isPostHogReady()) return;

  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('Failed to set user properties:', error);
  }
}

/**
 * Reset user identification
 *
 * Call this when a user logs out.
 */
export function resetUser(): void {
  if (!isPostHogReady()) return;

  try {
    posthog.reset();
  } catch (error) {
    console.error('Failed to reset user:', error);
  }
}

/**
 * Track an error
 *
 * @param errorType - Type of error
 * @param errorMessage - Error message
 * @param context - Additional context about the error
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  context?: Record<string, unknown>
): void {
  trackErrorWithType(ERROR_EVENTS.API_ERROR, errorType, errorMessage, context);
}

/**
 * Track an error with event type
 *
 * @param eventType - The error event type
 * @param errorType - Type of error
 * @param errorMessage - Error message
 * @param context - Additional context about the error
 */
export function trackErrorWithType(
  eventType: string,
  errorType: string,
  errorMessage: string,
  context?: Record<string, unknown>
): void {
  trackEvent(eventType, {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
}

// ============================================================================
// Convenience Functions for Common Events
// ============================================================================

/**
 * Track authentication events
 */
export const authAnalytics = {
  signUpStarted: (method: string) =>
    trackEvent(AUTH_EVENTS.SIGN_UP_STARTED, { method }),
  signUpCompleted: (method: string, userId?: string) =>
    trackEvent(AUTH_EVENTS.SIGN_UP_COMPLETED, { method, userId }),
  signInCompleted: (method: string) =>
    trackEvent(AUTH_EVENTS.SIGN_IN_COMPLETED, { method }),
  signOut: () => trackEvent(AUTH_EVENTS.SIGN_OUT),
  passwordResetStarted: () => trackEvent(AUTH_EVENTS.PASSWORD_RESET_STARTED),
  passwordResetCompleted: () =>
    trackEvent(AUTH_EVENTS.PASSWORD_RESET_COMPLETED),
};

/**
 * Track onboarding events
 */
export const onboardingAnalytics = {
  started: () => trackEvent(ONBOARDING_EVENTS.STARTED),
  stepCompleted: (step: string, stepNumber: number) =>
    trackEvent(ONBOARDING_EVENTS.STEP_COMPLETED, { step, stepNumber }),
  completed: () => trackEvent(ONBOARDING_EVENTS.COMPLETED),
  skipped: () => trackEvent(ONBOARDING_EVENTS.SKIPPED),
};

/**
 * Track feature usage events
 */
export const featureAnalytics = {
  keywordSearchPerformed: (keyword: string, resultsCount: number) =>
    trackEvent(FEATURE_EVENTS.KEYWORD_SEARCH_PERFORMED, {
      keyword,
      results_count: resultsCount,
    }),
  contentGenerated: (contentType: string, wordCount: number) =>
    trackEvent(FEATURE_EVENTS.CONTENT_GENERATED, {
      content_type: contentType,
      word_count: wordCount,
    }),
  contentPublished: (contentType: string) =>
    trackEvent(FEATURE_EVENTS.CONTENT_PUBLISHED, { content_type: contentType }),
  serpAnalysisRun: (keyword: string) =>
    trackEvent(FEATURE_EVENTS.SERP_ANALYSIS_RUN, { keyword }),
  competitorAnalysisViewed: (competitor: string) =>
    trackEvent(FEATURE_EVENTS.COMPETITOR_ANALYSIS_VIEWED, { competitor }),
  calendarEventCreated: (eventType: string) =>
    trackEvent(FEATURE_EVENTS.CALENDAR_EVENT_CREATED, {
      event_type: eventType,
    }),
};

/**
 * Track subscription events
 */
export const subscriptionAnalytics = {
  pricingPageViewed: (source?: string) =>
    trackEvent(SUBSCRIPTION_EVENTS.PRICING_PAGE_VIEWED, { source }),
  checkoutStarted: (plan: string) =>
    trackEvent(SUBSCRIPTION_EVENTS.CHECKOUT_STARTED, { plan }),
  checkoutCompleted: (plan: string, amount: number) =>
    trackEvent(SUBSCRIPTION_EVENTS.CHECKOUT_COMPLETED, { plan, amount }),
  subscriptionCancelled: (plan: string, reason?: string) =>
    trackEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED, { plan, reason }),
  subscriptionUpgraded: (fromPlan: string, toPlan: string) =>
    trackEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPGRADED, {
      from_plan: fromPlan,
      to_plan: toPlan,
    }),
  subscriptionDowngraded: (fromPlan: string, toPlan: string) =>
    trackEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_DOWNGRADED, {
      from_plan: fromPlan,
      to_plan: toPlan,
    }),
};

/**
 * Track UI interaction events
 */
export const uiAnalytics = {
  buttonClicked: (buttonName: string, location: string) =>
    trackEvent(UI_EVENTS.BUTTON_CLICKED, { button_name: buttonName, location }),
  modalOpened: (modalName: string) =>
    trackEvent(UI_EVENTS.MODAL_OPENED, { modal_name: modalName }),
  modalClosed: (modalName: string, action?: string) =>
    trackEvent(UI_EVENTS.MODAL_CLOSED, { modal_name: modalName, action }),
  tabChanged: (tabName: string, category: string) =>
    trackEvent(UI_EVENTS.TAB_CHANGED, { tab_name: tabName, category }),
  sidebarToggled: (state: 'opened' | 'closed') =>
    trackEvent(UI_EVENTS.SIDEBAR_TOGGLED, { state }),
};

// ============================================================================
// Export All
// ============================================================================

export const analytics = {
  track: trackEvent,
  trackPageView,
  identify: identifyUser,
  setProperties: setUserProperties,
  reset: resetUser,
  trackError,
  trackErrorWithType,

  // Event groups
  auth: authAnalytics,
  onboarding: onboardingAnalytics,
  feature: featureAnalytics,
  subscription: subscriptionAnalytics,
  ui: uiAnalytics,
};

export default analytics;

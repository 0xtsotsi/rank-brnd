/**
 * Google Search Console Integration Module
 *
 * Complete OAuth 2.0 integration with Google Search Console API.
 *
 * @example
 * ```typescript
 * import {
 *   getGoogleAuthUrl,
 *   handleGoogleCallback,
 *   getGSCClient,
 *   syncSearchConsoleData
 * } from '@/lib/google-search-console';
 *
 * // Get OAuth URL
 * const authUrl = await getGoogleAuthUrl(redirectUri);
 *
 * // Handle callback
 * const tokens = await handleGoogleCallback(code, state);
 *
 * // Get client and fetch data
 * const client = await getGSCClient(platform, integrationId);
 * const analytics = await client.getAnalyticsByQuery(siteUrl, startDate, endDate);
 * ```
 */

// Client
export {
  GoogleSearchConsoleClient,
  getLastNDays,
  formatDateForGSC,
  getYesterdayDate,
  normalizeSiteUrl,
} from './client';

// Types
export type {
  SearchAnalyticsDimension,
  DeviceType,
  SearchAnalyticsQueryRequest,
  SearchAnalyticsRow,
  SearchAnalyticsResponse,
  SiteProperty,
} from './client';

// Sync Service
export {
  GscSyncService,
  createGscSyncService,
  performGscSync,
  needsGscSync,
  getRecommendedSyncInterval,
  type GscSyncOptions,
  type GscSyncResult,
} from './sync-service';

// Rate Limiter
export {
  GscRateLimiter,
  createGscRateLimiter,
  checkGscQuota,
  recordGscUsage,
  GSC_QUOTA_LIMITS,
  type GscQuotaUsage,
} from './rate-limiter';

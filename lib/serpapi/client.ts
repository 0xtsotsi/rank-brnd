/**
 * SerpAPI Client
 *
 * HTTP client for making requests to SerpAPI with retry logic,
 * rate limiting, and error handling.
 */

import type {
  SerpApiResponse,
  SerpSearchParams,
  SerpApiError,
} from '@/types/serpapi';
import {
  getSerpApiConfig,
  buildApiUrl,
  SERPAPI_ENDPOINTS,
  RATE_LIMIT_CONFIG,
} from './config';

// ============================================================================
// Request State Management
// ============================================================================

/**
 * In-memory cache for search results
 */
interface CacheEntry {
  data: SerpApiResponse;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requestCount: number;
  windowStart: number;
  activeRequests: number;
}

const rateLimiter: RateLimiterState = {
  requestCount: 0,
  windowStart: Date.now(),
  activeRequests: 0,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate cache key from search parameters
 */
function generateCacheKey(params: SerpSearchParams): string {
  const parts = [
    params.query,
    params.location || '',
    params.googleDomain || '',
    params.language || '',
    params.country || '',
    params.num || 10,
    params.start || 0,
    params.device || 'desktop',
  ];
  return parts.join('|');
}

/**
 * Check if cache entry is valid
 */
function isCacheEntryValid(entry: CacheEntry, ttl: number): boolean {
  const now = Date.now();
  return now - entry.timestamp < ttl * 1000;
}

/**
 * Wait for rate limit window
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const windowElapsed = now - rateLimiter.windowStart;

  // Reset window if elapsed
  if (windowElapsed > 1000) {
    rateLimiter.requestCount = 0;
    rateLimiter.windowStart = now;
  }

  // Wait if at limit
  while (rateLimiter.requestCount >= RATE_LIMIT_CONFIG.maxRequestsPerSecond) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    rateLimiter.requestCount = 0;
    rateLimiter.windowStart = Date.now();
  }

  // Wait for available concurrent slot
  while (
    rateLimiter.activeRequests >= RATE_LIMIT_CONFIG.maxConcurrentRequests
  ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parse SerpAPI error response
 */
function parseSerpApiError(response: unknown, status?: number): SerpApiError {
  if (typeof response === 'object' && response !== null) {
    const err = response as Record<string, unknown>;

    // SerpAPI error format
    if ('error' in err) {
      return {
        code: String(err.code || 'SERPAPI_ERROR'),
        message: String(err.error),
        status,
        details: err.details as Record<string, unknown> | undefined,
      };
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    status,
  };
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: SerpApiError): boolean {
  // Retry on rate limits, timeouts, and server errors
  if (error.status) {
    return error.status === 429 || error.status >= 500;
  }

  // Retry on specific error codes
  const retryableCodes = ['RATE_LIMIT', 'TIMEOUT', 'SERVER_ERROR'];
  return retryableCodes.some((code) => error.code.includes(code));
}

// ============================================================================
// Main Client Function
// ============================================================================

/**
 * Search options interface
 */
export interface SearchOptions {
  /** Skip cache */
  skipCache?: boolean;
  /** Maximum retries override */
  maxRetries?: number;
  /** Custom timeout in milliseconds */
  timeout?: number;
}

/**
 * Perform a search via SerpAPI
 *
 * @param params - Search parameters
 * @param options - Additional options
 * @returns Promise resolving to SerpApiResponse
 * @throws SerpApiException on API errors
 */
export async function search(
  params: SerpSearchParams,
  options: SearchOptions = {}
): Promise<SerpApiResponse> {
  const config = getSerpApiConfig();
  const maxRetries = options.maxRetries ?? config.maxRetries;
  const timeout = options.timeout ?? config.timeout;

  // Check cache first
  if (!options.skipCache && config.enableCache) {
    const cacheKey = generateCacheKey(params);
    const cached = searchCache.get(cacheKey);
    if (cached && isCacheEntryValid(cached, config.cacheTtl)) {
      return cached.data;
    }
  }

  // Rate limiting
  await waitForRateLimit();

  // Build request parameters
  const queryParams: Record<string, string | number | boolean> = {
    engine: 'google',
    q: params.query,
    google_domain:
      params.googleDomain || config.defaultSearchParams.googleDomain,
    hl: params.language || config.defaultSearchParams.language,
    gl: params.country || config.defaultSearchParams.country,
    num: params.num || config.defaultSearchParams.num,
    start: params.start || 0,
    device: params.device || config.defaultSearchParams.device,
    safe: params.safe || config.defaultSearchParams.safe,
  };

  if (params.location) {
    queryParams.location = params.location;
  }

  const url = buildApiUrl(SERPAPI_ENDPOINTS.GOOGLE_SEARCH, queryParams);

  // Retry loop
  let lastError: SerpApiError | null = null;
  let retryDelay = config.retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      rateLimiter.requestCount++;
      rateLimiter.activeRequests++;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Check for API errors
      if (!response.ok) {
        const error = parseSerpApiError(data, response.status);

        if (isRetryableError(error) && attempt < maxRetries) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryDelay *= RATE_LIMIT_CONFIG.backoffMultiplier;
          continue;
        }

        throw error;
      }

      // Check for error in response body
      if ('error' in data) {
        const error = parseSerpApiError(data);

        if (isRetryableError(error) && attempt < maxRetries) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryDelay *= RATE_LIMIT_CONFIG.backoffMultiplier;
          continue;
        }

        throw error;
      }

      // Cache successful response
      if (config.enableCache) {
        const cacheKey = generateCacheKey(params);
        searchCache.set(cacheKey, {
          data: data as SerpApiResponse,
          timestamp: Date.now(),
        });

        // Clean old entries
        cleanCache();
      }

      return data as SerpApiResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = {
          code: 'TIMEOUT',
          message: `Request timeout after ${timeout}ms`,
        };

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryDelay *= RATE_LIMIT_CONFIG.backoffMultiplier;
          continue;
        }
      } else if (error && typeof error === 'object' && 'code' in error) {
        lastError = error as SerpApiError;

        if (isRetryableError(lastError) && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retryDelay *= RATE_LIMIT_CONFIG.backoffMultiplier;
          continue;
        }
      } else {
        lastError = {
          code: 'FETCH_ERROR',
          message:
            error instanceof Error ? error.message : 'Unknown fetch error',
        };
      }

      throw lastError;
    } finally {
      rateLimiter.activeRequests--;
    }
  }

  // All retries exhausted
  throw lastError || { code: 'UNKNOWN', message: 'Max retries exceeded' };
}

/**
 * Fetch top 10 search results for a query
 *
 * Convenience function that sets num=10 and start=0
 *
 * @param query - Search query
 * @param params - Additional search parameters
 * @returns Promise resolving to top 10 organic results
 */
export async function fetchTop10Results(
  query: string,
  params: Omit<SerpSearchParams, 'query' | 'num' | 'start'> = {}
): Promise<SerpApiResponse> {
  return search({
    query,
    num: 10,
    start: 0,
    ...params,
  });
}

/**
 * Fetch multiple pages of results
 *
 * @param params - Search parameters
 * @param pages - Number of pages to fetch
 * @returns Promise resolving to combined results
 */
export async function fetchMultiplePages(
  params: SerpSearchParams,
  pages: number
): Promise<SerpApiResponse[]> {
  const results: SerpApiResponse[] = [];
  const numPerPage = params.num || 10;

  for (let page = 0; page < pages; page++) {
    const result = await search({
      ...params,
      start: page * numPerPage,
    });
    results.push(result);

    // Stop if no more results
    if (result.organicResults.length === 0) {
      break;
    }
  }

  return results;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all cached search results
 */
export function clearCache(): void {
  searchCache.clear();
}

/**
 * Remove expired cache entries
 */
function cleanCache(): void {
  const config = getSerpApiConfig();
  const now = Date.now();
  const ttl = config.cacheTtl * 1000;

  for (const [key, entry] of Array.from(searchCache.entries())) {
    if (now - entry.timestamp > ttl) {
      searchCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: number } {
  cleanCache();
  return {
    size: searchCache.size,
    entries: Array.from(searchCache.values()).length,
  };
}

// ============================================================================
// Account and API Info
// ============================================================================

/**
 * Get account information from SerpAPI
 *
 * @returns Promise resolving to account info
 */
export async function getAccountInfo(): Promise<{
  accountId: string;
  apiKey: string;
  accountEmail: string;
  plan: string;
  searchesThisMonth: number;
  searchesLimit: number;
  remainingSearches: number;
  rateLimitPerHour: number;
  lastHourSearches: number;
}> {
  const url = buildApiUrl(SERPAPI_ENDPOINTS.ACCOUNT);

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw parseSerpApiError(await response.json(), response.status);
  }

  const data = await response.json();

  // Handle both formats: direct data or nested in account_id
  return {
    accountId: data.account_id || data.accountId || '',
    apiKey: data.api_key || data.apiKey || '',
    accountEmail: data.account_email || data.accountEmail || '',
    plan: data.plan || 'unknown',
    searchesThisMonth: data.searches_this_month || data.searchesThisMonth || 0,
    searchesLimit: data.searches_limit || data.searchesLimit || 0,
    remainingSearches: data.remaining_searches || data.remainingSearches || 0,
    rateLimitPerHour: data.rate_limit_per_hour || data.rateLimitPerHour || 0,
    lastHourSearches: data.last_hour_searches || data.lastHourSearches || 0,
  };
}

/**
 * SerpAPI Configuration
 *
 * Configuration management for SerpAPI integration including
 * environment variables, defaults, and validation.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * SerpAPI configuration options
 */
export interface SerpApiConfig {
  /** API key for SerpAPI */
  apiKey: string;
  /** Base URL for SerpAPI */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial retry delay in milliseconds */
  retryDelay: number;
  /** Enable result caching */
  enableCache: boolean;
  /** Cache TTL in seconds */
  cacheTtl: number;
  /** Default search parameters */
  defaultSearchParams: {
    googleDomain: string;
    language: string;
    country: string;
    device: 'desktop' | 'mobile' | 'tablet';
    safe: 'active' | 'off';
    num: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * SerpAPI endpoint paths
 */
export const SERPAPI_ENDPOINTS = {
  GOOGLE_SEARCH: '/search',
  ACCOUNT: '/account',
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  maxRequestsPerSecond: 5,
  maxConcurrentRequests: 3,
  backoffMultiplier: 2,
} as const;

// ============================================================================
// Configuration Cache
// ============================================================================

let configCache: SerpApiConfig | null = null;

/**
 * Get SerpAPI configuration from environment
 *
 * Reads configuration from environment variables with sensible defaults.
 * Caches the result for subsequent calls.
 */
export function getSerpApiConfig(): SerpApiConfig {
  if (configCache) {
    return configCache;
  }

  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'SERPAPI_API_KEY environment variable is not set. ' +
        'Get your API key from https://serpapi.com/ and set it in your environment.'
    );
  }

  configCache = {
    apiKey,
    baseUrl: process.env.SERPAPI_BASE_URL || 'https://serpapi.com',
    timeout: parseInt(process.env.SERPAPI_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.SERPAPI_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.SERPAPI_RETRY_DELAY || '1000', 10),
    enableCache: process.env.SERPAPI_ENABLE_CACHE !== 'false',
    cacheTtl: parseInt(process.env.SERPAPI_CACHE_TTL || '3600', 10),
    defaultSearchParams: {
      googleDomain: process.env.SERPAPI_DEFAULT_DOMAIN || 'google.com',
      language: process.env.SERPAPI_DEFAULT_LANGUAGE || 'en',
      country: process.env.SERPAPI_DEFAULT_COUNTRY || 'us',
      device:
        (process.env.SERPAPI_DEFAULT_DEVICE as
          | 'desktop'
          | 'mobile'
          | 'tablet') || 'desktop',
      safe: (process.env.SERPAPI_DEFAULT_SAFE as 'active' | 'off') || 'off',
      num: parseInt(process.env.SERPAPI_DEFAULT_NUM || '10', 10),
    },
  };

  return configCache;
}

/**
 * Load and validate SerpAPI configuration
 *
 * Returns the configuration or throws if invalid.
 */
export function loadSerpApiConfig(): SerpApiConfig {
  return getSerpApiConfig();
}

/**
 * Reset the configuration cache
 *
 * Useful for testing or when environment variables change.
 */
export function resetConfigCache(): void {
  configCache = null;
}

/**
 * Build API URL with parameters
 *
 * @param endpoint - The API endpoint path
 * @param params - Query parameters to include
 * @returns Full URL with API key and parameters
 */
export function buildApiUrl(
  endpoint: string,
  params: Record<string, string | number | boolean> = {}
): string {
  const config = getSerpApiConfig();

  const queryParams = new URLSearchParams({
    api_key: config.apiKey,
    engine: 'google',
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
      ])
    ),
  });

  return `${config.baseUrl}${endpoint}?${queryParams.toString()}`;
}

/**
 * Check if SerpAPI is configured
 *
 * Returns true if API key is set, false otherwise.
 */
export function isSerpApiConfigured(): boolean {
  try {
    getSerpApiConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate SerpAPI configuration
 *
 * Throws an error if configuration is invalid.
 */
export function validateSerpApiConfiguration(): {
  valid: boolean;
  error?: string;
} {
  try {
    const config = getSerpApiConfig();

    if (!config.apiKey || config.apiKey.length === 0) {
      return { valid: false, error: 'API key is missing or empty' };
    }

    if (config.timeout < 1000) {
      return { valid: false, error: 'Timeout must be at least 1000ms' };
    }

    if (config.maxRetries < 0 || config.maxRetries > 10) {
      return { valid: false, error: 'Max retries must be between 0 and 10' };
    }

    if (config.cacheTtl < 0) {
      return { valid: false, error: 'Cache TTL must be non-negative' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : 'Unknown configuration error',
    };
  }
}

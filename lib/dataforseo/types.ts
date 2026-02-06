/**
 * DataForSEO Keyword Data API Types
 *
 * Types for DataForSEO Keyword Data API used for keyword research.
 * DataForSEO Docs: https://docs.dataforseo.com/v3/keyword_data/
 */

// ============================================================================
// Common Types
// ============================================================================

export interface DataForSEOError {
  code: number;
  message: string;
  errors?: Array<{
    code: number;
    message: string;
  }>;
}

export interface DataForSEOOptions {
  apiBaseUrl?: string;
  apiVersion?: string;
  timeout?: number;
}

export interface DataForSEOAuthConfig {
  username: string;
  password: string;
}

// ============================================================================
// Keyword Data API Request Types
// ============================================================================

/**
 * Device type for keyword data requests
 */
export type KeywordDevice = 'desktop' | 'mobile' | 'tablet';

/**
 * Search engine type
 */
export type SearchEngine = 'google' | 'bing' | 'yahoo';

// ============================================================================
// Keyword Data Task Request Types
// ============================================================================

/**
 * Base keyword data task request
 */
export interface KeywordDataTaskRequest {
  keyword: string;
  location_code: number;
  language_code: string;
  include_kd?: boolean; // Keyword difficulty
  include_volume?: boolean; // Search volume
  include_opportunity?: boolean; // Opportunity score
  include_cpc?: boolean; // Cost per click
  includeSERPInfo?: boolean; // SERP information
}

// ============================================================================
// Keyword Data API Response Types
// ============================================================================

/**
 * Keyword data task result
 */
export interface KeywordDataTaskResult {
  keyword?: string;
  keyword_length?: number;
  keyword_volume?: number;
  keyword_difficulty?: number;
  keyword_positive_trend?: number;
  keyword_negative_trend?: number;
  keyword_opportunity?: number;
  max_cpc?: number;
  avg_backlinks?: number;
  avg_traffic?: number;
  competition?: number;
  SERPInfo?: SERPInfo;
}

/**
 * SERP information for keyword
 */
export interface SERPInfo {
  se_type?: string;
  check_url?: string;
  se_results_count?: number;
  items_count?: number;
  items?: SERPItem[];
}

/**
 * SERP item
 */
export interface SERPItem {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position?: string;
  xpath?: string;
}

/**
 * Keyword suggestions item
 */
export interface KeywordSuggestionItem {
  keyword: string;
  keyword_length: number;
  keyword_difficulty: number;
  keyword_volume: number;
  keyword_positive_trend: number;
  keyword_negative_trend: number;
  keyword_opportunity: number;
  max_cpc: number;
  avg_backlinks: number;
  avg_traffic: number;
  competition: number;
}

/**
 * Keyword suggestions response
 */
export interface KeywordSuggestionsResponse {
  keyword?: string;
  location_code?: number;
  language_code?: string;
  total_count?: number;
  items?: KeywordSuggestionItem[];
}

// ============================================================================
// API Response Wrapper
// ============================================================================

/**
 * DataForSEO API response
 */
export interface DataForSEOResponse<T> {
  status_code: number;
  status_message: string;
  time: string;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path?: Array<{
      type: string;
      key: string;
      value?: string;
    }>;
    result?: T[];
    endpoint?: string;
  }>;
  tasks_limit?: number;
  tasks_filtered?: number;
}

// ============================================================================
// Location Code Mapping
// ============================================================================

/**
 * Common location codes for DataForSEO
 * Full list: https://docs.dataforseo.com/v3/serp_api/google/locations/
 */
export interface LocationInfo {
  code: number;
  name: string;
  iso_code: string;
}

export const COMMON_LOCATIONS: Record<string, LocationInfo> = {
  us: { code: 2840, name: 'United States', iso_code: 'US' },
  uk: { code: 2826, name: 'United Kingdom', iso_code: 'GB' },
  gb: { code: 2826, name: 'United Kingdom', iso_code: 'GB' },
  ca: { code: 2124, name: 'Canada', iso_code: 'CA' },
  au: { code: 2128, name: 'Australia', iso_code: 'AU' },
  de: { code: 2276, name: 'Germany', iso_code: 'DE' },
  fr: { code: 2130, name: 'France', iso_code: 'FR' },
  es: { code: 2238, name: 'Spain', iso_code: 'ES' },
  it: { code: 2294, name: 'Italy', iso_code: 'IT' },
  nl: { code: 2320, name: 'Netherlands', iso_code: 'NL' },
  in: { code: 2270, name: 'India', iso_code: 'IN' },
  sg: { code: 2138, name: 'Singapore', iso_code: 'SG' },
  global: { code: 2840, name: 'United States', iso_code: 'US' },
};

/**
 * Get location code from ISO country code
 */
export function getLocationCode(isoCode: string): number {
  const normalized = isoCode.toLowerCase().trim();
  return COMMON_LOCATIONS[normalized]?.code ?? COMMON_LOCATIONS.us.code;
}

/**
 * Get location info from ISO country code
 */
export function getLocationInfo(isoCode: string): LocationInfo | null {
  const normalized = isoCode.toLowerCase().trim();
  return COMMON_LOCATIONS[normalized] ?? null;
}

// ============================================================================
// Language Code Mapping
// ============================================================================

export const COMMON_LANGUAGES: Record<string, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh',
  ar: 'ar',
  hi: 'hi',
  ru: 'ru',
  nl: 'nl',
  pl: 'pl',
  sv: 'sv',
  da: 'da',
  fi: 'fi',
  no: 'no',
  tr: 'tr',
};

/**
 * Get language code, defaulting to English if not found
 */
export function getLanguageCode(lang: string): string {
  const normalized = lang.toLowerCase().trim().substring(0, 2);
  return COMMON_LANGUAGES[normalized] ?? 'en';
}

// ============================================================================
// Search Intent Types
// ============================================================================

export type SearchIntent =
  | 'informational'
  | 'navigational'
  | 'transactional'
  | 'commercial';

// ============================================================================
// Keyword Research Result Types
// ============================================================================

export interface KeywordMetrics {
  /** Monthly search volume */
  searchVolume: number;
  /** Keyword difficulty (0-100, higher is harder) */
  difficulty: number;
  /** Opportunity score (higher is better) */
  opportunity: number;
  /** Cost per click in USD */
  cpc: number;
  /** Competition level (0-1) */
  competition: number;
  /** Search trend data */
  trend: {
    positive: number;
    negative: number;
  };
  /** Average backlinks */
  backlinks: number;
  /** Average traffic */
  traffic: number;
}

export interface BatchKeywordDataResult {
  keyword: string;
  success: boolean;
  data?: KeywordDataTaskResult;
  error?: string;
}

export interface KeywordResearchResult {
  keyword: string;
  metrics: KeywordMetrics;
  intent: SearchIntent;
  recommended: boolean;
}

export interface KeywordSuggestionResult extends KeywordMetrics {
  keyword: string;
}

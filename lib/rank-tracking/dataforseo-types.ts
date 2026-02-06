/**
 * DataForSEO SERP API Types
 *
 * Types for DataForSEO SERP API used for rank tracking.
 * DataForSEO Docs: https://docs.dataforseo.com/v3/serp_api/
 */

// ============================================================================
// Common Types
// ============================================================================

export interface DataForSEORankTrackerError {
  code: number;
  message: string;
  errors?: Array<{
    code: number;
    message: string;
  }>;
}

export interface DataForSEORankTrackerOptions {
  apiBaseUrl?: string;
  apiVersion?: string;
  timeout?: number;
}

export interface DataForSEOAuthConfig {
  username: string;
  password: string;
}

// ============================================================================
// SERP API Request Types
// ============================================================================

/**
 * Device type for SERP requests
 */
export type SERPDevice = 'desktop' | 'mobile' | 'tablet';

/**
 * Search engine type
 */
export type SearchEngine = 'google' | 'bing' | 'yahoo' | 'baidu' | 'yandex';

/**
 * SERP type for different search results
 */
export type SERPType =
  | 'organic'
  | 'maps'
  | 'news'
  | 'images'
  | 'videos'
  | 'shopping'
  | 'universal';

/**
 * Base SERP task request
 */
export interface SERPTaskRequest {
  keyword: string;
  location_code: number;
  language_code: string;
  device?: SERPDevice;
  os?: string;
  depth?: number;
  max_results?: number;
}

/**
 * Google Organic SERP task request
 */
export interface GoogleOrganicSerpTaskRequest extends SERPTaskRequest {
  keyword: string;
  location_code: number;
  language_code: string;
  device?: SERPDevice;
  depth?: number;
  max_results?: number;
  calculate_rectangles?: boolean;
  filter?: Array<'youtube' | 'tiktok' | 'linkedin' | 'amazon'>;
  search_params?: SERPSearchParams;
}

export interface SERPSearchParams {
  device?: SERPDevice;
  os?: string;
  tba?: boolean; // to be added
  inverted_domain?: string;
  inverted_domain_name?: string;
  sort_by?: string;
  date?: string;
}

// ============================================================================
// SERP API Response Types
// ============================================================================

/**
 * SERP item base interface
 */
export interface SERPItemBase {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position?: string;
  xpath?: string;
}

/**
 * Organic search result item
 */
export interface OrganicItem extends SERPItemBase {
  type: 'organic';
  domain: string;
  title: string;
  url: string;
  description: string;
  breadcrumbs?: string[];
  links?: Array<{
    type: string;
    title: string;
    url: string;
  }>;
  favicon?: string;
  price?: PriceInfo;
  rating?: RatingInfo;
  highlighted?: string[];
  about_this_result?: AboutThisResult;
}

export interface PriceInfo {
  current?: number;
  regular?: number;
  currency?: string;
}

export interface RatingInfo {
  rating_type?: string;
  rating_value?: number;
  votes?: number;
  rating_min?: number;
  rating_max?: number;
}

export interface AboutThisResult {
  source?: {
    description?: string;
    logo?: string;
  };
}

/**
 * Featured snippet item
 */
export interface FeaturedSnippetItem extends SERPItemBase {
  type: 'featured_snippet';
  title: string;
  description: string;
  domain: string;
  url: string;
  variant?: string;
  images?: string[];
  table?: SERPTable;
}

export interface SERPTable {
  headers: string[];
  rows: string[][];
}

/**
 * Knowledge panel item
 */
export interface KnowledgePanelItem extends SERPItemBase {
  type: 'knowledge_graph';
  title: string;
  subtitle?: string;
  description?: string;
  images?: string[];
  details?: Array<{
    type: string;
    title: string;
    value?: string;
    items?: Array<{
      title: string;
      value?: string;
    }>;
  }>;
}

/**
 * Local pack item
 */
export interface LocalPackItem extends SERPItemBase {
  type: 'local_pack';
  title: string;
  items?: Array<{
    type: string;
    rank_group: number;
    title: string;
    description?: string;
    phone?: string;
    address?: string;
    rating?: RatingInfo;
    reviews?: number;
    links?: Array<{
      type: string;
      url: string;
    }>;
    latitude?: number;
    longitude?: number;
  }>;
}

/**
 * Any SERP item type
 */
export type SERPItem =
  | OrganicItem
  | FeaturedSnippetItem
  | KnowledgePanelItem
  | LocalPackItem
  | SERPItemBase;

/**
 * Task result for SERP request
 */
export interface SERPTaskResult {
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
  items?: SERPItem[];
  keyword?: string;
  se_domain?: string;
  location_code: number;
  language_code: string;
  check_url?: string;
  total_results_count?: number;
  updated_time?: string;
  items_count?: number;
  se_results_count?: number;
}

/**
 * SERP API response
 */
export interface SERPResponse {
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
    result?: SERPTaskResult[];
    endpoint?: string;
  }>;
  tasks_limit?: number;
  tasks_filtered?: number;
}

// ============================================================================
// Rank Tracking Result Types
// ============================================================================

/**
 * Position result for a tracked keyword
 */
export interface RankPositionResult {
  keyword: string;
  domain: string;
  position: number;
  url: string;
  device: SERPDevice;
  location_code: number;
  location_name: string;
  language_code: string;
  total_results: number;
  searched_at: string;
}

/**
 * Rank tracking result with multiple positions
 */
export interface RankTrackingResult {
  keyword: string;
  keyword_id?: string;
  product_id?: string;
  positions: Array<{
    position: number;
    url: string;
    domain: string;
    title?: string;
    description?: string;
  }>;
  device: SERPDevice;
  location_code: number;
  location_name: string;
  language_code: string;
  total_results?: number;
  searched_at: string;
  cost: number;
}

/**
 * Bulk rank tracking result
 */
export interface BulkRankTrackingResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    keyword: string;
    keyword_id?: string;
    success: boolean;
    result?: RankTrackingResult;
    error?: string;
  }>;
  total_cost: number;
  duration_ms: number;
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
  uk: { code: 2840, name: 'United Kingdom', iso_code: 'GB' },
  gb: { code: 2840, name: 'United Kingdom', iso_code: 'GB' },
  ca: { code: 2124, name: 'Canada', iso_code: 'CA' },
  au: { code: 2724, name: 'Australia', iso_code: 'AU' },
  de: { code: 2276, name: 'Germany', iso_code: 'DE' },
  fr: { code: 2130, name: 'France', iso_code: 'FR' },
  es: { code: 2246, name: 'Spain', iso_code: 'ES' },
  it: { code: 2380, name: 'Italy', iso_code: 'IT' },
  jp: { code: 2764, name: 'Japan', iso_code: 'JP' },
  in: { code: 2256, name: 'India', iso_code: 'IN' },
  br: { code: 2076, name: 'Brazil', iso_code: 'BR' },
  mx: { code: 2472, name: 'Mexico', iso_code: 'MX' },
  nl: { code: 2358, name: 'Netherlands', iso_code: 'NL' },
  se: { code: 2548, name: 'Sweden', iso_code: 'SE' },
  no: { code: 2460, name: 'Norway', iso_code: 'NO' },
  dk: { code: 2118, name: 'Denmark', iso_code: 'DK' },
  fi: { code: 2250, name: 'Finland', iso_code: 'FI' },
  pl: { code: 2504, name: 'Poland', iso_code: 'PL' },
  ch: { code: 2528, name: 'Switzerland', iso_code: 'CH' },
  at: { code: 2024, name: 'Austria', iso_code: 'AT' },
  be: { code: 2120, name: 'Belgium', iso_code: 'BE' },
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

/**
 * DataForSEO Keyword Research Library
 *
 * High-level service functions for keyword research operations.
 * Provides a simplified interface for common keyword research tasks.
 */

import type {
  KeywordDataTaskResult,
  KeywordSuggestionItem,
  SearchIntent,
  KeywordMetrics,
  KeywordSuggestionResult,
} from './types';
import { DataForSEOKeywordClient } from './keyword-client';

// ============================================================================
// Common Location and Language Codes
// ============================================================================

export const LocationCodes = {
  UNITED_STATES: 2840,
  UNITED_KINGDOM: 2826,
  CANADA: 2124,
  AUSTRALIA: 2128,
  GERMANY: 2276,
  FRANCE: 2130,
  SPAIN: 2238,
  ITALY: 2294,
  NETHERLANDS: 2320,
  INDIA: 2270,
  SINGAPORE: 2138,
} as const;

export const LanguageCodes = {
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
  GERMAN: 'de',
  ITALIAN: 'it',
  DUTCH: 'nl',
  PORTUGUESE: 'pt',
  JAPANESE: 'ja',
  CHINESE: 'zh',
  KOREAN: 'ko',
  HINDI: 'hi',
} as const;

// ============================================================================
// Keyword Research Options
// ============================================================================

export interface KeywordResearchOptions {
  locationCode?: number;
  languageCode?: string;
  includeDifficulty?: boolean;
  includeVolume?: boolean;
  includeOpportunity?: boolean;
  includeCpc?: boolean;
}

export interface BatchKeywordResearchOptions extends KeywordResearchOptions {
  keywords: string[];
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get comprehensive keyword metrics
 *
 * Returns search volume, difficulty, opportunity score, CPC, and more
 * for a single keyword.
 *
 * @param keyword - The keyword to research
 * @param options - Research options
 * @param client - Optional DataForSEO client (creates one if not provided)
 * @returns Keyword metrics or null if request fails
 */
export async function getKeywordMetrics(
  keyword: string,
  options: KeywordResearchOptions = {},
  client?: DataForSEOKeywordClient
): Promise<KeywordMetrics | null> {
  const dfClient = client ?? createClient();

  if (!dfClient) {
    throw new Error('DataForSEO credentials not configured');
  }

  const result = await dfClient.getKeywordData(keyword, options);

  if (!result) {
    return null;
  }

  return transformToKeywordMetrics(result);
}

/**
 * Get metrics for multiple keywords
 *
 * Processes up to 100 keywords in a single batch request.
 *
 * @param keywords - Array of keywords to research
 * @param options - Research options
 * @param client - Optional DataForSEO client
 * @returns Array of keyword metrics
 */
export async function getBatchKeywordMetrics(
  keywords: string[],
  options: KeywordResearchOptions = {},
  client?: DataForSEOKeywordClient
): Promise<KeywordMetrics[]> {
  const dfClient = client ?? createClient();

  if (!dfClient) {
    throw new Error('DataForSEO credentials not configured');
  }

  const requests = keywords
    .slice(0, 100)
    .map((keyword) => dfClient.createRequest(keyword, options));

  const results = await dfClient.getKeywordDataBatch(requests);

  return results.map(transformToKeywordMetrics);
}

/**
 * Get keyword suggestions
 *
 * Returns related keyword suggestions for a seed keyword with metrics.
 *
 * @param seedKeyword - The seed keyword
 * @param options - Research options
 * @param limit - Number of suggestions to return (max 100)
 * @param client - Optional DataForSEO client
 * @returns Keyword suggestions with metrics
 */
export async function getKeywordSuggestions(
  seedKeyword: string,
  options: KeywordResearchOptions = {},
  limit = 50,
  client?: DataForSEOKeywordClient
): Promise<KeywordSuggestionResult[]> {
  const dfClient = client ?? createClient();

  if (!dfClient) {
    throw new Error('DataForSEO credentials not configured');
  }

  const result = await dfClient.getKeywordSuggestions(
    seedKeyword,
    options.locationCode ?? LocationCodes.UNITED_STATES,
    options.languageCode ?? LanguageCodes.ENGLISH,
    { limit }
  );

  if (!result?.items) {
    return [];
  }

  return result.items.map((item) => ({
    keyword: item.keyword,
    ...transformSuggestionToMetrics(item),
  }));
}

/**
 * Get keyword difficulty score
 *
 * Returns a difficulty score from 0-100, where higher is harder to rank.
 *
 * @param keyword - The keyword to check
 * @param options - Research options
 * @param client - Optional DataForSEO client
 * @returns Difficulty score (0-100) or null if request fails
 */
export async function getKeywordDifficulty(
  keyword: string,
  options: KeywordResearchOptions = {},
  client?: DataForSEOKeywordClient
): Promise<number | null> {
  const dfClient = client ?? createClient();

  if (!dfClient) {
    throw new Error('DataForSEO credentials not configured');
  }

  return await dfClient.getKeywordDifficulty(
    keyword,
    options.locationCode ?? LocationCodes.UNITED_STATES,
    options.languageCode ?? LanguageCodes.ENGLISH
  );
}

/**
 * Get search volume for a keyword
 *
 * @param keyword - The keyword to check
 * @param options - Research options
 * @param client - Optional DataForSEO client
 * @returns Monthly search volume or null if request fails
 */
export async function getSearchVolume(
  keyword: string,
  options: KeywordResearchOptions = {},
  client?: DataForSEOKeywordClient
): Promise<number | null> {
  const metrics = await getKeywordMetrics(keyword, options, client);
  return metrics?.searchVolume ?? null;
}

/**
 * Calculate keyword opportunity score
 *
 * Higher scores indicate better ranking opportunities.
 * Considers volume, difficulty, and competition.
 *
 * @param keyword - The keyword to analyze
 * @param options - Research options
 * @param client - Optional DataForSEO client
 * @returns Opportunity score (0-100+) or null if request fails
 */
export async function getOpportunityScore(
  keyword: string,
  options: KeywordResearchOptions = {},
  client?: DataForSEOKeywordClient
): Promise<number | null> {
  const metrics = await getKeywordMetrics(keyword, options, client);
  return metrics?.opportunity ?? null;
}

/**
 * Determine search intent for a keyword
 *
 * @param keyword - The keyword to analyze
 * @param client - Optional DataForSEO client
 * @returns Search intent type
 */
export function getSearchIntent(
  keyword: string,
  client?: DataForSEOKeywordClient
): SearchIntent {
  const dfClient = client ?? createClient();

  if (dfClient) {
    return dfClient.determineSearchIntent(keyword);
  }

  // Fallback basic intent detection
  const lowerKeyword = keyword.toLowerCase();

  const transactionalWords = [
    'buy',
    'purchase',
    'order',
    'cheap',
    'discount',
    'sale',
  ];
  const commercialWords = ['best', 'top', 'review', 'comparison', 'compare'];
  const navigationalPatterns = ['.com', 'www', 'login', 'facebook', 'google'];

  if (transactionalWords.some((word) => lowerKeyword.includes(word))) {
    return 'transactional';
  }
  if (commercialWords.some((word) => lowerKeyword.includes(word))) {
    return 'commercial';
  }
  if (navigationalPatterns.some((pattern) => lowerKeyword.includes(pattern))) {
    return 'navigational';
  }

  return 'informational';
}

/**
 * Full keyword research analysis
 *
 * Returns comprehensive analysis including metrics, intent, and opportunity score.
 *
 * @param keyword - The keyword to research
 * @param options - Research options
 * @param client - Optional DataForSEO client
 * @returns Complete keyword analysis
 */
export async function researchKeyword(
  keyword: string,
  options: KeywordResearchOptions = {},
  client?: DataForSEOKeywordClient
): Promise<{
  keyword: string;
  metrics: KeywordMetrics;
  intent: SearchIntent;
  recommended: boolean;
} | null> {
  try {
    const metrics = await getKeywordMetrics(keyword, options, client);
    const intent = getSearchIntent(keyword, client);

    if (!metrics) {
      return null;
    }

    return {
      keyword,
      metrics,
      intent,
      recommended: isKeywordRecommended(metrics),
    };
  } catch (error) {
    console.error(`Error researching keyword "${keyword}":`, error);
    throw error;
  }
}

/**
 * Research multiple keywords with full analysis
 *
 * @param keywords - Keywords to research
 * @param options - Research options
 * @param client - Optional DataForSEO client
 * @returns Array of keyword research results
 */
export async function researchKeywordsBatch(
  keywords: string[],
  options: KeywordResearchOptions = {},
  client?: DataForSEOKeywordClient
): Promise<
  Array<{
    keyword: string;
    metrics: KeywordMetrics;
    intent: SearchIntent;
    recommended: boolean;
  }>
> {
  const metrics = await getBatchKeywordMetrics(keywords, options, client);

  return metrics.map((metric, i) => ({
    keyword: keywords[i],
    metrics: metric,
    intent: getSearchIntent(keywords[i], client),
    recommended: isKeywordRecommended(metric),
  }));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a DataForSEO client from environment
 */
function createClient(): DataForSEOKeywordClient | null {
  // Try to get from process.env first
  if (typeof process !== 'undefined' && process.env) {
    const username = process.env.DATAFORSEO_USERNAME;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (username && password) {
      return new DataForSEOKeywordClient({ username, password });
    }
  }

  return null;
}

/**
 * Transform API result to KeywordMetrics
 */
function transformToKeywordMetrics(
  result: KeywordDataTaskResult
): KeywordMetrics {
  return {
    searchVolume: result.keyword_volume ?? 0,
    difficulty: result.keyword_difficulty ?? 0,
    opportunity: result.keyword_opportunity ?? 0,
    cpc: result.max_cpc ?? 0,
    competition: result.competition ?? 0,
    trend: {
      positive: result.keyword_positive_trend ?? 0,
      negative: result.keyword_negative_trend ?? 0,
    },
    backlinks: result.avg_backlinks ?? 0,
    traffic: result.avg_traffic ?? 0,
  };
}

/**
 * Transform suggestion item to KeywordMetrics
 */
function transformSuggestionToMetrics(
  item: KeywordSuggestionItem
): Omit<KeywordMetrics, 'keyword'> {
  return {
    searchVolume: item.keyword_volume ?? 0,
    difficulty: item.keyword_difficulty ?? 0,
    opportunity: item.keyword_opportunity ?? 0,
    cpc: item.max_cpc ?? 0,
    competition: item.competition ?? 0,
    trend: {
      positive: item.keyword_positive_trend ?? 0,
      negative: item.keyword_negative_trend ?? 0,
    },
    backlinks: item.avg_backlinks ?? 0,
    traffic: item.avg_traffic ?? 0,
  };
}

/**
 * Determine if a keyword is recommended based on metrics
 */
function isKeywordRecommended(metrics: KeywordMetrics): boolean {
  // Simple recommendation logic:
  // - Volume > 100 (has some demand)
  // - Difficulty < 70 (not too competitive)
  // - Opportunity > 10 (decent opportunity)
  return (
    metrics.searchVolume > 100 &&
    metrics.difficulty < 70 &&
    metrics.opportunity > 10
  );
}

// Re-export types
export * from './types';
export { DataForSEOKeywordClient } from './keyword-client';

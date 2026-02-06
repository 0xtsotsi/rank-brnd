/**
 * SerpAPI Integration
 *
 * Main entry point for SerpAPI functionality.
 * Exports all types, client functions, and analyzers.
 */

// ============================================================================
// Types
// ============================================================================

import type {
  SerpSearchParams,
  OrganicResult,
  RichSnippet,
  Sitelink,
  PeopleAlsoAsk,
  RelatedSearch,
  KnowledgeGraph,
  FeaturedSnippet,
  LocalResult,
  SerpApiResponse,
  SearchInformation,
  CompetitorContentStructure,
  ContentType,
  SeoIndicators,
  SerpAnalysisSummary,
  ContentGap,
  ContentRecommendation,
  SerpAnalysis,
  SerpAnalysisInsert,
  SerpAnalysisStatus,
  SerpApiError,
} from '@/types/serpapi';

export type {
  // Search parameters
  SerpSearchParams,

  // Search results
  OrganicResult,
  RichSnippet,
  Sitelink,

  // SERP features
  PeopleAlsoAsk,
  RelatedSearch,
  KnowledgeGraph,
  FeaturedSnippet,
  LocalResult,

  // Response
  SerpApiResponse,
  SearchInformation,

  // Analysis
  CompetitorContentStructure,
  ContentType,
  SeoIndicators,
  SerpAnalysisSummary,
  ContentGap,
  ContentRecommendation,

  // Database types
  SerpAnalysis,
  SerpAnalysisInsert,
  SerpAnalysisStatus,

  // Errors
  SerpApiError,
};

export { SerpSearchParamsSchema, SerpApiException } from '@/types/serpapi';

// ============================================================================
// Configuration
// ============================================================================

export type { SerpApiConfig } from './config';
export {
  getSerpApiConfig,
  loadSerpApiConfig,
  resetConfigCache,
  buildApiUrl,
  SERPAPI_ENDPOINTS,
  RATE_LIMIT_CONFIG,
  isSerpApiConfigured,
  validateSerpApiConfiguration,
} from './config';

// ============================================================================
// Client
// ============================================================================

export type { SearchOptions } from './client';
export {
  search,
  fetchTop10Results,
  fetchMultiplePages,
  extractDomain,
  getAccountInfo,
  clearCache,
  getCacheStats,
} from './client';

// ============================================================================
// Analyzer
// ============================================================================

export {
  classifyContentType,
  extractSeoIndicators,
  analyzeCompetitor,
  analyzeCompetitors,
  identifyContentGaps,
  generateRecommendations,
  analyzeSerp,
  getDomainDistribution,
  getContentTypeDistribution,
  getCommonSeoPatterns,
} from './analyzer';

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick analysis function - fetch SERP results and analyze in one call
 *
 * @param query - Search query
 * @param params - Optional search parameters
 * @returns Complete SERP analysis summary
 */
export async function quickAnalyze(
  query: string,
  params?: Omit<SerpSearchParams, 'query'>
) {
  const { fetchTop10Results } = await import('./client');
  const { analyzeSerp } = await import('./analyzer');

  const response = await fetchTop10Results(query, params || {});
  const searchParams: SerpSearchParams = { query, ...(params || {}) };

  return analyzeSerp(response, searchParams);
}

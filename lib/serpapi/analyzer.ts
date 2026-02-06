/**
 * SERP Analyzer
 *
 * Analyzes SERP results to extract competitor content structure,
 * SEO indicators, and generate actionable recommendations.
 */

import type {
  SerpApiResponse,
  SerpSearchParams,
  OrganicResult,
  CompetitorContentStructure,
  SeoIndicators,
  ContentType,
  SerpAnalysisSummary,
  ContentGap,
  ContentRecommendation,
} from '@/types/serpapi';
import { extractDomain } from './client';

// ============================================================================
// Content Type Classification
// ============================================================================

/**
 * Content type detection patterns
 */
const CONTENT_PATTERNS: Record<ContentType, RegExp[]> = {
  blog_post: [
    /\/blog\//i,
    /\/post\//i,
    /\/article\//i,
    /\/news\//i,
    /\/\d{4}\/\d{2}\//, // Date-based URLs
  ],
  product_page: [/\/product\//i, /\/item\//i, /\/p\//i, /\/buy/i],
  category_page: [
    /\/category\//i,
    /\/cat\//i,
    /\/collections?\//i,
    /\/shop\//i,
    /\/products?$/i,
  ],
  homepage: [/^https?:\/\/[^\/]+\/?$/],
  landing_page: [/\/lp\//i, /\/landing\//i, /\/campaign\//i],
  documentation: [
    /\/docs?\//i,
    /\/documentation/i,
    /\/help\//i,
    /\/guide\//i,
    /\/tutorial\//i,
  ],
  news_article: [/\/news\//i, /\/press\//i, /\/story\//i],
  video: [/youtube\.com/i, /vimeo\.com/i, /\/video\//i, /watch\?v=/i],
  forum: [
    /reddit\.com/i,
    /\/forum\//i,
    /\/discussion\//i,
    /\/thread\//i,
    /stackexchange\.com/i,
    /stackoverflow\.com/i,
  ],
  comparison: [/vs\.?$/i, /compare/i, /alternative/i, /review/i],
  review: [/\/review/i, /\/rating/i, /\/test/i],
  how_to: [/how[- ]to/i, /guide[- ]to/i, /step[- ]by[- ]step/i],
  listicle: [/\d+\s+(ways?|tips?|ideas?|examples?|best)/i],
  unknown: [],
};

/**
 * Classify content type from URL and snippet
 */
export function classifyContentType(result: OrganicResult): ContentType {
  const url = result.link.toLowerCase();
  const title = result.title.toLowerCase();
  const snippet = result.snippet.toLowerCase();

  for (const [type, patterns] of Object.entries(CONTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url) || pattern.test(title) || pattern.test(snippet)) {
        return type as ContentType;
      }
    }
  }

  return 'unknown';
}

// ============================================================================
// SEO Indicator Extraction
// ============================================================================

/**
 * Determine URL structure type
 */
function getUrlStructure(
  url: URL
): 'clean' | 'parameterized' | 'dated' | 'mixed' {
  const hasParams = url.search.length > 0;
  const hasDate = /\d{4}\/\d{2}\/\d{2}/.test(url.pathname);

  if (hasDate) return 'dated';
  if (hasParams && url.pathname === '/') return 'parameterized';
  if (hasParams) return 'mixed';
  return 'clean';
}

/**
 * Estimate domain authority tier based on domain patterns
 */
function estimateAuthorityTier(
  domain: string
): 'high' | 'medium' | 'low' | 'unknown' {
  const highAuthorityDomains = [
    'wikipedia.org',
    'youtube.com',
    'amazon.com',
    'facebook.com',
    'linkedin.com',
    'reddit.com',
    'stackoverflow.com',
    'quora.com',
    'medium.com',
    'github.com',
    'nytimes.com',
    'bbc.com',
    'cnn.com',
    'forbes.com',
    'hbr.org',
  ];

  const domainLower = domain.toLowerCase();

  // Check for high authority TLDs
  if (domainLower.endsWith('.gov') || domainLower.endsWith('.edu')) {
    return 'high';
  }

  // Check for known high authority domains
  for (const highDomain of highAuthorityDomains) {
    if (domainLower.includes(highDomain) || domainLower.endsWith(highDomain)) {
      return 'high';
    }
  }

  // Medium authority indicators
  const mediumIndicators = ['.com.', '.org.', '.net.', '.co.'];
  for (const indicator of mediumIndicators) {
    if (domainLower.includes(indicator)) {
      return 'medium';
    }
  }

  return 'low';
}

/**
 * Extract SEO indicators from an organic result
 */
export function extractSeoIndicators(
  result: OrganicResult,
  targetKeyword: string
): SeoIndicators {
  const keywordLower = targetKeyword.toLowerCase();
  const titleLower = result.title.toLowerCase();
  const snippetLower = result.snippet.toLowerCase();

  // Parse URL
  let url: URL;
  let hasHttps = false;
  let urlDepth = 0;
  let urlStructure: 'clean' | 'parameterized' | 'dated' | 'mixed' = 'clean';

  try {
    url = new URL(result.link);
    hasHttps = url.protocol === 'https:';
    urlDepth = url.pathname.split('/').filter(Boolean).length;
    urlStructure = getUrlStructure(url);
  } catch {
    hasHttps = result.link.startsWith('https://');
    urlDepth = result.link.split('/').length - 3;
  }

  // Check for keyword presence
  const titleWords = titleLower.split(/\s+/);
  const snippetWords = snippetLower.split(/\s+/);
  const keywords = keywordLower.split(/\s+/);

  const titleContainsKeyword = keywords.some((k) =>
    titleWords.some((w) => w.includes(k))
  );
  const snippetContainsKeyword = keywords.some((k) =>
    snippetWords.some((w) => w.includes(k))
  );

  return {
    titleContainsKeyword,
    titleLength: result.title.length,
    snippetContainsKeyword,
    snippetLength: result.snippet.length,
    urlStructure,
    hasHttps,
    urlDepth,
    hasDate: !!result.date,
    estimatedAuthorityTier: estimateAuthorityTier(extractDomain(result.link)),
  };
}

// ============================================================================
// Competitor Analysis
// ============================================================================

/**
 * Estimate content length from snippet
 */
function estimateContentLength(
  result: OrganicResult
): 'short' | 'medium' | 'long' {
  const snippetLength = result.snippet.length;
  const titleLength = result.title.length;
  const hasRichSnippet = !!result.richSnippet;
  const hasSitelinks = !!result.sitelinks && result.sitelinks.length > 0;

  // Long form content indicators
  if (hasRichSnippet || hasSitelinks || snippetLength > 250) {
    return 'long';
  }

  // Short content indicators
  if (snippetLength < 100 && titleLength < 50) {
    return 'short';
  }

  return 'medium';
}

/**
 * Analyze a single competitor from search results
 */
export function analyzeCompetitor(
  result: OrganicResult,
  targetKeyword: string
): CompetitorContentStructure {
  return {
    result,
    domain: extractDomain(result.link),
    estimatedContentLength: estimateContentLength(result),
    contentType: classifyContentType(result),
    hasRichSnippets: !!result.richSnippet,
    hasSitelinks: !!result.sitelinks && result.sitelinks.length > 0,
    seoIndicators: extractSeoIndicators(result, targetKeyword),
  };
}

/**
 * Analyze all competitors from a SERP response
 */
export function analyzeCompetitors(
  response: SerpApiResponse,
  targetKeyword?: string
): CompetitorContentStructure[] {
  const keyword = targetKeyword || response.searchParameters.q;
  return response.organicResults.map((result) =>
    analyzeCompetitor(result, keyword)
  );
}

// ============================================================================
// SERP Analysis
// ============================================================================

/**
 * Calculate SERP difficulty score (0-100)
 */
function calculateSerpDifficulty(
  competitors: CompetitorContentStructure[]
): number {
  if (competitors.length === 0) return 0;

  let score = 0;

  // High authority domains increase difficulty
  const highAuthorityCount = competitors.filter(
    (c) => c.seoIndicators.estimatedAuthorityTier === 'high'
  ).length;
  score += (highAuthorityCount / competitors.length) * 30;

  // Keyword optimization in titles increases difficulty
  const keywordOptimizedCount = competitors.filter(
    (c) => c.seoIndicators.titleContainsKeyword
  ).length;
  score += (keywordOptimizedCount / competitors.length) * 25;

  // HTTPS adoption (sign of mature SEO)
  const httpsCount = competitors.filter((c) => c.seoIndicators.hasHttps).length;
  score += (httpsCount / competitors.length) * 10;

  // Rich snippets indicate structured content (harder to compete)
  const richSnippetCount = competitors.filter((c) => c.hasRichSnippets).length;
  score += (richSnippetCount / competitors.length) * 15;

  // Sitelinks indicate brand authority
  const sitelinksCount = competitors.filter((c) => c.hasSitelinks).length;
  score += (sitelinksCount / competitors.length) * 20;

  return Math.min(100, Math.round(score));
}

/**
 * Identify content gaps from competitor analysis
 */
export function identifyContentGaps(
  competitors: CompetitorContentStructure[]
): ContentGap[] {
  const gaps: ContentGap[] = [];

  // Check for missing content formats
  const contentTypes = new Set(competitors.map((c) => c.contentType));
  const commonTypes: ContentType[] = [
    'blog_post',
    'product_page',
    'how_to',
    'comparison',
    'review',
  ];

  for (const type of commonTypes) {
    if (!contentTypes.has(type)) {
      gaps.push({
        type: 'missing_format',
        description: `No ${type.replace('_', ' ')} format found in top results`,
        opportunityScore: 60,
      });
    }
  }

  // Check for depth gaps
  const longContentCount = competitors.filter(
    (c) => c.estimatedContentLength === 'long'
  ).length;

  if (longContentCount < 3) {
    gaps.push({
      type: 'missing_depth',
      description:
        'Few comprehensive content pieces - opportunity for long-form content',
      opportunityScore: 75,
    });
  }

  // Check for freshness
  const datedContentCount = competitors.filter(
    (c) => c.seoIndicators.hasDate
  ).length;

  if (datedContentCount === 0) {
    gaps.push({
      type: 'missing_freshness',
      description: 'No dated content found - freshness signals may help',
      opportunityScore: 50,
    });
  }

  // Check for missing topics (based on rich snippets)
  const richSnippetTopics = competitors.filter((c) => c.hasRichSnippets);
  if (richSnippetTopics.length < 2) {
    gaps.push({
      type: 'missing_structure',
      description:
        'Few structured data implementations - schema markup opportunity',
      opportunityScore: 65,
    });
  }

  return gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

/**
 * Generate content recommendations based on SERP analysis
 */
export function generateRecommendations(
  competitors: CompetitorContentStructure[],
  serpDifficulty: number
): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = [];

  // Difficulty-based recommendations
  if (serpDifficulty > 70) {
    recommendations.push({
      type: 'content_format',
      recommendation:
        'Target long-tail keywords and create comprehensive guides',
      priority: 'high',
      basedOn: `High SERP difficulty (${serpDifficulty}/100)`,
    });
  } else if (serpDifficulty > 40) {
    recommendations.push({
      type: 'content_format',
      recommendation:
        'Create detailed, well-structured content with unique insights',
      priority: 'medium',
      basedOn: `Moderate SERP difficulty (${serpDifficulty}/100)`,
    });
  }

  // Title length analysis
  const avgTitleLength =
    competitors.reduce((sum, c) => sum + c.seoIndicators.titleLength, 0) /
    competitors.length;

  if (avgTitleLength < 50) {
    recommendations.push({
      type: 'seo_element',
      recommendation: 'Use descriptive, longer titles (55-60 characters)',
      priority: 'medium',
      basedOn: `Average competitor title length is ${Math.round(avgTitleLength)} chars`,
    });
  }

  // Content type diversity
  const contentTypes = new Set(competitors.map((c) => c.contentType));
  if (contentTypes.size < 3) {
    recommendations.push({
      type: 'content_format',
      recommendation:
        'Diversify content formats to capture different search intents',
      priority: 'medium',
      basedOn: `Only ${contentTypes.size} content type(s) found in top results`,
    });
  }

  // Word count recommendations
  const longContentCount = competitors.filter(
    (c) => c.estimatedContentLength === 'long'
  ).length;

  if (longContentCount >= 5) {
    recommendations.push({
      type: 'word_count',
      recommendation:
        'Create comprehensive content (2000+ words) to match competitors',
      priority: 'high',
      basedOn: `${longContentCount} competitors have long-form content`,
    });
  } else if (longContentCount >= 2) {
    recommendations.push({
      type: 'word_count',
      recommendation: 'Aim for medium-to-long form content (1500+ words)',
      priority: 'medium',
      basedOn: 'Mix of content lengths in top results',
    });
  }

  // Schema markup recommendation
  const withRichSnippets = competitors.filter((c) => c.hasRichSnippets).length;
  if (withRichSnippets > 0) {
    recommendations.push({
      type: 'schema',
      recommendation: 'Implement schema markup for rich snippets',
      priority: 'high',
      basedOn: `${withRichSnippets} competitors have rich snippets`,
    });
  }

  // URL structure recommendations
  const cleanUrls = competitors.filter(
    (c) => c.seoIndicators.urlStructure === 'clean'
  ).length;

  if (cleanUrls >= 7) {
    recommendations.push({
      type: 'seo_element',
      recommendation: 'Use clean, descriptive URL structures',
      priority: 'medium',
      basedOn: `${cleanUrls}/10 competitors use clean URLs`,
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Perform complete SERP analysis
 *
 * @param response - SerpAPI response
 * @param searchParams - Original search parameters
 * @returns Complete SERP analysis summary
 */
export function analyzeSerp(
  response: SerpApiResponse,
  searchParams: SerpSearchParams
): SerpAnalysisSummary {
  const competitors = analyzeCompetitors(response, searchParams.query);
  const serpDifficulty = calculateSerpDifficulty(competitors);
  const contentGaps = identifyContentGaps(competitors);
  const recommendations = generateRecommendations(competitors, serpDifficulty);

  return {
    query: searchParams.query,
    searchParams,
    analyzedAt: new Date(),
    totalOrganicResults: response.organicResults.length,
    hasFeaturedSnippet: !!response.featuredSnippet,
    hasKnowledgeGraph: !!response.knowledgeGraph,
    hasLocalPack: !!response.localResults && response.localResults.length > 0,
    paaCount: response.peopleAlsoAsk?.length || 0,
    competitors,
    serpDifficulty,
    contentGaps,
    recommendations,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get domain distribution from competitors
 */
export function getDomainDistribution(
  competitors: CompetitorContentStructure[]
): Map<string, number> {
  const distribution = new Map<string, number>();

  for (const competitor of competitors) {
    const domain = competitor.domain;
    distribution.set(domain, (distribution.get(domain) || 0) + 1);
  }

  return distribution;
}

/**
 * Get content type distribution from competitors
 */
export function getContentTypeDistribution(
  competitors: CompetitorContentStructure[]
): Map<ContentType, number> {
  const distribution = new Map<ContentType, number>();

  for (const competitor of competitors) {
    const type = competitor.contentType;
    distribution.set(type, (distribution.get(type) || 0) + 1);
  }

  return distribution;
}

/**
 * Find the most common SEO patterns
 */
export function getCommonSeoPatterns(
  competitors: CompetitorContentStructure[]
): {
  avgTitleLength: number;
  avgSnippetLength: number;
  httpsPercentage: number;
  keywordInTitlePercentage: number;
  mostCommonContentType: ContentType;
} {
  const total = competitors.length;

  const avgTitleLength =
    competitors.reduce((sum, c) => sum + c.seoIndicators.titleLength, 0) /
    total;

  const avgSnippetLength =
    competitors.reduce((sum, c) => sum + c.seoIndicators.snippetLength, 0) /
    total;

  const httpsCount = competitors.filter((c) => c.seoIndicators.hasHttps).length;

  const keywordInTitleCount = competitors.filter(
    (c) => c.seoIndicators.titleContainsKeyword
  ).length;

  const typeDistribution = getContentTypeDistribution(competitors);
  let mostCommonContentType: ContentType = 'unknown';
  let maxCount = 0;

  for (const [type, count] of Array.from(typeDistribution.entries())) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonContentType = type;
    }
  }

  return {
    avgTitleLength: Math.round(avgTitleLength),
    avgSnippetLength: Math.round(avgSnippetLength),
    httpsPercentage: Math.round((httpsCount / total) * 100),
    keywordInTitlePercentage: Math.round((keywordInTitleCount / total) * 100),
    mostCommonContentType,
  };
}

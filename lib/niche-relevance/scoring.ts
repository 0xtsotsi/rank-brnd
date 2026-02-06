/**
 * Niche Relevance Scoring Algorithm
 *
 * Calculates relevance scores between articles and exchange network sites
 * based on niche matching, semantic similarity, and quality metrics.
 */

import type {
  ArticleNicheAnalysis,
  ScoringWeights,
  SiteRelevanceScore,
} from './types';
import {
  getNicheHierarchy,
  normalizeNiche,
  getParentNiche,
  getChildrenNiches,
  getRelatedNiches,
  getSynonyms,
} from './niche-hierarchy';

/**
 * Marketplace site type for scoring
 */
export interface MarketplaceSite {
  id: string;
  domain: string;
  niche: string[];
  categories: string[];
  domain_authority: number;
  page_authority: number;
  quality_score: number;
  spam_score: number;
  traffic: number | null;
  credits_required: number;
  available: boolean;
  response_time: number | null;
  success_rate: number;
  language: string;
  region: string | null;
}

/**
 * Calculate niche similarity score between two niches
 * Returns a score from 0-100
 */
export function calculateNicheSimilarity(
  niche1: string,
  niche2: string
): number {
  // Normalize niche names
  const normalized1 = normalizeNiche(niche1);
  const normalized2 = normalizeNiche(niche2);

  if (!normalized1 || !normalized2) {
    // If we can't normalize, do simple string comparison
    return niche1.toLowerCase() === niche2.toLowerCase() ? 80 : 0;
  }

  // Exact match
  if (normalized1 === normalized2) {
    return 100;
  }

  const hierarchy1 = getNicheHierarchy(normalized1);
  const hierarchy2 = getNicheHierarchy(normalized2);

  if (!hierarchy1 || !hierarchy2) {
    return 0;
  }

  // Check parent-child relationship
  if (hierarchy1.children.some((c) => normalizeNiche(c) === normalized2)) {
    return 90; // niche2 is a child of niche1
  }
  if (hierarchy2.children.some((c) => normalizeNiche(c) === normalized1)) {
    return 90; // niche1 is a child of niche2
  }

  // Check if they share a parent
  const parent1 = getParentNiche(normalized1);
  const parent2 = getParentNiche(normalized2);
  if (parent1 && parent1 === parent2) {
    return 75; // Siblings in the hierarchy
  }

  // Check related niches
  if (hierarchy1.related.some((r) => normalizeNiche(r) === normalized2)) {
    return 60; // Related niches
  }
  if (hierarchy2.related.some((r) => normalizeNiche(r) === normalized1)) {
    return 60;
  }

  // Check synonyms
  if (
    hierarchy1.synonyms.some((s) => s.toLowerCase() === niche2.toLowerCase())
  ) {
    return 85;
  }
  if (
    hierarchy2.synonyms.some((s) => s.toLowerCase() === niche1.toLowerCase())
  ) {
    return 85;
  }

  // No direct relationship
  return 0;
}

/**
 * Calculate overall niche relevance score between article niches and site niches
 */
export function calculateNicheRelevance(
  articleNiches: string[],
  siteNiches: string[]
): {
  score: number;
  matches: { niche: string; weight: number }[];
} {
  if (!articleNiches.length || !siteNiches.length) {
    return { score: 0, matches: [] };
  }

  const matches: { niche: string; weight: number }[] = [];
  let totalScore = 0;
  let bestMatchScore = 0;

  // Find best matching niche pair
  for (const articleNiche of articleNiches) {
    for (const siteNiche of siteNiches) {
      const similarity = calculateNicheSimilarity(articleNiche, siteNiche);
      if (similarity > bestMatchScore) {
        bestMatchScore = similarity;
      }
      if (similarity > 50) {
        matches.push({ niche: siteNiche, weight: similarity });
      }
    }
  }

  // Score is based on the best match
  totalScore = bestMatchScore;

  // Bonus for multiple niche matches
  if (matches.length > 1) {
    totalScore = Math.min(100, totalScore + 10);
  }

  return { score: totalScore, matches };
}

/**
 * Calculate category overlap score
 */
export function calculateCategoryOverlap(
  articleCategories: string[],
  siteCategories: string[]
): number {
  if (!articleCategories.length || !siteCategories.length) {
    return 0;
  }

  const matchingCategories = articleCategories.filter((cat) =>
    siteCategories.some(
      (siteCat) => siteCat.toLowerCase() === cat.toLowerCase()
    )
  );

  if (matchingCategories.length === 0) {
    return 0;
  }

  // Score based on overlap percentage
  const overlapPercentage =
    (matchingCategories.length / siteCategories.length) * 100;
  return Math.min(100, overlapPercentage);
}

/**
 * Calculate keyword matching score
 */
export function calculateKeywordMatch(
  keywords: string[],
  siteNiche: string[],
  siteDescription?: string
): number {
  if (!keywords.length) {
    return 0;
  }

  let matchCount = 0;
  const siteText = [...siteNiche, ...(siteDescription?.split(/\s+/) || [])]
    .join(' ')
    .toLowerCase();

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    if (siteText.includes(normalizedKeyword)) {
      matchCount++;
    }
  }

  if (matchCount === 0) {
    return 0;
  }

  // Score based on percentage of keywords that match
  return Math.min(100, (matchCount / keywords.length) * 100);
}

/**
 * Normalize domain authority to 0-1 scale
 */
export function normalizeDomainAuthority(da: number): number {
  return Math.min(1, Math.max(0, da / 100));
}

/**
 * Normalize quality score to 0-1 scale
 */
export function normalizeQualityScore(quality: number): number {
  return Math.min(1, Math.max(0, quality / 100));
}

/**
 * Normalize spam score (lower is better) to 0-1 scale
 */
export function normalizeSpamScore(spam: number): number {
  // Spam score 0-100, invert so 100 spam = 0 quality
  return Math.max(0, 1 - spam / 100);
}

/**
 * Normalize response time to 0-1 scale (lower is better)
 */
export function normalizeResponseTime(responseTime: number | null): number {
  if (!responseTime) return 0.5; // Neutral if unknown
  // Assume 48 hours is the threshold
  return Math.max(0, 1 - responseTime / 48);
}

/**
 * Normalize success rate to 0-1 scale
 */
export function normalizeSuccessRate(successRate: number): number {
  return Math.min(1, Math.max(0, successRate / 100));
}

/**
 * Calculate semantic similarity between two text strings
 * Uses a simple word overlap approach (can be enhanced with embeddings)
 */
export function calculateSemanticSimilarity(
  text1: string,
  text2: string
): number {
  if (!text1 || !text2) {
    return 0;
  }

  // Tokenize and normalize
  const tokens1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );
  const tokens2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );

  if (tokens1.size === 0 || tokens2.size === 0) {
    return 0;
  }

  // Calculate Jaccard similarity
  const intersection = new Set(
    Array.from(tokens1).filter((x) => tokens2.has(x))
  );
  const union = new Set([...Array.from(tokens1), ...Array.from(tokens2)]);
  const jaccard = intersection.size / union.size;

  return Math.round(jaccard * 100);
}

/**
 * Calculate overall relevance score for a site
 */
export function calculateSiteRelevance(
  article: {
    title: string;
    content?: string;
    category?: string;
    tags?: string[];
    meta_keywords?: string[];
  },
  site: MarketplaceSite,
  articleAnalysis?: ArticleNicheAnalysis,
  weights: ScoringWeights = {
    niche_relevance: 0.35,
    semantic_similarity: 0.15,
    domain_authority: 0.2,
    quality_score: 0.15,
    response_time: 0.05,
    success_rate: 0.1,
  }
): SiteRelevanceScore {
  // Extract article niches
  const articleNiches: string[] = articleAnalysis
    ? [articleAnalysis.primary_niche, ...articleAnalysis.secondary_niches]
    : [article.category, ...(article.tags || [])].filter((n): n is string =>
        Boolean(n)
      );

  // Extract article categories
  const articleCategories: string[] =
    articleAnalysis?.categories ??
    [article.category].filter((n): n is string => Boolean(n));

  // Extract keywords
  const articleKeywords = [
    ...(article.meta_keywords || []),
    ...(article.tags || []),
  ];

  // Calculate niche relevance
  const { score: nicheScore, matches: nicheMatches } = calculateNicheRelevance(
    articleNiches,
    site.niche
  );

  // Calculate category overlap
  const categoryMatches = articleCategories.filter((cat) =>
    site.categories.some(
      (siteCat) => siteCat.toLowerCase() === cat.toLowerCase()
    )
  );
  const categoryScore = calculateCategoryOverlap(
    articleCategories,
    site.categories
  );

  // Calculate keyword matches
  const keywordMatches = articleKeywords.filter((kw) => {
    const kwLower = kw.toLowerCase();
    return (
      site.niche.some((n) => n.toLowerCase().includes(kwLower)) ||
      site.categories.some((c) => c.toLowerCase().includes(kwLower))
    );
  });
  const keywordScore = calculateKeywordMatch(
    articleKeywords,
    site.niche,
    site.domain
  );

  // Calculate semantic similarity
  const semanticScore = calculateSemanticSimilarity(
    article.content || article.title,
    `${site.niche.join(' ')} ${site.categories.join(' ')} ${site.domain}`
  );

  // Normalize quality metrics
  const daScore = normalizeDomainAuthority(site.domain_authority);
  const qualityScore = normalizeQualityScore(site.quality_score);
  const spamScore = normalizeSpamScore(site.spam_score);
  const responseScore = normalizeResponseTime(site.response_time);
  const successRateScore = normalizeSuccessRate(site.success_rate);

  // Calculate weighted score
  let weightedScore =
    nicheScore * weights.niche_relevance +
    semanticScore * weights.semantic_similarity +
    daScore * 100 * weights.domain_authority +
    qualityScore * 100 * weights.quality_score +
    spamScore * 100 * 0.1 + // Small bonus for low spam
    responseScore * 100 * weights.response_time +
    successRateScore * 100 * weights.success_rate;

  // Boost for category matches
  if (categoryMatches.length > 0) {
    weightedScore = Math.min(100, weightedScore + categoryScore * 0.1);
  }

  // Round to integer
  weightedScore = Math.round(weightedScore);
  weightedScore = Math.min(100, Math.max(0, weightedScore));

  return {
    site_id: site.id,
    domain: site.domain,
    relevance_score: weightedScore,
    match_details: {
      niche_matches: nicheMatches,
      category_matches: categoryMatches,
      keyword_matches: keywordMatches,
      semantic_similarity: semanticScore,
    },
    quality_adjusted_score: weightedScore, // Same for now, can be adjusted
  };
}

/**
 * Score multiple sites and sort by relevance
 */
export function scoreAndRankSites(
  article: {
    title: string;
    content?: string;
    category?: string;
    tags?: string[];
    meta_keywords?: string[];
  },
  sites: MarketplaceSite[],
  articleAnalysis?: ArticleNicheAnalysis,
  weights?: ScoringWeights
): SiteRelevanceScore[] {
  const scores = sites
    .filter((site) => site.available)
    .map((site) =>
      calculateSiteRelevance(article, site, articleAnalysis, weights)
    )
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return scores;
}

/**
 * Get top N sites by relevance score
 */
export function getTopSites(
  article: {
    title: string;
    content?: string;
    category?: string;
    tags?: string[];
    meta_keywords?: string[];
  },
  sites: MarketplaceSite[],
  n: number = 10,
  minScore: number = 0,
  articleAnalysis?: ArticleNicheAnalysis,
  weights?: ScoringWeights
): SiteRelevanceScore[] {
  const rankedSites = scoreAndRankSites(
    article,
    sites,
    articleAnalysis,
    weights
  );
  return rankedSites.filter((s) => s.relevance_score >= minScore).slice(0, n);
}

/**
 * External Linking - Source Matcher
 *
 * Matches content keywords/topics with relevant external link sources.
 */

import type { ExternalLinkSource, SuggestedExternalLink } from './types';
import type { ContentAnalysisForExternalLinks } from './types';
import { findBestInsertPosition, generateAnchorText } from './content-analyzer';

/**
 * Calculate relevance score between content analysis and a source
 */
function calculateRelevanceScore(
  contentAnalysis: ContentAnalysisForExternalLinks,
  source: ExternalLinkSource
): number {
  let score = 0;
  const keywords = contentAnalysis.keywords.map((k) => k.toLowerCase());
  const topics = contentAnalysis.topics.map((t) => t.toLowerCase());
  const entities = contentAnalysis.entities.map((e) => e.toLowerCase());
  const sourceTopics = (source.topics || []).map((t) => t.toLowerCase());
  const sourceName = source.name.toLowerCase();
  const sourceDesc = (source.description || '').toLowerCase();
  const sourceDomain = source.domain.toLowerCase();

  // Keyword matching (up to 40 points)
  for (const keyword of keywords) {
    if (sourceName.includes(keyword) || keyword.includes(sourceName)) {
      score += 15;
    }
    if (sourceDesc.includes(keyword)) {
      score += 10;
    }
    if (
      sourceTopics.some((st) => st.includes(keyword) || keyword.includes(st))
    ) {
      score += 5;
    }
  }

  // Topic matching (up to 25 points)
  for (const topic of topics) {
    if (sourceName.includes(topic) || topic.includes(sourceName)) {
      score += 10;
    }
    if (sourceDesc.includes(topic)) {
      score += 8;
    }
    if (sourceTopics.some((st) => st.includes(topic) || topic.includes(st))) {
      score += 7;
    }
  }

  // Entity matching (up to 20 points)
  for (const entity of entities) {
    if (sourceName.includes(entity) || entity.includes(sourceName)) {
      score += 10;
    }
    if (sourceDesc.includes(entity)) {
      score += 5;
    }
    if (sourceDomain.includes(entity.toLowerCase().replace(/\s+/g, ''))) {
      score += 5;
    }
  }

  // Authority bonus (up to 15 points)
  if (source.domain_authority) {
    if (source.domain_authority >= 80) {
      score += 15;
    } else if (source.domain_authority >= 60) {
      score += 10;
    } else if (source.domain_authority >= 40) {
      score += 5;
    }
  }

  return Math.min(100, score);
}

/**
 * Match content with relevant external sources
 */
export function matchContentWithSources(
  contentAnalysis: ContentAnalysisForExternalLinks,
  sources: ExternalLinkSource[],
  options: {
    minRelevanceScore?: number;
    maxSuggestions?: number;
    linkType?: 'external' | 'citation' | 'reference';
    excludeExistingLinks?: boolean;
    existingUrls?: string[];
    categories?: Array<
      | 'academic'
      | 'government'
      | 'industry'
      | 'news'
      | 'reference'
      | 'statistics'
      | 'health'
      | 'technology'
      | 'business'
      | 'other'
    >;
  } = {}
): SuggestedExternalLink[] {
  const {
    minRelevanceScore = 50,
    maxSuggestions = 10,
    linkType = 'external',
    excludeExistingLinks = true,
    existingUrls = [],
    categories,
  } = options;

  // Filter sources by category if specified
  let filteredSources = sources;
  if (categories && categories.length > 0) {
    filteredSources = sources.filter((s) => categories.includes(s.category));
  }

  // Filter out existing URLs if requested
  if (excludeExistingLinks && existingUrls.length > 0) {
    const existingDomains = existingUrls.map((url) => {
      try {
        return new URL(url).hostname.replace('www.', '');
      } catch {
        return '';
      }
    });
    filteredSources = filteredSources.filter(
      (s) => !existingDomains.includes(s.domain.replace('www.', ''))
    );
  }

  // Calculate relevance scores for all sources
  const scoredSources = filteredSources
    .map((source) => ({
      source,
      relevanceScore: calculateRelevanceScore(contentAnalysis, source),
    }))
    .filter((item) => item.relevanceScore >= minRelevanceScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxSuggestions);

  // Generate suggestions
  const suggestions: SuggestedExternalLink[] = [];
  const usedKeywords = new Set<string>();

  for (const { source, relevanceScore } of scoredSources) {
    // Find the best matching keyword
    let bestKeyword = contentAnalysis.keywords[0];
    for (const keyword of contentAnalysis.keywords) {
      const keywordLower = keyword.toLowerCase();
      const sourceName = source.name.toLowerCase();
      const sourceDesc = (source.description || '').toLowerCase();

      if (
        sourceName.includes(keywordLower) ||
        sourceDesc.includes(keywordLower) ||
        source.topics?.some((t) => t.toLowerCase().includes(keywordLower))
      ) {
        bestKeyword = keyword;
        break;
      }
    }

    // Skip if keyword already used
    if (usedKeywords.has(bestKeyword.toLowerCase())) {
      continue;
    }
    usedKeywords.add(bestKeyword.toLowerCase());

    // Find best insert position
    const insertPosition = findBestInsertPosition(
      contentAnalysis.keywords.join(' '),
      bestKeyword,
      contentAnalysis.existingExternalLinks
    );

    // Generate anchor text
    const suggestedAnchorText = generateAnchorText(
      bestKeyword,
      source,
      linkType
    );

    // Build URL
    const suggestedUrl = source.url || `https://${source.domain}`;

    // Create suggestion
    suggestions.push({
      source,
      suggestedUrl,
      suggestedAnchorText,
      contextSnippet: insertPosition?.context || '',
      positionInContent: insertPosition?.position || 0,
      relevanceScore,
      linkType,
      keywords: [bestKeyword],
    });
  }

  return suggestions;
}

/**
 * Get authoritative sources for specific categories
 */
export function getAuthoritativeSourcesByCategory(
  sources: ExternalLinkSource[],
  category:
    | 'academic'
    | 'government'
    | 'industry'
    | 'news'
    | 'reference'
    | 'statistics'
    | 'health'
    | 'technology'
    | 'business'
    | 'other',
  limit: number = 10
): ExternalLinkSource[] {
  return sources
    .filter((s) => s.category === category && s.status === 'active')
    .sort((a, b) => {
      // Sort by trustworthiness first, then domain authority
      const aTrust = a.trustworthiness_score || 50;
      const bTrust = b.trustworthiness_score || 50;
      if (aTrust !== bTrust) {
        return bTrust - aTrust;
      }
      const aDA = a.domain_authority || 0;
      const bDA = b.domain_authority || 0;
      return bDA - aDA;
    })
    .slice(0, limit);
}

/**
 * Find sources for specific keywords
 */
export function findSourcesForKeywords(
  keywords: string[],
  sources: ExternalLinkSource[],
  limit: number = 10
): Array<{ source: ExternalLinkSource; relevanceScore: number }> {
  // Pre-process keywords to lowercase once for O(1) lookups
  const keywordsLower = new Set(keywords.map((k) => k.toLowerCase()));

  const scored = sources.map((source) => {
    let score = 0;
    const sourceName = source.name.toLowerCase();
    const sourceDesc = (source.description || '').toLowerCase();
    // Convert sourceTopics to Set for O(1) lookups instead of O(n) in loop
    const sourceTopicsSet = new Set(
      (source.topics || []).map((t) => t.toLowerCase())
    );

    // Iterate through keywords - O(n) instead of O(n²)
    for (const keywordLower of keywordsLower) {
      if (sourceName.includes(keywordLower)) {
        score += 20;
      }
      if (sourceDesc.includes(keywordLower)) {
        score += 15;
      }
      // O(1) lookup in Set instead of O(n) array.some()
      for (const sourceTopic of sourceTopicsSet) {
        if (sourceTopic.includes(keywordLower)) {
          score += 10;
          break; // Found a match, move to next keyword
        }
      }
    }

    return { source, relevanceScore: Math.min(100, score) };
  });

  return scored
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

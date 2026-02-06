/**
 * Internal Linking - Article Matcher
 *
 * Matches articles based on semantic relevance for internal linking.
 */

import type {
  ArticleForMatching,
  RelevanceMatch,
  InternalLinkGenerationOptions,
  SuggestedInternalLink,
  ContentAnalysisForInternalLinks,
} from './types';
import {
  analyzeContentForInternalLinks,
  calculateRelevanceScore,
  findBestInsertPosition,
  generateAnchorText,
} from './content-analyzer';

/**
 * Find relevant articles for internal linking based on content analysis
 */
export function findRelevantArticles(
  sourceContent: string,
  candidateArticles: ArticleForMatching[],
  options: InternalLinkGenerationOptions = {}
): RelevanceMatch[] {
  const {
    minRelevanceScore = 50,
    excludeKeywords = [],
    excludeArticleIds = [],
    preferredArticleIds = [],
    linkType = 'contextual',
    onlyPublishedArticles = true,
  } = options;

  // Analyze source content
  const analysis = analyzeContentForInternalLinks(sourceContent);
  const { keywords, topics, entities } = analysis;

  // Filter candidate articles
  const filteredCandidates = candidateArticles.filter((article) => {
    // Skip same article
    if (excludeArticleIds.includes(article.id)) {
      return false;
    }

    // Skip unpublished if onlyPublishedArticles is true
    if (onlyPublishedArticles && article.status !== 'published') {
      return false;
    }

    // Skip articles without content
    if (!article.content && !article.excerpt) {
      return false;
    }

    return true;
  });

  // Calculate relevance scores
  const matches: RelevanceMatch[] = filteredCandidates.map((article) => {
    const score = calculateRelevanceScore(keywords, topics, entities, {
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      tags: article.tags,
      category: article.category,
    });

    // Find matching keywords
    const matchingKeywords = keywords.filter(
      (kw) =>
        article.title.toLowerCase().includes(kw) ||
        (article.content || '').toLowerCase().includes(kw) ||
        (article.tags || []).some((tag) => tag.toLowerCase().includes(kw))
    );

    // Generate suggested anchor text
    const suggestedAnchorText = generateAnchorText(
      matchingKeywords[0] || article.title,
      { title: article.title, slug: article.slug, tags: article.tags },
      linkType
    );

    return {
      article,
      score,
      matchingKeywords,
      suggestedAnchorText,
    };
  });

  // Filter by minimum score
  let filteredMatches = matches.filter((m) => m.score >= minRelevanceScore);

  // Boost preferred articles
  if (preferredArticleIds.length > 0) {
    filteredMatches = filteredMatches.map((m) => ({
      ...m,
      score: preferredArticleIds.includes(m.article.id)
        ? Math.min(100, m.score + 15)
        : m.score,
    }));
  }

  // Sort by relevance score
  filteredMatches.sort((a, b) => b.score - a.score);

  // Filter out excluded keywords from anchor text suggestions
  if (excludeKeywords.length > 0) {
    filteredMatches = filteredMatches.map((m) => {
      if (
        excludeKeywords.some((ek) =>
          m.suggestedAnchorText.toLowerCase().includes(ek)
        )
      ) {
        // Use article title instead
        return {
          ...m,
          suggestedAnchorText: m.article.title,
        };
      }
      return m;
    });
  }

  return filteredMatches;
}

/**
 * Generate internal link suggestions for a source article
 */
export function generateInternalLinkSuggestions(
  sourceArticle: {
    id: string;
    title: string;
    content: string | null;
    slug: string;
  },
  candidateArticles: ArticleForMatching[],
  options: InternalLinkGenerationOptions = {}
): SuggestedInternalLink[] {
  const { maxSuggestions = 10, linkType = 'contextual' } = options;

  const sourceContent = sourceArticle.content || '';
  const analysis = analyzeContentForInternalLinks(sourceContent);

  // Find relevant articles
  const matches = findRelevantArticles(
    sourceContent,
    candidateArticles,
    options
  );

  // Take top matches
  const topMatches = matches.slice(0, maxSuggestions);

  // Generate suggestions
  const suggestions: SuggestedInternalLink[] = topMatches.map((match) => {
    // Find best insert position for the first matching keyword
    const firstKeyword = match.matchingKeywords[0] || match.article.title;
    const insertPosition = findBestInsertPosition(
      sourceContent,
      firstKeyword,
      []
    );

    // Generate context snippet
    const contextSnippet =
      insertPosition?.context ||
      sourceContent
        .slice(0, 200)
        .replace(/<[^>]+>/g, ' ')
        .trim();

    return {
      target_article_id: match.article.id,
      target_article_title: match.article.title,
      target_article_slug: match.article.slug,
      target_article_excerpt: match.article.excerpt,
      suggested_anchor_text: match.suggestedAnchorText,
      context_snippet: contextSnippet,
      position_in_content: insertPosition?.position ?? null,
      relevance_score: match.score,
      keywords: match.matchingKeywords,
      link_type: linkType,
    };
  });

  return suggestions;
}

/**
 * Find reciprocal linking opportunities (articles that should link to each other)
 */
export function findReciprocalLinkingOpportunities(
  articles: ArticleForMatching[],
  options: InternalLinkGenerationOptions = {}
): Array<{
  source_article_id: string;
  source_article_title: string;
  target_article_id: string;
  target_article_title: string;
  relevance_score: number;
  suggested_anchor_text: string;
}> {
  const opportunities: Array<{
    source_article_id: string;
    source_article_title: string;
    target_article_id: string;
    target_article_title: string;
    relevance_score: number;
    suggested_anchor_text: string;
  }> = [];

  // Compare each article with every other article
  for (const source of articles) {
    if (!source.content) continue;

    const candidates = articles.filter((a) => a.id !== source.id);
    const matches = findRelevantArticles(source.content, candidates, options);

    for (const match of matches) {
      opportunities.push({
        source_article_id: source.id,
        source_article_title: source.title,
        target_article_id: match.article.id,
        target_article_title: match.article.title,
        relevance_score: match.score,
        suggested_anchor_text: match.suggestedAnchorText,
      });
    }
  }

  // Sort by relevance score
  opportunities.sort((a, b) => b.relevance_score - a.relevance_score);

  return opportunities;
}

/**
 * Analyze content without generating suggestions
 */
export function analyzeContentOnly(
  content: string
): ContentAnalysisForInternalLinks {
  return analyzeContentForInternalLinks(content);
}

/**
 * Get related articles based on content similarity
 */
export function getRelatedArticles(
  sourceContent: string,
  candidateArticles: ArticleForMatching[],
  maxResults: number = 5
): ArticleForMatching[] {
  const matches = findRelevantArticles(sourceContent, candidateArticles, {
    minRelevanceScore: 30,
  });

  return matches.slice(0, maxResults).map((m) => m.article);
}

/**
 * Calculate internal linking score for an article
 * Returns how well internally linked an article is
 */
export function calculateInternalLinkingScore(
  article: ArticleForMatching,
  allArticles: ArticleForMatching[],
  inboundLinks: number,
  outboundLinks: number
): {
  score: number;
  inbound_count: number;
  outbound_count: number;
  total_possible: number;
  linking_health: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const totalPossible = allArticles.length - 1; // Can't link to itself
  const totalLinks = inboundLinks + outboundLinks;

  // Calculate score based on ratio of actual links to ideal links
  // Ideal is roughly 3-5 internal links per article
  const idealLinks = Math.min(5, Math.floor((article.word_count || 500) / 300));
  const linkRatio = outboundLinks / Math.max(1, idealLinks);

  // Score penalizes both too few and too many links
  let score = 100 - Math.abs(1 - linkRatio) * 50;
  score = Math.max(0, Math.min(100, score));

  // Determine health status
  let health: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 80) {
    health = 'excellent';
  } else if (score >= 60) {
    health = 'good';
  } else if (score >= 40) {
    health = 'fair';
  } else {
    health = 'poor';
  }

  return {
    score: Math.round(score),
    inbound_count: inboundLinks,
    outbound_count: outboundLinks,
    total_possible: totalPossible,
    linking_health: health,
  };
}

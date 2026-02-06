/**
 * Meta Tags Analysis
 *
 * Analyzes meta tags for SEO completeness and optimization.
 */

import type { MetaTagsAnalysis } from './types';

/**
 * Optimal lengths for meta tags
 */
const OPTIMAL_TITLE_LENGTH = { min: 30, max: 60 };
const OPTIMAL_DESCRIPTION_LENGTH = { min: 120, max: 160 };

/**
 * Analyze meta tags completeness
 */
export function analyzeMetaTags(options: {
  title?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[] | null;
  canonicalUrl?: string | null;
  content?: string;
  hasOpenGraph?: boolean;
  hasTwitterCard?: boolean;
}): MetaTagsAnalysis {
  const {
    title = '',
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
  } = options;

  // Use metaTitle if available, otherwise use title
  const effectiveTitle = metaTitle || title;
  const titleLength = effectiveTitle.length;
  const titleOptimal =
    titleLength >= OPTIMAL_TITLE_LENGTH.min &&
    titleLength <= OPTIMAL_TITLE_LENGTH.max;

  const hasTitle = effectiveTitle.length > 0;
  const hasDescription = (metaDescription || '').length > 0;
  const descriptionLength = (metaDescription || '').length;
  const descriptionOptimal =
    descriptionLength >= OPTIMAL_DESCRIPTION_LENGTH.min &&
    descriptionLength <= OPTIMAL_DESCRIPTION_LENGTH.max;

  const hasKeywords = Array.isArray(metaKeywords) && metaKeywords.length > 0;
  const hasCanonical = (canonicalUrl || '').length > 0;

  // Check for Open Graph and Twitter Card tags
  // These would typically be checked in the actual HTML
  const hasOpenGraph = options.hasOpenGraph ?? false;
  const hasTwitterCard = options.hasTwitterCard ?? false;

  return {
    hasTitle,
    titleLength,
    titleOptimal,
    hasDescription,
    descriptionLength,
    descriptionOptimal,
    hasKeywords,
    hasCanonical,
    hasOpenGraph,
    hasTwitterCard,
  };
}

/**
 * Calculate meta tags score
 */
export function calculateMetaTagsScore(analysis: MetaTagsAnalysis): number {
  let score = 0;

  // Title score (40 points)
  if (analysis.hasTitle) {
    if (analysis.titleOptimal) {
      score += 40;
    } else if (analysis.titleLength > 0) {
      // Partial points for having a title, even if not optimal length
      score += 20;
    }
  }

  // Description score (30 points)
  if (analysis.hasDescription) {
    if (analysis.descriptionOptimal) {
      score += 30;
    } else if (analysis.descriptionLength > 0) {
      score += 15;
    }
  }

  // Keywords score (10 points)
  if (analysis.hasKeywords) {
    score += 10;
  }

  // Canonical URL score (10 points)
  if (analysis.hasCanonical) {
    score += 10;
  }

  // Open Graph score (5 points)
  if (analysis.hasOpenGraph) {
    score += 5;
  }

  // Twitter Card score (5 points)
  if (analysis.hasTwitterCard) {
    score += 5;
  }

  return score;
}

/**
 * Get meta tag recommendations
 */
export function getMetaTagRecommendations(
  analysis: MetaTagsAnalysis
): string[] {
  const recommendations: string[] = [];

  if (!analysis.hasTitle) {
    recommendations.push(
      'Add a meta title to your page. This is crucial for SEO.'
    );
  } else if (!analysis.titleOptimal) {
    if (analysis.titleLength < OPTIMAL_TITLE_LENGTH.min) {
      recommendations.push(
        `Your meta title is too short (${analysis.titleLength} chars). ` +
          `Aim for ${OPTIMAL_TITLE_LENGTH.min}-${OPTIMAL_TITLE_LENGTH.max} characters.`
      );
    } else if (analysis.titleLength > OPTIMAL_TITLE_LENGTH.max) {
      recommendations.push(
        `Your meta title is too long (${analysis.titleLength} chars). ` +
          `It may be truncated in search results. Aim for ${OPTIMAL_TITLE_LENGTH.min}-${OPTIMAL_TITLE_LENGTH.max} characters.`
      );
    }
  }

  if (!analysis.hasDescription) {
    recommendations.push(
      'Add a meta description to improve click-through rates from search results.'
    );
  } else if (!analysis.descriptionOptimal) {
    if (analysis.descriptionLength < OPTIMAL_DESCRIPTION_LENGTH.min) {
      recommendations.push(
        `Your meta description is too short (${analysis.descriptionLength} chars). ` +
          `Aim for ${OPTIMAL_DESCRIPTION_LENGTH.min}-${OPTIMAL_DESCRIPTION_LENGTH.max} characters.`
      );
    } else if (analysis.descriptionLength > OPTIMAL_DESCRIPTION_LENGTH.max) {
      recommendations.push(
        `Your meta description is too long (${analysis.descriptionLength} chars). ` +
          `It may be truncated in search results. Aim for ${OPTIMAL_DESCRIPTION_LENGTH.min}-${OPTIMAL_DESCRIPTION_LENGTH.max} characters.`
      );
    }
  }

  if (!analysis.hasKeywords) {
    recommendations.push(
      'Consider adding meta keywords to help search engines understand your content.'
    );
  }

  if (!analysis.hasCanonical) {
    recommendations.push(
      'Add a canonical URL to prevent duplicate content issues.'
    );
  }

  if (!analysis.hasOpenGraph) {
    recommendations.push(
      'Add Open Graph tags to improve how your content appears when shared on social media.'
    );
  }

  if (!analysis.hasTwitterCard) {
    recommendations.push(
      'Add Twitter Card tags to improve how your content appears when shared on Twitter.'
    );
  }

  return recommendations;
}

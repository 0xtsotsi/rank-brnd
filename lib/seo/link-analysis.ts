/**
 * Link Analysis
 *
 * Analyzes internal and external links in content.
 */

import type { LinkAnalysis } from './types';

/**
 * Extract all links from HTML content
 */
function extractLinks(html: string): Array<{
  href: string;
  text: string;
  isNofollow: boolean;
  isInternal: boolean;
}> {
  const linkRegex =
    /<a\s+(?:[^>]*?\s+)?href=(["'])([^"']+)\1[^>]*>(.*?)<\/a>/gi;
  const links: Array<{
    href: string;
    text: string;
    isNofollow: boolean;
    isInternal: boolean;
  }> = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[2].trim();
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    const tag = match[0];

    // Check for rel="nofollow"
    const isNofollow =
      /rel\s*=\s*["'][^"']*nofollow[^"']*["']/i.test(tag) ||
      /rel\s*=\s*"nofollow"/i.test(tag) ||
      /rel\s*=\s*'nofollow'/i.test(tag);

    links.push({
      href,
      text,
      isNofollow,
      isInternal: false, // Will be determined based on baseUrl
    });
  }

  return links;
}

/**
 * Check if URL is internal relative to base URL
 */
function isInternalUrl(url: string, baseUrl?: string): boolean {
  if (!baseUrl) {
    // If no base URL provided, assume relative URLs and same-domain URLs are internal
    return (
      url.startsWith('/') ||
      url.startsWith('./') ||
      url.startsWith('../') ||
      !url.match(/^https?:\/\//)
    );
  }

  try {
    const urlObj = new URL(url, baseUrl);
    const baseUrlObj = new URL(baseUrl);

    return urlObj.hostname === baseUrlObj.hostname;
  } catch {
    // Invalid URL, assume it's internal (relative path)
    return true;
  }
}

/**
 * Analyze links in content
 */
export function analyzeLinks(
  content: string,
  options: {
    baseUrl?: string;
    checkBroken?: boolean;
  } = {}
): LinkAnalysis {
  const links = extractLinks(content);

  // Categorize links
  let internalLinks = 0;
  let externalLinks = 0;
  let noFollowLinks = 0;

  for (const link of links) {
    link.isInternal = isInternalUrl(link.href, options.baseUrl);

    if (link.isInternal) {
      internalLinks++;
    } else {
      externalLinks++;
    }

    if (link.isNofollow) {
      noFollowLinks++;
    }
  }

  const totalLinks = links.length;
  const hasValidInternalLinks = internalLinks >= 2; // At least 2 internal links recommended
  const hasValidExternalLinks = externalLinks >= 1; // At least 1 external link recommended

  const linkTexts = links.map((l) => l.text).filter((t) => t.length > 0);

  return {
    internalLinks,
    externalLinks,
    totalLinks,
    brokenLinks: 0, // Would require HTTP requests to check
    noFollowLinks,
    linkTexts,
    hasValidInternalLinks,
    hasValidExternalLinks,
  };
}

/**
 * Calculate link analysis score
 */
export function calculateLinkScore(analysis: LinkAnalysis): number {
  let score = 0;

  // Has internal links (50 points)
  if (analysis.hasValidInternalLinks) {
    if (analysis.internalLinks >= 5) {
      score += 50;
    } else if (analysis.internalLinks >= 3) {
      score += 40;
    } else if (analysis.internalLinks >= 2) {
      score += 30;
    } else if (analysis.internalLinks >= 1) {
      score += 15;
    }
  }

  // Has external links (30 points)
  if (analysis.hasValidExternalLinks) {
    if (analysis.externalLinks >= 3) {
      score += 30;
    } else if (analysis.externalLinks >= 2) {
      score += 25;
    } else {
      score += 20;
    }
  }

  // Total links (20 points) - having a good number of links
  if (analysis.totalLinks >= 5) {
    score += 20;
  } else if (analysis.totalLinks >= 3) {
    score += 15;
  } else if (analysis.totalLinks >= 1) {
    score += 10;
  }

  // Deduct points for nofollow on internal links (not recommended)
  if (
    analysis.noFollowLinks > 0 &&
    analysis.noFollowLinks >= analysis.internalLinks * 0.5
  ) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get link recommendations
 */
export function getLinkRecommendations(analysis: LinkAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.totalLinks === 0) {
    recommendations.push(
      'Add links to your content. Internal and external links help SEO and provide value to readers.'
    );
  } else {
    if (!analysis.hasValidInternalLinks) {
      recommendations.push(
        'Add at least 2-3 internal links to related content on your site. This helps with site structure and user engagement.'
      );
    }

    if (!analysis.hasValidExternalLinks) {
      recommendations.push(
        'Add at least 1 external link to a high-quality, authoritative source. This builds credibility.'
      );
    }
  }

  if (
    analysis.internalLinks > 0 &&
    analysis.noFollowLinks >= analysis.internalLinks
  ) {
    recommendations.push(
      'Avoid using nofollow on internal links. Internal links should pass link juice freely.'
    );
  }

  // Check for generic link text
  const genericTexts = analysis.linkTexts.filter((text) =>
    /^(click here|read more|learn more|here|this)$/i.test(text.trim())
  );

  if (genericTexts.length > analysis.linkTexts.length * 0.3) {
    recommendations.push(
      'Avoid generic link text like "click here" or "read more". Use descriptive, keyword-rich anchor text.'
    );
  }

  if (analysis.totalLinks > 20) {
    recommendations.push(
      'You have many links. Consider if all are necessary. Too many links can dilute link equity and overwhelm readers.'
    );
  }

  return recommendations;
}

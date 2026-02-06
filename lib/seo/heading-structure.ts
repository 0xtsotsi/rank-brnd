/**
 * Heading Structure Analysis
 *
 * Analyzes HTML heading hierarchy and structure.
 */

import type { HeadingStructure } from './types';

/**
 * Extract all headings from HTML content with their level and text
 */
function extractHeadings(html: string): Array<{
  level: number;
  text: string;
  wordCount: number;
}> {
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const headings: Array<{ level: number; text: string; wordCount: number }> =
    [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

    if (text) {
      headings.push({ level, text, wordCount });
    }
  }

  return headings;
}

/**
 * Check if heading hierarchy is proper (no skipped levels)
 */
function checkHeadingHierarchy(headings: Array<{ level: number }>): {
  valid: boolean;
  skippedLevels: number[];
} {
  const skippedLevels: number[] = [];
  let previousLevel = 0;

  for (const heading of headings) {
    // First heading should be h1
    if (previousLevel === 0 && heading.level !== 1) {
      if (!skippedLevels.includes(1)) skippedLevels.push(1);
    }

    // Check for skipped levels (should only go one level deeper at a time)
    if (previousLevel > 0 && heading.level > previousLevel + 1) {
      for (let i = previousLevel + 1; i < heading.level; i++) {
        if (!skippedLevels.includes(i)) skippedLevels.push(i);
      }
    }

    previousLevel = heading.level;
  }

  return {
    valid: skippedLevels.length === 0,
    skippedLevels,
  };
}

/**
 * Count headings by level
 */
function countHeadingsByLevel(
  headings: Array<{ level: number }>
): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const heading of headings) {
    counts[heading.level] = (counts[heading.level] || 0) + 1;
  }

  return counts;
}

/**
 * Analyze heading structure of content
 */
export function analyzeHeadingStructure(content: string): HeadingStructure {
  const headings = extractHeadings(content);
  const counts = countHeadingsByLevel(headings);
  const h1Count = counts[1];
  const hasH1 = h1Count > 0;

  const hierarchyCheck = checkHeadingHierarchy(headings);

  return {
    hasH1,
    h1Count,
    headingHierarchy: hierarchyCheck.valid,
    headings,
    skippedLevels: hierarchyCheck.skippedLevels,
  };
}

/**
 * Calculate heading structure score
 */
export function calculateHeadingScore(structure: HeadingStructure): number {
  let score = 0;
  const maxScore = 100;

  // Has H1 (30 points)
  if (structure.hasH1) {
    if (structure.h1Count === 1) {
      score += 30;
    } else if (structure.h1Count <= 2) {
      score += 15;
    }
  }

  // Proper hierarchy (40 points)
  if (structure.headingHierarchy) {
    score += 40;
  } else if (structure.skippedLevels.length <= 2) {
    score += 20;
  }

  // Has subheadings (30 points)
  const hasH2 = structure.headings.some((h) => h.level === 2);
  const hasH3 = structure.headings.some((h) => h.level === 3);

  if (hasH2 && hasH3) {
    score += 30;
  } else if (hasH2) {
    score += 20;
  } else if (structure.headings.length > 1) {
    score += 10;
  }

  return Math.min(maxScore, score);
}

/**
 * Get heading structure issues/recommendations
 */
export function getHeadingRecommendations(
  structure: HeadingStructure
): string[] {
  const recommendations: string[] = [];

  if (!structure.hasH1) {
    recommendations.push(
      'Add an H1 heading to your content. This is the most important heading for SEO.'
    );
  } else if (structure.h1Count > 1) {
    recommendations.push(
      'You have multiple H1 headings. Use only one H1 per page and use H2-H6 for subheadings.'
    );
  }

  if (!structure.headingHierarchy) {
    recommendations.push(
      `Your heading hierarchy skips levels: ${structure.skippedLevels.join(', ')}. ` +
        'Ensure headings follow a logical order (H1 → H2 → H3 → ...).'
    );
  }

  const hasH2 = structure.headings.some((h) => h.level === 2);
  if (!hasH2 && structure.hasH1) {
    recommendations.push(
      'Add H2 subheadings to break up your content and improve readability.'
    );
  }

  const emptyHeadings = structure.headings.filter((h) => h.wordCount === 0);
  if (emptyHeadings.length > 0) {
    recommendations.push(
      'Some headings appear to be empty. Add descriptive text to all headings.'
    );
  }

  if (structure.headings.length === 0) {
    recommendations.push(
      'Add headings to structure your content. This helps both readers and search engines understand your content.'
    );
  }

  return recommendations;
}

/**
 * Keyword Density Analysis
 *
 * Analyzes keyword usage and density in content.
 */

import type { KeywordDensity } from './types';

/**
 * Extract plain text from HTML content
 */
function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count word occurrences in text (case-insensitive)
 */
function countWordOccurrences(text: string, keyword: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase().trim();

  // Use word boundary matching
  const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'gi');
  const matches = normalizedText.match(regex);

  return matches ? matches.length : 0;
}

/**
 * Get first paragraph from content
 */
function getFirstParagraph(content: string): string {
  const text = extractText(content);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 20);

  return paragraphs[0] || text.substring(0, 500);
}

/**
 * Extract headings from HTML content
 */
function extractHeadings(html: string): string[] {
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const headings: string[] = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const headingText = match[2].replace(/<[^>]+>/g, '').trim();
    if (headingText) {
      headings.push(headingText);
    }
  }

  return headings;
}

/**
 * Analyze keyword density in content
 */
export function analyzeKeywordDensity(
  content: string,
  options: {
    keyword?: string;
    title?: string;
    slug?: string;
    metaDescription?: string | null;
  } = {}
): KeywordDensity {
  const text = extractText(content);
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  // If no keyword specified, try to extract from title or use first few words
  let keyword = options.keyword?.trim();
  if (!keyword && options.title) {
    // Extract potential keywords from title (remove common words)
    const titleWords = options.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .filter(
        (w) =>
          ![
            'the',
            'and',
            'for',
            'are',
            'but',
            'not',
            'you',
            'all',
            'can',
            'had',
            'her',
            'was',
            'one',
            'our',
            'out',
            'has',
          ].includes(w)
      );
    keyword = titleWords.slice(0, 2).join(' ');
  }

  if (!keyword) {
    keyword = text.split(/\s+/)[0] || '';
  }

  if (wordCount === 0 || !keyword) {
    return {
      keyword: keyword || '',
      count: 0,
      density: 0,
      inTitle: false,
      inFirstParagraph: false,
      inUrl: false,
      inMetaDescription: false,
      inHeadings: false,
      score: 0,
    };
  }

  // Count keyword occurrences
  const count = countWordOccurrences(text, keyword);
  const density = wordCount > 0 ? (count / wordCount) * 100 : 0;

  // Check keyword placement
  const title = options.title || '';
  const inTitle = countWordOccurrences(title, keyword) > 0;

  const firstParagraph = getFirstParagraph(content);
  const inFirstParagraph = countWordOccurrences(firstParagraph, keyword) > 0;

  const slug = options.slug || '';
  const inUrl = countWordOccurrences(slug, keyword) > 0;

  const metaDescription = options.metaDescription || '';
  const inMetaDescription = countWordOccurrences(metaDescription, keyword) > 0;

  const headings = extractHeadings(content).join(' ');
  const inHeadings = countWordOccurrences(headings, keyword) > 0;

  // Calculate score based on:
  // - Optimal density (1-2%)
  // - Keyword in key positions (title, first paragraph, URL, headings, meta description)
  let score = 0;

  // Density score (optimal: 1-2%)
  if (density >= 1 && density <= 2) {
    score += 40;
  } else if (density >= 0.5 && density < 3) {
    score += 25;
  } else if (density > 0 && density < 4) {
    score += 10;
  }

  // Placement scores
  if (inTitle) score += 20;
  if (inFirstParagraph) score += 10;
  if (inHeadings) score += 10;
  if (inMetaDescription) score += 10;
  if (inUrl) score += 10;

  score = Math.min(100, Math.max(0, score));

  return {
    keyword,
    count,
    density: Math.round(density * 100) / 100,
    inTitle,
    inFirstParagraph,
    inUrl,
    inMetaDescription,
    inHeadings,
    score,
  };
}

/**
 * Get density rating description
 */
export function getDensityRating(density: number): string {
  if (density < 0.5) return 'Too Low';
  if (density <= 2) return 'Optimal';
  if (density <= 3) return 'Acceptable';
  return 'Too High (Keyword Stuffing)';
}

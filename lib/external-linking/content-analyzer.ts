/**
 * External Linking - Content Analyzer
 *
 * Analyzes content to identify keywords, topics, and entities
 * for finding relevant external link opportunities.
 */

import type { ContentAnalysisForExternalLinks } from './types';

/**
 * Extract keywords from content using TF-IDF-like approach
 */
function extractKeywords(content: string, maxKeywords: number = 20): string[] {
  // Remove HTML tags and normalize text
  const text = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .toLowerCase();

  // Tokenize into words (filtering out short words and common stop words)
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'to',
    'of',
    'in',
    'for',
    'on',
    'at',
    'by',
    'with',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'also',
    'now',
    'get',
    'got',
    'like',
  ]);

  const words = text
    .split(/\s+/)
    .filter(
      (word) => word.length > 3 && !stopWords.has(word) && /^[a-z]+$/.test(word)
    );

  // Count word frequencies
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Sort by frequency and return top keywords
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map((entry) => entry[0]);
}

/**
 * Extract topics from content using phrase detection
 */
function extractTopics(content: string): string[] {
  const topics: string[] = [];

  // Look for heading content as potential topics
  const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const headingText = match[1].replace(/<[^>]+>/g, '').trim();
    if (headingText.length > 3 && headingText.length < 100) {
      topics.push(headingText.toLowerCase());
    }
  }

  // Look for emphasized text (strong, em) as potential topics
  const emphasisRegex = /<(strong|em|b)[^>]*>(.*?)<\/\1>/gi;
  while ((match = emphasisRegex.exec(content)) !== null) {
    const emphasisText = match[2].replace(/<[^>]+>/g, '').trim();
    if (emphasisText.length > 3 && emphasisText.length < 100) {
      const words = emphasisText.toLowerCase().split(/\s+/).slice(0, 5);
      if (words.length >= 2) {
        topics.push(words.join(' '));
      }
    }
  }

  return [...new Set(topics)].slice(0, 15);
}

/**
 * Extract named entities from content (simplified approach)
 */
function extractEntities(content: string): string[] {
  const entities: string[] = [];

  // Look for capitalized words that might be named entities
  const text = content.replace(/<[^>]+>/g, ' ');
  const capitalizedWordsRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
  let match;
  const seen = new Set<string>();

  while ((match = capitalizedWordsRegex.exec(text)) !== null) {
    const entity = match[1].trim();
    // Filter out common sentence starters
    if (
      entity.length > 2 &&
      entity.length < 50 &&
      ![
        'The',
        'This',
        'That',
        'These',
        'Those',
        'When',
        'Where',
        'What',
        'How',
      ].includes(entity)
    ) {
      const lower = entity.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        entities.push(entity);
      }
    }
  }

  return entities.slice(0, 20);
}

/**
 * Extract existing external links from content
 */
function extractExistingLinks(content: string): Array<{
  url: string;
  anchorText: string;
  context: string;
}> {
  const links: Array<{ url: string; anchorText: string; context: string }> = [];

  // Match links with their context
  const linkRegex =
    /(<a\s+(?:[^>]*?\s+)?href=(["'])([^"']+)\2[^>]*>(.*?)<\/a>)/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const fullMatch = match[1];
    const href = match[3];
    const anchorText = match[4].replace(/<[^>]+>/g, '').trim();

    // Get surrounding context (100 chars before and after)
    const position = match.index;
    const contextStart = Math.max(0, position - 100);
    const contextEnd = Math.min(
      content.length,
      position + fullMatch.length + 100
    );
    const context = content
      .slice(contextStart, contextEnd)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    links.push({
      url: href,
      anchorText,
      context: context.slice(-200),
    });
  }

  return links;
}

/**
 * Analyze content for external linking opportunities
 */
export function analyzeContentForExternalLinks(
  content: string,
  providedKeywords?: string[]
): ContentAnalysisForExternalLinks {
  const keywords =
    providedKeywords && providedKeywords.length > 0
      ? providedKeywords
      : extractKeywords(content);

  const topics = extractTopics(content);
  const entities = extractEntities(content);
  const existingExternalLinks = extractExistingLinks(content);

  // Calculate suggested link count based on content length
  const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).length;
  let suggestedLinkCount = 0;
  if (wordCount < 300) {
    suggestedLinkCount = 1;
  } else if (wordCount < 600) {
    suggestedLinkCount = 2;
  } else if (wordCount < 1000) {
    suggestedLinkCount = 3;
  } else if (wordCount < 1500) {
    suggestedLinkCount = 4;
  } else if (wordCount < 2000) {
    suggestedLinkCount = 5;
  } else {
    suggestedLinkCount = Math.min(10, Math.floor(wordCount / 400));
  }

  // Subtract existing external links
  suggestedLinkCount = Math.max(
    0,
    suggestedLinkCount - existingExternalLinks.length
  );

  return {
    keywords,
    topics,
    entities,
    existingExternalLinks,
    suggestedLinkCount,
  };
}

/**
 * Find the best position in content to insert a link based on context
 */
export function findBestInsertPosition(
  content: string,
  keyword: string,
  existingLinks: Array<{ url: string; anchorText: string; context: string }>
): { position: number; context: string } | null {
  const keywordLower = keyword.toLowerCase();

  // Try to find the keyword in paragraphs (not in headings)
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
  let match;
  let bestMatch: { position: number; context: string } | null = null;
  let bestScore = 0;

  while ((match = paragraphRegex.exec(content)) !== null) {
    const paragraphContent = match[1];
    const position = match.index;

    // Check if keyword is in this paragraph
    if (paragraphContent.toLowerCase().includes(keywordLower)) {
      // Skip if there's already a link nearby
      const tooCloseToExisting = existingLinks.some((link) => {
        return link.context.toLowerCase().includes(keywordLower);
      });

      if (!tooCloseToExisting) {
        // Score based on keyword position and paragraph quality
        const wordsInParagraph = paragraphContent.split(/\s+/).length;
        let score = 100 - Math.abs(wordsInParagraph - 50); // Prefer medium-length paragraphs

        if (score > bestScore) {
          bestScore = score;
          // Find position after keyword in paragraph
          const keywordPos = paragraphContent
            .toLowerCase()
            .indexOf(keywordLower);
          if (keywordPos >= 0) {
            const insertPos = position + keywordPos + keyword.length;
            const context = paragraphContent
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(-100);
            bestMatch = { position: insertPos, context };
          }
        }
      }
    }
  }

  // If no good paragraph match found, try to find in any text
  if (!bestMatch) {
    const keywordPos = content.toLowerCase().indexOf(keywordLower);
    if (keywordPos >= 0) {
      const contextStart = Math.max(0, keywordPos - 50);
      const contextEnd = Math.min(
        content.length,
        keywordPos + keyword.length + 50
      );
      const context = content
        .slice(contextStart, contextEnd)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      bestMatch = {
        position: keywordPos + keyword.length,
        context,
      };
    }
  }

  return bestMatch;
}

/**
 * Generate anchor text for a given keyword and source
 */
export function generateAnchorText(
  keyword: string,
  source: {
    name: string;
    domain: string;
    topics?: string[];
  },
  linkType: 'external' | 'citation' | 'reference'
): string {
  const keywordLower = keyword.toLowerCase();

  // Check if source name matches keyword
  if (
    source.name.toLowerCase().includes(keywordLower) ||
    keywordLower.includes(source.name.toLowerCase())
  ) {
    return source.name;
  }

  // For citations, use a more descriptive format
  if (linkType === 'citation') {
    return `according to ${source.name}`;
  }

  // For references, use the source name
  if (linkType === 'reference') {
    return source.name;
  }

  // Default: use the keyword itself
  return keyword;
}

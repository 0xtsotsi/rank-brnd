/**
 * Internal Linking - Content Analyzer
 *
 * Analyzes content to identify keywords, topics, and entities
 * for finding relevant internal link opportunities.
 */

import type { ContentAnalysisForInternalLinks } from './types';

/**
 * Extract keywords from content using TF-IDF-like approach
 */
export function extractKeywords(
  content: string,
  maxKeywords: number = 20
): string[] {
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
    'this',
    'that',
    'these',
    'those',
    'which',
    'who',
    'whom',
    'whose',
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
export function extractTopics(content: string): string[] {
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
export function extractEntities(content: string): string[] {
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
 * Extract existing internal links from content
 */
export function extractExistingInternalLinks(
  content: string,
  currentArticleUrl: string
): Array<{ url: string; anchorText: string; context: string }> {
  const links: Array<{ url: string; anchorText: string; context: string }> = [];

  // Match links with their context
  const linkRegex =
    /(<a\s+(?:[^>]*?\s+)?href=(["'])([^"']+)\2[^>]*>(.*?)<\/a>)/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[3];
    const anchorText = match[4].replace(/<[^>]+>/g, '').trim();

    // Check if it's an internal link (same domain or relative)
    const isInternal =
      href.startsWith('/') ||
      href.startsWith('./') ||
      href.startsWith('../') ||
      href.includes(currentArticleUrl.split('/')[2] || '');

    if (isInternal) {
      // Get surrounding context
      const position = match.index;
      const contextStart = Math.max(0, position - 100);
      const contextEnd = Math.min(
        content.length,
        position + match[1].length + 100
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
  }

  return links;
}

/**
 * Calculate word count from content
 */
export function calculateWordCount(content: string): number {
  const text = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

/**
 * Analyze content for internal linking opportunities
 */
export function analyzeContentForInternalLinks(
  content: string,
  articleUrl?: string
): ContentAnalysisForInternalLinks {
  const keywords = extractKeywords(content);
  const topics = extractTopics(content);
  const entities = extractEntities(content);
  const wordCount = calculateWordCount(content);

  const existingInternalLinks = articleUrl
    ? extractExistingInternalLinks(content, articleUrl)
    : [];

  // Calculate suggested link count based on content length
  // Generally: 1-2 internal links per 300-500 words
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
    suggestedLinkCount = Math.min(15, Math.floor(wordCount / 300));
  }

  // Subtract existing internal links
  suggestedLinkCount = Math.max(
    0,
    suggestedLinkCount - existingInternalLinks.length
  );

  return {
    keywords,
    topics,
    entities,
    suggestedLinkCount,
    wordCount,
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
      // Skip if there's already a link in this paragraph
      const tooCloseToExisting = existingLinks.some((link) =>
        link.context.toLowerCase().includes(keywordLower)
      );

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
 * Generate anchor text for a given keyword and target article
 */
export function generateAnchorText(
  keyword: string,
  targetArticle: { title: string; slug: string; tags?: string[] | null },
  linkType: 'contextual' | 'related' | 'see_also' | 'further_reading'
): string {
  const keywordLower = keyword.toLowerCase();
  const titleLower = targetArticle.title.toLowerCase();

  // Check if keyword matches title closely
  if (titleLower.includes(keywordLower) || keywordLower.includes(titleLower)) {
    return targetArticle.title;
  }

  // Check if keyword matches any tags
  if (targetArticle.tags) {
    for (const tag of targetArticle.tags) {
      if (tag.toLowerCase() === keywordLower) {
        return keyword;
      }
    }
  }

  // For 'see_also' and 'further_reading', use article title
  if (linkType === 'see_also' || linkType === 'further_reading') {
    return targetArticle.title;
  }

  // Default: use the keyword itself
  return keyword;
}

/**
 * Calculate relevance score between source content and target article
 */
export function calculateRelevanceScore(
  sourceKeywords: string[],
  sourceTopics: string[],
  sourceEntities: string[],
  targetArticle: {
    title: string;
    content: string | null;
    excerpt: string | null;
    tags: string[] | null;
    category: string | null;
    keywords?: string[];
  }
): number {
  let score = 0;
  const maxScore = 100;

  // Normalize target article data for comparison
  const targetTitle = targetArticle.title.toLowerCase();
  const targetContent = (targetArticle.content || '').toLowerCase();
  const targetExcerpt = (targetArticle.excerpt || '').toLowerCase();
  const targetTags = (targetArticle.tags || []).map((t) => t.toLowerCase());
  const targetCategory = (targetArticle.category || '').toLowerCase();
  const targetKeywords = (targetArticle.keywords || []).map((k) =>
    k.toLowerCase()
  );

  // 1. Keyword matching (up to 40 points)
  const keywordMatches = sourceKeywords.filter(
    (kw) =>
      targetTitle.includes(kw) ||
      targetContent.includes(kw) ||
      targetKeywords.some((tkw) => tkw.includes(kw) || kw.includes(tkw))
  );
  const keywordScore = Math.min(40, keywordMatches.length * 10);
  score += keywordScore;

  // 2. Topic matching (up to 25 points)
  const topicMatches = sourceTopics.filter(
    (topic) =>
      targetTitle.includes(topic) ||
      targetContent.includes(topic) ||
      targetExcerpt.includes(topic)
  );
  const topicScore = Math.min(25, topicMatches.length * 8);
  score += topicScore;

  // 3. Entity matching (up to 15 points)
  const entityMatches = sourceEntities.filter(
    (entity) =>
      targetTitle.includes(entity.toLowerCase()) ||
      targetContent.includes(entity.toLowerCase())
  );
  const entityScore = Math.min(15, entityMatches.length * 5);
  score += entityScore;

  // 4. Tag matching (up to 10 points)
  const tagMatches = sourceKeywords.filter((kw) =>
    targetTags.some((tag) => tag.includes(kw) || kw.includes(tag))
  );
  const tagScore = Math.min(10, tagMatches.length * 3);
  score += tagScore;

  // 5. Category matching (up to 10 points)
  const categoryMatch = sourceKeywords.some(
    (kw) => targetCategory.includes(kw) || kw.includes(targetCategory)
  );
  if (categoryMatch && targetCategory) {
    score += 10;
  }

  return Math.min(maxScore, score);
}

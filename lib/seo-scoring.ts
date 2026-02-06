/**
 * SEO Scoring Utility
 *
 * Provides real-time SEO analysis for articles including:
 * - Content score calculation
 * - Checklist validation
 * - Keyword density analysis
 * - Readability assessment
 * - Actionable suggestions
 */

export interface SEODocument {
  title: string;
  content: string;
  excerpt: string | null;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  slug: string;
  featuredImageUrl: string;
  wordCount: number;
}

export interface SEOCheckItem {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  category: 'content' | 'metadata' | 'structure' | 'readability';
  suggestion?: string;
}

export interface SEOScoreResult {
  score: number;
  level: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  checklist: SEOCheckItem[];
  keywordDensity: KeywordDensityResult;
  suggestions: string[];
}

export interface KeywordDensityResult {
  keywords: Record<string, number>;
  topKeywords: Array<{ word: string; count: number; density: number }>;
  totalWords: number;
}

/**
 * Common stop words to exclude from keyword analysis
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'been',
  'be',
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
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'what',
  'which',
  'who',
  'whom',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
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
  'here',
  'there',
  'then',
  'once',
  'if',
  'because',
  'until',
  'while',
  'about',
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
  'their',
  'your',
  'our',
  'its',
  'his',
  'her',
  'my',
  'any',
  'being',
  'get',
  'got',
  'getting',
  'going',
  'go',
  'goes',
  'went',
  'comes',
  'came',
  'make',
  'makes',
  'made',
  'take',
  'takes',
  'took',
  'see',
  'seen',
  'saw',
  'know',
  'knows',
  'knew',
  'think',
  'thinks',
  'thought',
  'want',
  'wants',
  'wanted',
  'use',
  'uses',
  'used',
  'say',
  'says',
  'said',
  'tell',
  'tells',
  'told',
  'ask',
  'asks',
  'asked',
  'need',
  'needs',
  'needed',
  'feel',
  'feels',
  'felt',
  'try',
  'tries',
  'tried',
  'leave',
  'leaves',
  'left',
  'call',
  'calls',
  'called',
]);

/**
 * Extract plain text from HTML content
 */
function extractTextFromHTML(html: string): string {
  if (!html) return '';
  // Remove HTML tags
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);

  return matches ? matches.length : 1;
}

/**
 * Calculate Flesch Reading Ease score
 */
function calculateReadabilityScore(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);

  if (words.length === 0 || sentences.length === 0) return 0;

  return Math.max(
    0,
    Math.min(
      100,
      206.835 -
        1.015 * (words.length / sentences.length) -
        84.6 * (syllables / words.length)
    )
  );
}

/**
 * Calculate keyword density from text
 */
export function calculateKeywordDensity(
  text: string,
  topN = 10
): KeywordDensityResult {
  const plainText = extractTextFromHTML(text).toLowerCase();
  const words = plainText
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const keywordMap: Record<string, number> = {};
  words.forEach((word) => {
    keywordMap[word] = (keywordMap[word] || 0) + 1;
  });

  const totalWords = words.length;
  const topKeywords = Object.entries(keywordMap)
    .map(([word, count]) => ({
      word,
      count,
      density: totalWords > 0 ? (count / totalWords) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return {
    keywords: keywordMap,
    topKeywords,
    totalWords,
  };
}

/**
 * Check if title length is optimal
 */
function checkTitleLength(title: string): {
  passed: boolean;
  suggestion?: string;
} {
  const length = title.trim().length;
  if (length >= 30 && length <= 60) {
    return { passed: true };
  }
  if (length === 0) {
    return {
      passed: false,
      suggestion: 'Add a title to your article (30-60 characters recommended)',
    };
  }
  if (length < 30) {
    return {
      passed: false,
      suggestion: `Title is too short (${length} chars). Aim for 30-60 characters for better SEO`,
    };
  }
  return {
    passed: false,
    suggestion: `Title is too long (${length} chars). Aim for 30-60 characters to avoid truncation in search results`,
  };
}

/**
 * Check if meta description is optimal
 */
function checkMetaDescription(description: string): {
  passed: boolean;
  suggestion?: string;
} {
  const length = description.trim().length;
  if (length >= 120 && length <= 160) {
    return { passed: true };
  }
  if (length === 0) {
    return {
      passed: false,
      suggestion: 'Add a meta description (120-160 characters recommended)',
    };
  }
  if (length < 120) {
    return {
      passed: false,
      suggestion: `Meta description is too short (${length} chars). Aim for 120-160 characters`,
    };
  }
  return {
    passed: false,
    suggestion: `Meta description is too long (${length} chars). Aim for 120-160 characters to avoid truncation`,
  };
}

/**
 * Check word count
 */
function checkWordCount(wordCount: number): {
  passed: boolean;
  suggestion?: string;
} {
  if (wordCount >= 300) {
    return { passed: true };
  }
  if (wordCount === 0) {
    return {
      passed: false,
      suggestion:
        'Add content to your article (minimum 300 words recommended for SEO)',
    };
  }
  return {
    passed: false,
    suggestion: `Article is too short (${wordCount} words). Aim for at least 300 words for better SEO performance`,
  };
}

/**
 * Check for heading structure
 */
function checkHeadingStructure(content: string): {
  passed: boolean;
  suggestion?: string;
} {
  const hasH1 = /<h1/i.test(content);
  const hasH2 = /<h2/i.test(content);

  if (hasH1 && hasH2) {
    return { passed: true };
  }
  if (!hasH1) {
    return {
      passed: false,
      suggestion: 'Add an H1 heading to structure your content',
    };
  }
  return {
    passed: false,
    suggestion:
      'Add H2 subheadings to break up your content for better readability',
  };
}

/**
 * Check for images
 */
function checkImages(
  content: string,
  featuredImage: string
): { passed: boolean; suggestion?: string } {
  const hasContentImages = /<img/i.test(content);
  const hasFeaturedImage = !!featuredImage;

  if (hasFeaturedImage || hasContentImages) {
    return { passed: true };
  }
  return {
    passed: false,
    suggestion: 'Add at least one image to make your article more engaging',
  };
}

/**
 * Check for internal links
 */
function checkLinks(content: string): { passed: boolean; suggestion?: string } {
  const linkCount = (content.match(/<a\s/i) || []).length;

  if (linkCount >= 2) {
    return { passed: true };
  }
  if (linkCount === 0) {
    return {
      passed: false,
      suggestion:
        'Add internal links to other content on your site to improve SEO',
    };
  }
  return {
    passed: false,
    suggestion:
      'Add more internal links (aim for at least 2-3 links per article)',
  };
}

/**
 * Check paragraph length
 */
function checkParagraphLength(content: string): {
  passed: boolean;
  suggestion?: string;
} {
  const plainText = extractTextFromHTML(content);
  const paragraphs = plainText
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  const avgParagraphLength =
    paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) /
    (paragraphs.length || 1);

  if (avgParagraphLength <= 100) {
    return { passed: true };
  }
  return {
    passed: false,
    suggestion:
      'Some paragraphs are too long. Break them into shorter chunks (3-5 sentences) for better readability',
  };
}

/**
 * Check if slug is present
 */
function checkSlug(slug: string): { passed: boolean; suggestion?: string } {
  if (slug && slug.trim().length > 0) {
    return { passed: true };
  }
  return { passed: false, suggestion: 'Add a URL slug for your article' };
}

/**
 * Check if keywords are defined
 */
function checkKeywords(keywords: string): {
  passed: boolean;
  suggestion?: string;
} {
  const keywordArray = keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keywordArray.length >= 3) {
    return { passed: true };
  }
  if (keywordArray.length === 0) {
    return {
      passed: false,
      suggestion:
        'Add target keywords for your article (at least 3-5 keywords)',
    };
  }
  return {
    passed: false,
    suggestion: 'Add more target keywords (aim for 3-5 keywords)',
  };
}

/**
 * Check if title contains focus keyword
 */
function checkTitleKeyword(
  title: string,
  keywords: string
): { passed: boolean; suggestion?: string } {
  const keywordArray = keywords
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0);

  if (keywordArray.length === 0) {
    return { passed: true }; // Skip if no keywords defined
  }

  const titleLower = title.toLowerCase();
  const hasKeyword = keywordArray.some((kw) => titleLower.includes(kw));

  if (hasKeyword) {
    return { passed: true };
  }
  return {
    passed: false,
    suggestion: 'Include your main keyword in the title for better SEO',
  };
}

/**
 * Check if content has focus keyword
 */
function checkContentKeyword(
  content: string,
  keywords: string
): { passed: boolean; suggestion?: string } {
  const keywordArray = keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 2);

  if (keywordArray.length === 0) {
    return { passed: true };
  }

  const plainText = extractTextFromHTML(content).toLowerCase();
  const mainKeyword = keywordArray[0].toLowerCase();

  // Count occurrences
  const regex = new RegExp(`\\b${mainKeyword}\\b`, 'gi');
  const matches = plainText.match(regex);
  const count = matches ? matches.length : 0;

  if (count >= 2 && count <= 10) {
    return { passed: true };
  }
  if (count === 0) {
    return {
      passed: false,
      suggestion: `Include your main keyword "${mainKeyword}" in the content (2-3 times recommended)`,
    };
  }
  return {
    passed: false,
    suggestion: `Main keyword appears ${count} times. Consider using it 2-3 times to avoid keyword stuffing`,
  };
}

/**
 * Calculate overall SEO score
 */
export function calculateSEOScore(doc: SEODocument): SEOScoreResult {
  const checklist: SEOCheckItem[] = [];

  // Content checks (weight: 40%)
  const wordCountCheck = checkWordCount(doc.wordCount);
  checklist.push({
    id: 'word-count',
    label: 'Word count (300+ words)',
    passed: wordCountCheck.passed,
    weight: 15,
    category: 'content',
    suggestion: wordCountCheck.suggestion,
  });

  const headingCheck = checkHeadingStructure(doc.content);
  checklist.push({
    id: 'headings',
    label: 'Heading structure (H1, H2)',
    passed: headingCheck.passed,
    weight: 10,
    category: 'structure',
    suggestion: headingCheck.suggestion,
  });

  const imageCheck = checkImages(doc.content, doc.featuredImageUrl);
  checklist.push({
    id: 'images',
    label: 'At least one image',
    passed: imageCheck.passed,
    weight: 10,
    category: 'content',
    suggestion: imageCheck.suggestion,
  });

  const linkCheck = checkLinks(doc.content);
  checklist.push({
    id: 'links',
    label: 'Internal links (2+)',
    passed: linkCheck.passed,
    weight: 5,
    category: 'structure',
    suggestion: linkCheck.suggestion,
  });

  // Metadata checks (weight: 35%)
  const titleLengthCheck = checkTitleLength(doc.title);
  checklist.push({
    id: 'title-length',
    label: 'Title length (30-60 chars)',
    passed: titleLengthCheck.passed,
    weight: 10,
    category: 'metadata',
    suggestion: titleLengthCheck.suggestion,
  });

  const metaDescCheck = checkMetaDescription(doc.metaDescription);
  checklist.push({
    id: 'meta-description',
    label: 'Meta description (120-160 chars)',
    passed: metaDescCheck.passed,
    weight: 10,
    category: 'metadata',
    suggestion: metaDescCheck.suggestion,
  });

  const slugCheck = checkSlug(doc.slug);
  checklist.push({
    id: 'slug',
    label: 'URL slug present',
    passed: slugCheck.passed,
    weight: 5,
    category: 'metadata',
    suggestion: slugCheck.suggestion,
  });

  const keywordsCheck = checkKeywords(doc.metaKeywords);
  checklist.push({
    id: 'meta-keywords',
    label: 'Target keywords defined',
    passed: keywordsCheck.passed,
    weight: 10,
    category: 'metadata',
    suggestion: keywordsCheck.suggestion,
  });

  // Keyword optimization checks (weight: 15%)
  const titleKeywordCheck = checkTitleKeyword(doc.title, doc.metaKeywords);
  checklist.push({
    id: 'title-keyword',
    label: 'Title contains keyword',
    passed: titleKeywordCheck.passed,
    weight: 8,
    category: 'metadata',
    suggestion: titleKeywordCheck.suggestion,
  });

  const contentKeywordCheck = checkContentKeyword(
    doc.content,
    doc.metaKeywords
  );
  checklist.push({
    id: 'content-keyword',
    label: 'Content uses keywords naturally',
    passed: contentKeywordCheck.passed,
    weight: 7,
    category: 'content',
    suggestion: contentKeywordCheck.suggestion,
  });

  // Readability checks (weight: 10%)
  const paragraphCheck = checkParagraphLength(doc.content);
  checklist.push({
    id: 'paragraph-length',
    label: 'Short, readable paragraphs',
    passed: paragraphCheck.passed,
    weight: 10,
    category: 'readability',
    suggestion: paragraphCheck.suggestion,
  });

  // Calculate score
  const totalWeight = checklist.reduce((sum, item) => sum + item.weight, 0);
  const earnedWeight = checklist.reduce(
    (sum, item) => sum + (item.passed ? item.weight : 0),
    0
  );
  const score = Math.round((earnedWeight / totalWeight) * 100);

  // Determine level
  let level: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (score >= 80) level = 'Excellent';
  else if (score >= 60) level = 'Good';
  else if (score >= 40) level = 'Fair';
  else level = 'Poor';

  // Collect suggestions
  const suggestions = checklist
    .filter((item) => !item.passed && item.suggestion)
    .map((item) => item.suggestion!);

  // Calculate keyword density
  const keywordDensity = calculateKeywordDensity(doc.content);

  return {
    score,
    level,
    checklist,
    keywordDensity,
    suggestions,
  };
}

/**
 * Quick score calculation for real-time updates (debounce friendly)
 */
export function getQuickSEOScore(
  title: string,
  content: string,
  metaDescription: string,
  wordCount: number
): { score: number; items: Array<{ id: string; passed: boolean }> } {
  const items = [
    { id: 'title', passed: title.length >= 30 && title.length <= 60 },
    {
      id: 'description',
      passed: metaDescription.length >= 120 && metaDescription.length <= 160,
    },
    { id: 'content', passed: wordCount >= 300 },
    { id: 'headings', passed: /<h1/i.test(content) && /<h2/i.test(content) },
  ];

  const score = Math.round(
    (items.filter((i) => i.passed).length / items.length) * 100
  );

  return { score, items };
}

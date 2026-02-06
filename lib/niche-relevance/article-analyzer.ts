/**
 * Article Niche Analyzer
 *
 * Analyzes article content to extract primary niche, secondary niches,
 * keywords, and confidence scores for relevance matching.
 */

import type { ArticleNicheAnalysis } from './types';
import {
  normalizeNiche,
  getNicheHierarchy,
  getAllNiches,
} from './niche-hierarchy';

/**
 * Keyword to niche mapping for enhanced article analysis
 */
const NICHE_KEYWORDS: Record<string, string[]> = {
  Technology: [
    'software',
    'app',
    'tech',
    'programming',
    'coding',
    'developer',
    'digital',
    'cloud',
    'data',
    'api',
    'framework',
    'database',
  ],
  SaaS: [
    'saas',
    'software as a service',
    'subscription',
    'cloud software',
    'platform',
    'b2b software',
  ],
  AI: [
    'ai',
    'artificial intelligence',
    'machine learning',
    'ml',
    'chatgpt',
    'gpt',
    'llm',
  ],
  Marketing: [
    'marketing',
    'seo',
    'promotion',
    'advertising',
    'brand',
    'campaign',
    'conversion',
    'funnel',
    'audience',
  ],
  SEO: [
    'seo',
    'search engine',
    'keyword',
    'backlink',
    'ranking',
    'serp',
    'organic search',
    'google search',
  ],
  Business: [
    'business',
    'company',
    'startup',
    'entrepreneur',
    'revenue',
    'profit',
    'strategy',
    'management',
    'corporate',
  ],
  Finance: [
    'finance',
    'financial',
    'invest',
    'money',
    'trading',
    'stock',
    'portfolio',
    'wealth',
    'banking',
  ],
  Crypto: [
    'crypto',
    'bitcoin',
    'ethereum',
    'blockchain',
    'defi',
    'nft',
    'web3',
    'token',
    'cryptocurrency',
  ],
  'E-commerce': [
    'ecommerce',
    'e-commerce',
    'online store',
    'shopify',
    'woocommerce',
    'cart',
    'checkout',
    'product catalog',
  ],
  Health: [
    'health',
    'medical',
    'wellness',
    'healthcare',
    'doctor',
    'treatment',
    'medicine',
    'fitness',
    'nutrition',
  ],
  Fitness: [
    'fitness',
    'workout',
    'exercise',
    'gym',
    'training',
    'muscle',
    'weight loss',
    'cardio',
    'strength',
  ],
  Lifestyle: [
    'lifestyle',
    'daily life',
    'habits',
    'routine',
    'living',
    'personal',
    'self improvement',
    'productivity',
  ],
  Travel: [
    'travel',
    'trip',
    'vacation',
    'destination',
    'hotel',
    'flight',
    'adventure',
    'tourist',
    'journey',
  ],
  Food: [
    'food',
    'recipe',
    'cooking',
    'meal',
    'cuisine',
    'restaurant',
    'chef',
    'ingredient',
    'dish',
    'kitchen',
  ],
  Fashion: [
    'fashion',
    'style',
    'clothing',
    'outfit',
    'wear',
    'trend',
    'designer',
    'brand',
    'accessory',
  ],
  Sports: [
    'sport',
    'game',
    'team',
    'player',
    'coach',
    'athlete',
    'championship',
    'league',
    'tournament',
  ],
  Gaming: [
    'gaming',
    'game',
    'video game',
    'gamer',
    'esports',
    'console',
    'pc gaming',
    'multiplayer',
    'nintendo',
  ],
  Entertainment: [
    'movie',
    'film',
    'tv',
    'television',
    'show',
    'series',
    'celebrity',
    'entertainment',
    'streaming',
    'music',
  ],
  Education: [
    'education',
    'learning',
    'course',
    'tutorial',
    'training',
    'study',
    'student',
    'teacher',
    'school',
    'knowledge',
  ],
  'Real Estate': [
    'real estate',
    'property',
    'home',
    'house',
    'apartment',
    'rent',
    'mortgage',
    'agent',
    'listing',
  ],
  Automotive: [
    'car',
    'vehicle',
    'automotive',
    'auto',
    'driving',
    'driver',
    'truck',
    'suv',
    'electric vehicle',
    'ev',
  ],
};

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Tokenize and clean
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Count word frequency
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }

  // Get top keywords by frequency
  const sortedWords = Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  return sortedWords;
}

/**
 * Detect niches from keywords
 */
export function detectNichesFromKeywords(
  keywords: string[]
): Array<{ niche: string; confidence: number }> {
  const detectedNiches: Array<{ niche: string; confidence: number }> = [];
  const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));

  for (const [niche, nicheKeywords] of Object.entries(NICHE_KEYWORDS)) {
    let matchCount = 0;
    for (const keyword of nicheKeywords) {
      if (keywordSet.has(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(
        100,
        (matchCount / nicheKeywords.length) * 100
      );
      detectedNiches.push({ niche, confidence });
    }
  }

  return detectedNiches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect niches from category
 */
export function detectNicheFromCategory(
  category: string | undefined
): string | undefined {
  if (!category) return undefined;

  // Direct match
  const normalized = normalizeNiche(category);
  if (normalized) return normalized;

  // Partial match
  const allNiches = getAllNiches();
  for (const niche of allNiches) {
    if (
      category.toLowerCase().includes(niche.toLowerCase()) ||
      niche.toLowerCase().includes(category.toLowerCase())
    ) {
      return niche;
    }
  }

  return undefined;
}

/**
 * Detect niches from tags
 */
export function detectNichesFromTags(
  tags: string[] = []
): Array<{ niche: string; confidence: number }> {
  const detectedNiches: Array<{ niche: string; confidence: number }> = [];

  for (const tag of tags) {
    const normalized = normalizeNiche(tag);
    if (normalized) {
      const existing = detectedNiches.find((n) => n.niche === normalized);
      if (existing) {
        existing.confidence = Math.min(100, existing.confidence + 20);
      } else {
        detectedNiches.push({ niche: normalized, confidence: 60 });
      }
    }
  }

  return detectedNiches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyze article to determine niches
 */
export function analyzeArticleNiches(article: {
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  meta_keywords?: string[];
}): ArticleNicheAnalysis {
  // Combine all text for analysis
  const fullText = [
    article.title,
    article.content || '',
    article.category || '',
    ...(article.tags || []),
    ...(article.meta_keywords || []),
  ].join(' ');

  // Extract keywords
  const extractedKeywords = extractKeywords(fullText);

  // Detect niches from various sources
  const categoryNiche = detectNicheFromCategory(article.category);
  const tagNiches = detectNichesFromTags(article.tags);
  const keywordNiches = detectNichesFromKeywords(extractedKeywords);

  // Combine all niche detections
  const nicheScores = new Map<string, number>();

  // Add category niche with high weight
  if (categoryNiche) {
    nicheScores.set(categoryNiche, (nicheScores.get(categoryNiche) || 0) + 50);
  }

  // Add tag niches
  for (const { niche, confidence } of tagNiches) {
    nicheScores.set(niche, (nicheScores.get(niche) || 0) + confidence);
  }

  // Add keyword-detected niches
  for (const { niche, confidence } of keywordNiches) {
    nicheScores.set(niche, (nicheScores.get(niche) || 0) + confidence * 0.5);
  }

  // Sort by score
  const sortedNiches = Array.from(nicheScores.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score >= 30);

  // Extract primary and secondary niches
  const primary_niche = sortedNiches[0]?.[0] || 'General';
  const secondary_niches = sortedNiches
    .slice(1, 4)
    .map(([niche]) => niche)
    .filter((n) => n !== primary_niche);

  // Calculate confidence score
  const confidence_score = sortedNiches[0]?.[1]
    ? Math.min(100, Math.round(sortedNiches[0][1]))
    : 0;

  // Extract categories (including provided category)
  const categories = [
    article.category,
    primary_niche,
    ...secondary_niches,
  ].filter(Boolean);

  return {
    primary_niche,
    secondary_niches,
    confidence_score,
    extracted_keywords: extractedKeywords.slice(0, 15),
    categories: categories as string[],
  };
}

/**
 * Quick niche detection from minimal data
 */
export function quickNicheDetect(article: {
  title: string;
  category?: string;
  tags?: string[];
}): {
  primary_niche: string;
  secondary_niches: string[];
  confidence: number;
} {
  const analysis = analyzeArticleNiches(article);
  return {
    primary_niche: analysis.primary_niche,
    secondary_niches: analysis.secondary_niches,
    confidence: analysis.confidence_score,
  };
}

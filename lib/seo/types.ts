/**
 * SEO Scoring Types
 *
 * Type definitions for the SEO scoring engine.
 */

/**
 * Individual SEO metric score with details
 */
export interface SEOMetric {
  score: number; // 0-100
  maxScore: number;
  weight: number; // Weight in overall score calculation
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Heading structure analysis
 */
export interface HeadingStructure {
  hasH1: boolean;
  h1Count: number;
  headingHierarchy: boolean; // Proper h1 -> h2 -> h3 structure
  headings: Array<{
    level: number;
    text: string;
    wordCount: number;
  }>;
  skippedLevels: number[];
}

/**
 * Keyword density analysis
 */
export interface KeywordDensity {
  keyword: string;
  count: number;
  density: number; // Percentage
  inTitle: boolean;
  inFirstParagraph: boolean;
  inUrl: boolean;
  inMetaDescription: boolean;
  inHeadings: boolean;
  score: number;
}

/**
 * Link analysis
 */
export interface LinkAnalysis {
  internalLinks: number;
  externalLinks: number;
  totalLinks: number;
  brokenLinks: number;
  noFollowLinks: number;
  linkTexts: string[];
  hasValidInternalLinks: boolean;
  hasValidExternalLinks: boolean;
}

/**
 * Image analysis
 */
export interface ImageAnalysis {
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  imagesWithDescriptiveAlt: number;
  altTextScore: number;
  missingAltUrls: string[];
}

/**
 * Meta tags analysis
 */
export interface MetaTagsAnalysis {
  hasTitle: boolean;
  titleLength: number;
  titleOptimal: boolean;
  hasDescription: boolean;
  descriptionLength: number;
  descriptionOptimal: boolean;
  hasKeywords: boolean;
  hasCanonical: boolean;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
}

/**
 * Readability analysis
 */
export interface ReadabilityAnalysis {
  fleschKincaidGrade: number;
  fleschKincaidScore: number; // 0-100 (higher = easier)
  targetGrade: number;
  targetGradeMin?: number;
  targetGradeMax?: number;
  targetGradeMet: boolean;
  sentenceCount: number;
  wordCount: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  score: number;
}

/**
 * Complete SEO analysis result
 */
export interface SEOAnalysisResult {
  overallScore: number; // 0-100
  keywordDensity: KeywordDensity;
  readability: ReadabilityAnalysis;
  headingStructure: HeadingStructure;
  metaTags: MetaTagsAnalysis;
  links: LinkAnalysis;
  images: ImageAnalysis;
  metrics: {
    keywordDensity: SEOMetric;
    readability: SEOMetric;
    headingStructure: SEOMetric;
    metaTags: SEOMetric;
    contentLength: SEOMetric;
    internalLinks: SEOMetric;
    externalLinks: SEOMetric;
    imageAltText: SEOMetric;
  };
  recommendations: string[];
  analyzedAt: string;
}

/**
 * SEO analysis input options
 */
export interface SEOAnalysisOptions {
  targetKeyword?: string;
  minWordCount?: number;
  maxWordCount?: number;
  targetFleschGradeMin?: number;
  targetFleschGradeMax?: number;
  baseUrl?: string; // For internal/external link detection
  checkBrokenLinks?: boolean;
}

/**
 * Article data for SEO analysis
 */
export interface ArticleInput {
  title: string;
  content: string;
  slug?: string;
  excerpt?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[] | null;
  canonicalUrl?: string | null;
}

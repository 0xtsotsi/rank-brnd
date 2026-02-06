/**
 * SEO Scoring Engine
 *
 * Comprehensive SEO analysis service for articles.
 *
 * Features:
 * - Keyword density analysis
 * - Readability scoring (Flesch-Kincaid)
 * - Heading structure validation
 * - Meta tags validation
 * - Internal/external link checking
 * - Image alt text validation
 *
 * @example
 * ```ts
 * import { analyzeSEO } from '@/lib/seo';
 *
 * const result = analyzeSEO({
 *   title: 'My Article Title',
 *   content: '<p>Article content...</p>',
 *   metaTitle: 'My Meta Title',
 *   metaDescription: 'My meta description',
 *   slug: 'my-article',
 * }, {
 *   targetKeyword: 'keyword',
 *   targetFleschGradeMin: 8,
 *   targetFleschGradeMax: 10,
 * });
 *
 * console.log(result.overallScore); // 0-100
 * console.log(result.recommendations);
 * ```
 */

// Main analysis function
export {
  analyzeSEO,
  getSEOScore,
  getSEOGrade,
  getSEOGradeDescription,
} from './seo-scoring';

// Individual analysis modules
export {
  analyzeReadability,
  calculateFleschKincaidGrade,
  calculateFleschReadingEase,
  getReadingLevelDescription,
  getReadabilityAssessment,
} from './readability';

export { analyzeKeywordDensity, getDensityRating } from './keyword-density';

export {
  analyzeHeadingStructure,
  calculateHeadingScore,
  getHeadingRecommendations,
} from './heading-structure';

export {
  analyzeMetaTags,
  calculateMetaTagsScore,
  getMetaTagRecommendations,
} from './meta-tags';

export {
  analyzeLinks,
  calculateLinkScore,
  getLinkRecommendations,
} from './link-analysis';

export {
  analyzeImages,
  calculateImageAltScore,
  getImageRecommendations,
} from './image-analysis';

// Types
export type {
  ArticleInput,
  SEOAnalysisOptions,
  SEOAnalysisResult,
  SEOMetric,
  HeadingStructure,
  KeywordDensity,
  LinkAnalysis,
  ImageAnalysis,
  MetaTagsAnalysis,
  ReadabilityAnalysis,
} from './types';

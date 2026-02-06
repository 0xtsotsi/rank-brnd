/**
 * SEO Scoring Engine
 *
 * Main service that orchestrates all SEO analysis modules.
 */

import type {
  SEOMetric,
  SEOAnalysisResult,
  SEOAnalysisOptions,
  ArticleInput,
} from './types';
import { analyzeKeywordDensity, getDensityRating } from './keyword-density';
import { analyzeReadability, getReadingLevelDescription } from './readability';
import {
  analyzeHeadingStructure,
  calculateHeadingScore,
  getHeadingRecommendations,
} from './heading-structure';
import {
  analyzeMetaTags,
  calculateMetaTagsScore,
  getMetaTagRecommendations,
} from './meta-tags';
import {
  analyzeLinks,
  calculateLinkScore,
  getLinkRecommendations,
} from './link-analysis';
import {
  analyzeImages,
  calculateImageAltScore,
  getImageRecommendations,
} from './image-analysis';

/**
 * Default analysis options
 */
const DEFAULT_OPTIONS: Required<SEOAnalysisOptions> = {
  targetKeyword: '',
  minWordCount: 300,
  maxWordCount: 3000,
  targetFleschGradeMin: 8,
  targetFleschGradeMax: 10,
  baseUrl: '',
  checkBrokenLinks: false,
};

/**
 * Calculate content length score
 */
function calculateContentLengthScore(
  wordCount: number,
  min: number,
  max: number
): SEOMetric {
  let score = 0;
  let passed = false;
  let message = '';

  if (wordCount < min) {
    const needed = min - wordCount;
    score = Math.max(0, (wordCount / min) * 50);
    message = `Content is too short. Add at least ${needed} more words (minimum: ${min}).`;
  } else if (wordCount > max) {
    score = 50;
    message = `Content is very long. Consider splitting into multiple articles (optimal: ${min}-${max} words).`;
  } else {
    passed = true;
    score = 100;
    message = `Content length is optimal (${wordCount} words).`;
  }

  return {
    score: Math.round(score),
    maxScore: 100,
    weight: 0.1,
    passed,
    message,
  };
}

/**
 * Calculate keyword density metric
 */
function calculateKeywordDensityMetric(
  analysis: ReturnType<typeof analyzeKeywordDensity>
): SEOMetric {
  const {
    density,
    score,
    keyword,
    inTitle,
    inFirstParagraph,
    inHeadings,
    inMetaDescription,
    inUrl,
  } = analysis;

  let message = '';
  let passed = score >= 60;

  const placementDetails = [];
  if (inTitle) placementDetails.push('title');
  if (inFirstParagraph) placementDetails.push('first paragraph');
  if (inHeadings) placementDetails.push('headings');
  if (inMetaDescription) placementDetails.push('meta description');
  if (inUrl) placementDetails.push('URL');

  if (keyword) {
    message = `Keyword "${keyword}" density: ${density}% (${getDensityRating(density)})`;
    if (placementDetails.length > 0) {
      message += `. Found in: ${placementDetails.join(', ')}.`;
    }
    if (!passed) {
      message += ' Aim for 1-2% density with keyword in key positions.';
    }
  } else {
    message = 'No target keyword specified.';
    passed = false;
  }

  return {
    score: Math.round(score),
    maxScore: 100,
    weight: 0.15,
    passed,
    message,
    details: analysis as unknown as Record<string, unknown>,
  };
}

/**
 * Calculate readability metric
 */
function calculateReadabilityMetric(
  analysis: ReturnType<typeof analyzeReadability>
): SEOMetric {
  const {
    score,
    fleschKincaidGrade,
    targetGradeMin,
    targetGradeMax,
    targetGradeMet,
  } = analysis;
  const passed = targetGradeMet;

  const message = targetGradeMet
    ? `Flesch-Kincaid Grade: ${fleschKincaidGrade} (${getReadingLevelDescription(fleschKincaidGrade)}). Optimal!`
    : `Flesch-Kincaid Grade: ${fleschKincaidGrade} (${getReadingLevelDescription(fleschKincaidGrade)}). Target: ${targetGradeMin}-${targetGradeMax}.`;

  return {
    score: Math.round(score),
    maxScore: 100,
    weight: 0.15,
    passed,
    message,
    details: analysis as unknown as Record<string, unknown>,
  };
}

/**
 * Calculate heading structure metric
 */
function calculateHeadingStructureMetric(
  structure: ReturnType<typeof analyzeHeadingStructure>
): SEOMetric {
  const score = calculateHeadingScore(structure);
  const passed = score >= 60;

  let message = '';
  if (!structure.hasH1) {
    message = 'Missing H1 heading. Add one main heading.';
  } else if (structure.h1Count > 1) {
    message = `Multiple H1 headings (${structure.h1Count}). Use only one H1.`;
  } else if (!structure.headingHierarchy) {
    message = `Heading hierarchy issues. Skipped levels: ${structure.skippedLevels.join(', ')}.`;
  } else {
    message = 'Heading structure is good.';
  }

  return {
    score,
    maxScore: 100,
    weight: 0.1,
    passed,
    message,
    details: structure as unknown as Record<string, unknown>,
  };
}

/**
 * Calculate meta tags metric
 */
function calculateMetaTagsMetric(
  analysis: ReturnType<typeof analyzeMetaTags>
): SEOMetric {
  const score = calculateMetaTagsScore(analysis);
  const passed = score >= 60;

  const issues = [];
  if (!analysis.hasTitle) issues.push('missing title');
  if (!analysis.hasDescription) issues.push('missing description');
  if (!analysis.titleOptimal) issues.push('suboptimal title length');
  if (!analysis.descriptionOptimal)
    issues.push('suboptimal description length');

  const message =
    issues.length > 0
      ? `Meta tags need improvement: ${issues.join(', ')}.`
      : 'Meta tags are well optimized.';

  return {
    score,
    maxScore: 100,
    weight: 0.15,
    passed,
    message,
    details: analysis as unknown as Record<string, unknown>,
  };
}

/**
 * Calculate internal links metric
 */
function calculateInternalLinksMetric(
  analysis: ReturnType<typeof analyzeLinks>
): SEOMetric {
  const score = calculateLinkScore(analysis);
  const passed = analysis.hasValidInternalLinks;

  const message = analysis.hasValidInternalLinks
    ? `Good internal linking (${analysis.internalLinks} internal links).`
    : `Add more internal links (currently ${analysis.internalLinks}, recommend at least 2-3).`;

  return {
    score: Math.round(score * 0.6), // Weight for internal links portion
    maxScore: 60,
    weight: 0.1,
    passed,
    message,
    details: { internal: true, ...analysis },
  };
}

/**
 * Calculate external links metric
 */
function calculateExternalLinksMetric(
  analysis: ReturnType<typeof analyzeLinks>
): SEOMetric {
  const passed = analysis.hasValidExternalLinks;

  const message = analysis.hasValidExternalLinks
    ? `Good external linking (${analysis.externalLinks} external links).`
    : `Add external links to authoritative sources (currently ${analysis.externalLinks}).`;

  // External links get 40% of the link score
  const score = analysis.hasValidExternalLinks
    ? 100
    : analysis.externalLinks > 0
      ? 50
      : 0;

  return {
    score: Math.round(score * 0.4), // Weight for external links portion
    maxScore: 40,
    weight: 0.05,
    passed,
    message,
    details: { external: true, ...analysis },
  };
}

/**
 * Calculate image alt text metric
 */
function calculateImageAltTextMetric(
  analysis: ReturnType<typeof analyzeImages>
): SEOMetric {
  const score = calculateImageAltScore(analysis);
  const passed = analysis.totalImages === 0 || analysis.imagesWithoutAlt === 0;

  let message = '';
  if (analysis.totalImages === 0) {
    message = 'No images in content.';
  } else if (analysis.imagesWithoutAlt === 0) {
    message = `All ${analysis.totalImages} image(s) have alt text.`;
  } else {
    message = `${analysis.imagesWithoutAlt} of ${analysis.totalImages} image(s) missing alt text.`;
  }

  return {
    score,
    maxScore: 100,
    weight: 0.1,
    passed,
    message,
    details: analysis as unknown as Record<string, unknown>,
  };
}

/**
 * Main SEO analysis function
 *
 * Analyzes an article's SEO and returns a comprehensive score with breakdowns.
 */
export function analyzeSEO(
  article: ArticleInput,
  options: SEOAnalysisOptions = {}
): SEOAnalysisResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Extract plain text for word count
  const plainText = article.content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;

  // Run all analyses
  const keywordDensity = analyzeKeywordDensity(article.content, {
    keyword: opts.targetKeyword || article.metaKeywords?.[0],
    title: article.title,
    slug: article.slug,
    metaDescription: article.metaDescription || undefined,
  });

  const readability = analyzeReadability(article.content, {
    targetGradeMin: opts.targetFleschGradeMin,
    targetGradeMax: opts.targetFleschGradeMax,
  });

  const headingStructure = analyzeHeadingStructure(article.content);

  const metaTags = analyzeMetaTags({
    title: article.title,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    metaKeywords: article.metaKeywords,
    canonicalUrl: article.canonicalUrl,
  });

  const links = analyzeLinks(article.content, {
    baseUrl: opts.baseUrl,
    checkBroken: opts.checkBrokenLinks,
  });

  const images = analyzeImages(article.content);

  // Calculate individual metrics
  const contentLengthMetric = calculateContentLengthScore(
    wordCount,
    opts.minWordCount,
    opts.maxWordCount
  );

  const keywordDensityMetric = calculateKeywordDensityMetric(keywordDensity);
  const readabilityMetric = calculateReadabilityMetric(readability);
  const headingStructureMetric =
    calculateHeadingStructureMetric(headingStructure);
  const metaTagsMetric = calculateMetaTagsMetric(metaTags);
  const internalLinksMetric = calculateInternalLinksMetric(links);
  const externalLinksMetric = calculateExternalLinksMetric(links);
  const imageAltTextMetric = calculateImageAltTextMetric(images);

  // Calculate overall weighted score
  const metrics = {
    keywordDensity: keywordDensityMetric,
    readability: readabilityMetric,
    headingStructure: headingStructureMetric,
    metaTags: metaTagsMetric,
    contentLength: contentLengthMetric,
    internalLinks: internalLinksMetric,
    externalLinks: externalLinksMetric,
    imageAltText: imageAltTextMetric,
  };

  let overallScore = 0;
  for (const metric of Object.values(metrics)) {
    overallScore += (metric.score / metric.maxScore) * metric.weight * 100;
  }
  overallScore = Math.round(overallScore);

  // Gather recommendations
  const recommendations: string[] = [];

  if (!contentLengthMetric.passed) {
    recommendations.push(contentLengthMetric.message);
  }
  if (!keywordDensityMetric.passed) {
    recommendations.push(keywordDensityMetric.message);
  }
  if (!readabilityMetric.passed) {
    recommendations.push(readabilityMetric.message);
  }
  if (!headingStructureMetric.passed) {
    recommendations.push(...getHeadingRecommendations(headingStructure));
  }
  if (!metaTagsMetric.passed) {
    recommendations.push(...getMetaTagRecommendations(metaTags));
  }
  if (!internalLinksMetric.passed || !externalLinksMetric.passed) {
    recommendations.push(...getLinkRecommendations(links));
  }
  if (!imageAltTextMetric.passed) {
    recommendations.push(...getImageRecommendations(images));
  }

  return {
    overallScore,
    keywordDensity,
    readability,
    headingStructure,
    metaTags,
    links,
    images,
    metrics,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Get a quick SEO score (0-100) for an article
 * Convenience function that returns just the overall score
 */
export function getSEOScore(
  article: ArticleInput,
  options?: SEOAnalysisOptions
): number {
  const result = analyzeSEO(article, options);
  return result.overallScore;
}

/**
 * Get SEO grade letter based on score
 */
export function getSEOGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get SEO grade description
 */
export function getSEOGradeDescription(score: number): string {
  if (score >= 90) return 'Excellent - Your content is well optimized for SEO.';
  if (score >= 80)
    return 'Good - Your content has strong SEO with minor improvements possible.';
  if (score >= 70)
    return 'Fair - Your content has decent SEO but needs some improvements.';
  if (score >= 60)
    return 'Poor - Your content needs significant SEO improvements.';
  return 'Very Poor - Your content requires major SEO work.';
}

// Re-export types and analysis functions for convenience
export * from './types';
export { analyzeReadability, getReadingLevelDescription } from './readability';
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

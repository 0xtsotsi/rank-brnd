/**
 * Image Analysis
 *
 * Analyzes images and alt text in content.
 */

import type { ImageAnalysis } from './types';

/**
 * Extract all images from HTML content
 */
function extractImages(html: string): Array<{
  src: string;
  alt: string;
  hasAlt: boolean;
  altIsDescriptive: boolean;
}> {
  const imgRegex = /<img\s+(?:[^>]*?\s+)?src=(["'])([^"']+)\1[^>]*>/gi;
  const images: Array<{
    src: string;
    alt: string;
    hasAlt: boolean;
    altIsDescriptive: boolean;
  }> = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[2];
    const tag = match[0];

    // Extract alt attribute
    const altMatch = tag.match(/\balt\s*=\s*(["'])([^"']*)\1/i);
    const alt = altMatch ? altMatch[2] : '';
    const hasAlt = altMatch !== null;

    // Check if alt text is descriptive (more than just "image", "photo", etc.)
    const altIsDescriptive =
      hasAlt &&
      alt.length > 8 &&
      !/^(image|photo|picture|img|pic|icon|logo|placeholder)$/i.test(
        alt.trim()
      );

    images.push({
      src,
      alt,
      hasAlt,
      altIsDescriptive,
    });
  }

  return images;
}

/**
 * Analyze images in content
 */
export function analyzeImages(content: string): ImageAnalysis {
  const images = extractImages(content);

  const totalImages = images.length;
  const imagesWithAlt = images.filter((img) => img.hasAlt).length;
  const imagesWithoutAlt = totalImages - imagesWithAlt;

  const imagesWithDescriptiveAlt = images.filter(
    (img) => img.altIsDescriptive
  ).length;

  // Calculate alt text score
  let altTextScore = 0;
  if (totalImages === 0) {
    altTextScore = 100; // No images to worry about
  } else {
    const withAltPercentage = (imagesWithAlt / totalImages) * 100;
    const descriptivePercentage =
      images.length > 0 ? (imagesWithDescriptiveAlt / totalImages) * 100 : 0;

    altTextScore = withAltPercentage * 0.5 + descriptivePercentage * 0.5;
  }

  const missingAltUrls = images
    .filter((img) => !img.hasAlt)
    .map((img) => img.src);

  return {
    totalImages,
    imagesWithAlt,
    imagesWithoutAlt,
    imagesWithDescriptiveAlt,
    altTextScore: Math.round(altTextScore),
    missingAltUrls,
  };
}

/**
 * Calculate image alt text score
 */
export function calculateImageAltScore(analysis: ImageAnalysis): number {
  if (analysis.totalImages === 0) {
    return 100; // Perfect score if no images
  }

  const withAltScore = (analysis.imagesWithAlt / analysis.totalImages) * 50;
  const descriptiveScore =
    analysis.totalImages > 0
      ? (analysis.imagesWithDescriptiveAlt / analysis.totalImages) * 50
      : 0;

  return Math.round(withAltScore + descriptiveScore);
}

/**
 * Get image recommendations
 */
export function getImageRecommendations(analysis: ImageAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.totalImages === 0) {
    recommendations.push(
      'Consider adding relevant images to make your content more engaging.'
    );
    return recommendations;
  }

  if (analysis.imagesWithoutAlt > 0) {
    recommendations.push(
      `${analysis.imagesWithoutAlt} image(s) are missing alt text. ` +
        'Alt text helps search engines understand your images and improves accessibility.'
    );
  }

  const withButNotDescriptive =
    analysis.imagesWithAlt - analysis.imagesWithDescriptiveAlt;
  if (withButNotDescriptive > 0) {
    recommendations.push(
      `${withButNotDescriptive} image(s) have generic alt text. ` +
        'Use descriptive alt text that includes relevant keywords where appropriate.'
    );
  }

  if (
    analysis.imagesWithDescriptiveAlt === analysis.totalImages &&
    analysis.totalImages > 0
  ) {
    recommendations.push('Great job! All images have descriptive alt text.');
  }

  return recommendations;
}

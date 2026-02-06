/**
 * Image Generation Stage
 *
 * Generates images for the article using DALL-E 3 or similar AI image generation.
 * Can generate featured images and inline images based on content.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';

/**
 * Generate image prompt based on content and keyword
 */
function generateImagePrompt(
  keyword: string,
  content: string,
  style: string,
  isFeatured: boolean
): string {
  const keywordLower = keyword.toLowerCase();

  if (isFeatured) {
    // Featured image - more general, branding-focused
    const stylePrompts: Record<string, string> = {
      realistic: `A professional, photorealistic image representing "${keyword}" for a business article. Clean, modern composition with professional lighting.`,
      watercolor: `A beautiful watercolor illustration representing "${keyword}" for an article. Soft, artistic style with gentle colors.`,
      illustration: `A modern, clean illustration depicting "${keyword}" for a professional article. Flat design style with a cohesive color palette.`,
      sketch: `A detailed pencil sketch representing "${keyword}" for an article. Professional line art with subtle shading.`,
      brand_text_overlay: `A minimalist graphic design for an article about "${keyword}". Clean background with space for text overlay.`,
    };

    return stylePrompts[style] || stylePrompts.realistic;
  }

  // Inline image - specific to content section
  return `An illustrative image related to "${keywordLower}" that fits naturally within article content. ${style} style, professional quality.`;
}

/**
 * Execute image generation stage
 */
export async function executeImageGeneration(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const { organizationId, userId, options, keyword } = context;

  // Check if stage should be skipped
  if (options.skipImageGeneration) {
    console.log('[Pipeline] Skipping image generation stage');
    return data;
  }

  console.log('[Pipeline] Generating images');

  // Dynamic import to avoid dependency issues
  const { generateImage } = await import('@/lib/image-generation');

  const generatedImages: Array<{
    url: string;
    prompt: string;
    style: string;
    size: string;
    altText?: string;
    isFeatured?: boolean;
  }> = [];

  const style = options.imageStyle || 'realistic';
  const size = options.imageSize || '1792x1024';
  const quality = options.imageQuality || 'standard';

  try {
    // Generate featured image
    if (options.generateFeaturedImage !== false) {
      console.log('[Pipeline] Generating featured image');

      const featuredPrompt = generateImagePrompt(
        keyword,
        data.content || '',
        style,
        true
      );

      try {
        const featuredResult = await generateImage({
          prompt: featuredPrompt,
          style,
          size,
          quality,
          model: 'dall-e-3',
          applyBrandColors: options.applyBrandColors !== false,
          organizationId,
          userId,
        });

        generatedImages.push({
          url: (featuredResult as any).url,
          prompt: featuredPrompt,
          style,
          size,
          altText: `Featured image for article about ${keyword}`,
          isFeatured: true,
        });

        console.log(
          `[Pipeline] Featured image generated: ${(featuredResult as any).url}`
        );
      } catch (error) {
        console.error('[Pipeline] Featured image generation failed:', error);
        // Continue without failing the pipeline
      }
    }

    // Generate inline images if requested
    if (
      options.generateInlineImages &&
      data.outline &&
      data.outline.length > 1
    ) {
      const inlineCount = Math.min(
        options.inlineImageCount || 3,
        data.outline.length - 1
      );

      console.log(`[Pipeline] Generating ${inlineCount} inline images`);

      // Generate images for middle sections (not intro/conclusion)
      const middleSections = data.outline.slice(1, -1);
      const sectionsForImages = middleSections.slice(0, inlineCount);

      for (const section of sectionsForImages) {
        const inlinePrompt = generateImagePrompt(
          section.title,
          data.content || '',
          style,
          false
        );

        try {
          const inlineResult = await generateImage({
            prompt: inlinePrompt,
            style,
            size: '1024x1024', // Square for inline images
            quality: 'standard',
            model: 'dall-e-3',
            applyBrandColors: options.applyBrandColors !== false,
            organizationId,
            userId,
          });

          generatedImages.push({
            url: (inlineResult as any).url,
            prompt: inlinePrompt,
            style,
            size: '1024x1024',
            altText: `Illustration for section: ${section.title}`,
            isFeatured: false,
          });

          console.log(
            `[Pipeline] Inline image generated for section: ${section.title}`
          );
        } catch (error) {
          console.error(
            `[Pipeline] Inline image generation failed for ${section.title}:`,
            error
          );
          // Continue with next image
        }
      }
    }

    console.log(`[Pipeline] Total images generated: ${generatedImages.length}`);

    return {
      ...data,
      generatedImages,
    };
  } catch (error) {
    console.error('[Pipeline] Image generation failed:', error);
    // Don't fail the pipeline, just continue without images
    return {
      ...data,
      generatedImages,
    };
  }
}

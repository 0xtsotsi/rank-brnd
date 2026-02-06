/**
 * Article Generation Pipeline API Route
 *
 * POST /api/articles/pipeline
 *
 * Orchestrates the complete article generation pipeline including:
 * - SERP analysis
 * - Outline generation
 * - Draft generation
 * - Internal linking
 * - External linking
 * - Image generation
 * - SEO scoring
 * - Finalization
 *
 * This endpoint executes all stages synchronously and returns the complete result.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  executePipelineSync,
  type ExecutePipelineRequest,
  type PipelineResult,
} from '@/lib/pipeline';
import {
  articlePipelineRequestSchema,
  pipelineStatusResponseSchema,
  type PipelineOptions,
} from '@/lib/schemas/pipeline';

// Configure runtime for longer execution time
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for full pipeline

/**
 * POST /api/articles/pipeline
 *
 * Execute the complete article generation pipeline.
 *
 * Request body:
 * {
 *   keyword: string (required)
 *   organization_id: string (required, UUID)
 *   keyword_id?: string (UUID)
 *   product_id?: string (UUID)
 *   outline?: Array<{ id, title, points, wordCount }>
 *   title?: string
 *   content?: string
 *   options?: PipelineOptions
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validationResult = articlePipelineRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify organization membership
    const supabase = await import('@/lib/supabase/client').then((m) =>
      m.getSupabaseServerClient()
    );
    const isOrganizationMember =
      await import('@/lib/supabase/organizations').then((m) =>
        m.isOrganizationMember(supabase, data.organization_id, userId)
      );

    if (!isOrganizationMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    console.log(
      `[API] Starting article generation pipeline for keyword: "${data.keyword}"`
    );

    // Prepare pipeline request
    const pipelineRequest: ExecutePipelineRequest = {
      keyword: data.keyword,
      organizationId: data.organization_id,
      userId,
      keywordId: data.keyword_id,
      productId: data.product_id,
      providedOutline: data.outline,
      providedTitle: data.title,
      providedContent: data.content,
      options: data.options,
    };

    // Execute pipeline
    const startTime = Date.now();
    const result = await executePipelineSync(pipelineRequest);
    const duration = Date.now() - startTime;

    console.log(
      `[API] Pipeline completed in ${duration}ms: ${result.pipelineId}`
    );

    // Return response
    if (result.success && result.result) {
      return NextResponse.json(
        {
          success: true,
          pipeline_id: result.pipelineId,
          duration_ms: duration,
          ...formatPipelineResult(result.result),
        },
        { status: 200 }
      );
    }

    // Even if not fully successful, return partial results
    return NextResponse.json(
      {
        success: false,
        pipeline_id: result.pipelineId,
        duration_ms: duration,
        ...(result.result ? formatPipelineResult(result.result) : {}),
        error: result.error,
      },
      { status: result.result?.status === 'failed' ? 500 : 200 }
    );
  } catch (error) {
    console.error('[API] Pipeline execution error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to execute pipeline',
      },
      { status: 500 }
    );
  }
}

/**
 * Format pipeline result for API response
 */
function formatPipelineResult(result: PipelineResult) {
  return {
    status: result.status,
    current_stage: result.currentStage,
    progress: result.progress,
    started_at: result.startedAt,
    completed_at: result.completedAt,
    stages: result.stages.map((stage) => ({
      stage: stage.stage,
      status: stage.status,
      started_at: stage.startedAt,
      completed_at: stage.completedAt,
      error: stage.error,
      duration_ms: stage.durationMs,
    })),
    result: result.result
      ? {
          article_id: result.result.articleId,
          article: result.result.article,
          serp_analysis: result.result.serpAnalysis,
          outline: result.result.outline,
          internal_links: result.result.internalLinks,
          external_links: result.result.externalLinks,
          generated_images: result.result.generatedImages,
          seo_analysis: result.result.seoAnalysis,
        }
      : undefined,
    error: result.error,
  };
}

/**
 * GET /api/articles/pipeline
 *
 * Get pipeline configuration and available options.
 * Useful for frontend to understand what options are available.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return pipeline configuration
    return NextResponse.json(
      {
        name: 'Article Generation Pipeline',
        version: '1.0.0',
        description:
          'Orchestrates SERP analysis, outline generation, draft generation, linking, image generation, and SEO scoring',

        stages: [
          {
            id: 'serp_analysis',
            name: 'SERP Analysis',
            description:
              'Analyzes search engine results for competitive intelligence',
            optional: true,
            default_enabled: true,
          },
          {
            id: 'outline_generation',
            name: 'Outline Generation',
            description:
              'Generates article structure based on keyword and SERP data',
            optional: true,
            default_enabled: true,
          },
          {
            id: 'draft_generation',
            name: 'Draft Generation',
            description: 'Generates full article draft based on outline',
            optional: false,
            default_enabled: true,
          },
          {
            id: 'internal_linking',
            name: 'Internal Linking',
            description:
              'Generates internal link suggestions to related articles',
            optional: true,
            default_enabled: true,
          },
          {
            id: 'external_linking',
            name: 'External Linking',
            description:
              'Generates external link opportunities to authoritative sources',
            optional: true,
            default_enabled: true,
          },
          {
            id: 'image_generation',
            name: 'Image Generation',
            description: 'Generates featured and inline images using AI',
            optional: true,
            default_enabled: true,
          },
          {
            id: 'seo_scoring',
            name: 'SEO Scoring',
            description:
              'Analyzes content for SEO quality and provides recommendations',
            optional: true,
            default_enabled: true,
          },
          {
            id: 'finalization',
            name: 'Finalization',
            description: 'Saves the article to the database with all metadata',
            optional: false,
            default_enabled: true,
          },
        ],

        options: {
          // SERP Analysis options
          skipSerpAnalysis: {
            type: 'boolean',
            default: false,
            description: 'Skip SERP analysis stage',
          },
          serpLocation: {
            type: 'string',
            default: 'United States',
            description: 'Location for SERP analysis',
          },
          serpDevice: {
            type: 'enum',
            values: ['desktop', 'mobile'],
            default: 'desktop',
            description: 'Device type for SERP analysis',
          },

          // Outline options
          skipOutlineGeneration: {
            type: 'boolean',
            default: false,
            description: 'Skip outline generation (use provided outline)',
          },
          outlineSections: {
            type: 'number',
            min: 3,
            max: 15,
            default: 6,
            description: 'Number of sections in outline',
          },

          // Draft options
          skipDraftGeneration: {
            type: 'boolean',
            default: false,
            description: 'Skip draft generation (use provided content)',
          },
          tone: {
            type: 'enum',
            values: [
              'professional',
              'casual',
              'friendly',
              'authoritative',
              'minimalist',
              'playful',
            ],
            default: 'professional',
            description: 'Writing tone for the article',
          },
          targetWordCount: {
            type: 'number',
            min: 500,
            max: 5000,
            default: 1500,
            description: 'Target word count for the article',
          },
          customInstructions: {
            type: 'string',
            description: 'Custom instructions for content generation',
          },

          // Internal linking options
          skipInternalLinking: {
            type: 'boolean',
            default: false,
            description: 'Skip internal linking stage',
          },
          maxInternalLinks: {
            type: 'number',
            min: 0,
            max: 20,
            default: 5,
            description: 'Maximum number of internal link suggestions',
          },
          autoApplyInternalLinks: {
            type: 'boolean',
            default: false,
            description: 'Automatically apply internal links to content',
          },

          // External linking options
          skipExternalLinking: {
            type: 'boolean',
            default: false,
            description: 'Skip external linking stage',
          },
          maxExternalLinks: {
            type: 'number',
            min: 0,
            max: 20,
            default: 5,
            description: 'Maximum number of external link opportunities',
          },
          autoApplyExternalLinks: {
            type: 'boolean',
            default: false,
            description: 'Automatically apply external links to content',
          },
          includeAuthoritySources: {
            type: 'boolean',
            default: true,
            description: 'Include high-authority global sources',
          },

          // Image generation options
          skipImageGeneration: {
            type: 'boolean',
            default: false,
            description: 'Skip image generation stage',
          },
          generateFeaturedImage: {
            type: 'boolean',
            default: true,
            description: 'Generate featured image',
          },
          generateInlineImages: {
            type: 'boolean',
            default: false,
            description: 'Generate inline images for sections',
          },
          inlineImageCount: {
            type: 'number',
            min: 0,
            max: 10,
            default: 3,
            description: 'Number of inline images to generate',
          },
          imageStyle: {
            type: 'enum',
            values: [
              'realistic',
              'watercolor',
              'illustration',
              'sketch',
              'brand_text_overlay',
            ],
            default: 'realistic',
            description: 'Style for generated images',
          },
          imageSize: {
            type: 'enum',
            values: ['1024x1024', '1792x1024', '1024x1792'],
            default: '1792x1024',
            description: 'Size for generated images',
          },
          imageQuality: {
            type: 'enum',
            values: ['standard', 'hd'],
            default: 'standard',
            description: 'Quality for generated images',
          },
          applyBrandColors: {
            type: 'boolean',
            default: true,
            description: 'Apply brand colors to generated images',
          },

          // SEO options
          skipSeoScoring: {
            type: 'boolean',
            default: false,
            description: 'Skip SEO scoring stage',
          },
          autoOptimizeSeo: {
            type: 'boolean',
            default: false,
            description: 'Automatically optimize content for SEO',
          },

          // General options
          saveIntermediateResults: {
            type: 'boolean',
            default: true,
            description: 'Save intermediate results in article metadata',
          },
          notifyOnCompletion: {
            type: 'boolean',
            default: false,
            description: 'Send notification when pipeline completes',
          },
        },

        example_request: {
          keyword: 'content marketing strategies',
          organization_id: 'org-uuid',
          product_id: 'product-uuid',
          options: {
            tone: 'professional',
            targetWordCount: 2000,
            generateFeaturedImage: true,
            maxInternalLinks: 5,
            maxExternalLinks: 3,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Pipeline config error:', error);

    return NextResponse.json(
      { error: 'Failed to get pipeline configuration' },
      { status: 500 }
    );
  }
}

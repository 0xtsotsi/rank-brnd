/**
 * Article Generation Pipeline API Schemas
 *
 * Zod validation schemas for the article generation pipeline.
 * This pipeline orchestrates SERP analysis, outline generation, draft generation,
 * internal/external linking, image generation, and SEO scoring in sequence.
 */

import { z } from 'zod';

/**
 * Pipeline execution stages
 */
export const pipelineStageEnum = z.enum([
  'serp_analysis',
  'outline_generation',
  'draft_generation',
  'internal_linking',
  'external_linking',
  'image_generation',
  'seo_scoring',
  'finalization',
]);

export type PipelineStage = z.infer<typeof pipelineStageEnum>;

/**
 * Pipeline status
 */
export const pipelineStatusEnum = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export type PipelineStatus = z.infer<typeof pipelineStatusEnum>;

/**
 * Writing tone options
 */
export const toneEnum = z.enum([
  'professional',
  'casual',
  'friendly',
  'authoritative',
  'minimalist',
  'playful',
]);

/**
 * Pipeline configuration options
 */
export const pipelineOptionsSchema = z.object({
  // SERP Analysis
  skipSerpAnalysis: z.boolean().optional().default(false),
  serpLocation: z.string().optional().default('United States'),
  serpDevice: z.enum(['desktop', 'mobile']).optional().default('desktop'),
  serpDepth: z.number().int().min(5).max(20).optional().default(10),

  // Outline Generation
  skipOutlineGeneration: z.boolean().optional().default(false),
  outlineSections: z.number().int().min(3).max(15).optional().default(6),

  // Draft Generation
  skipDraftGeneration: z.boolean().optional().default(false),
  tone: toneEnum.optional().default('professional'),
  targetWordCount: z.number().int().min(500).max(5000).optional().default(1500),
  customInstructions: z.string().optional(),

  // Internal Linking
  skipInternalLinking: z.boolean().optional().default(false),
  maxInternalLinks: z.number().int().min(0).max(20).optional().default(5),
  autoApplyInternalLinks: z.boolean().optional().default(false),

  // External Linking
  skipExternalLinking: z.boolean().optional().default(false),
  maxExternalLinks: z.number().int().min(0).max(20).optional().default(5),
  autoApplyExternalLinks: z.boolean().optional().default(false),
  includeAuthoritySources: z.boolean().optional().default(true),

  // Image Generation
  skipImageGeneration: z.boolean().optional().default(false),
  generateFeaturedImage: z.boolean().optional().default(true),
  generateInlineImages: z.boolean().optional().default(false),
  inlineImageCount: z.number().int().min(0).max(10).optional().default(3),
  imageStyle: z
    .enum([
      'realistic',
      'watercolor',
      'illustration',
      'sketch',
      'brand_text_overlay',
    ])
    .optional()
    .default('realistic'),
  imageSize: z
    .enum(['1024x1024', '1792x1024', '1024x1792'])
    .optional()
    .default('1792x1024'),
  imageQuality: z.enum(['standard', 'hd']).optional().default('standard'),
  applyBrandColors: z.boolean().optional().default(true),

  // SEO Scoring
  skipSeoScoring: z.boolean().optional().default(false),
  autoOptimizeSeo: z.boolean().optional().default(false),

  // General
  saveIntermediateResults: z.boolean().optional().default(true),
  notifyOnCompletion: z.boolean().optional().default(false),
});

export type PipelineOptions = z.infer<typeof pipelineOptionsSchema>;

/**
 * Main pipeline request schema
 */
export const articlePipelineRequestSchema = z.object({
  // Required fields
  keyword: z.string().min(1, 'Keyword is required'),
  organization_id: z.string().uuid('Invalid organization ID'),

  // Optional identifiers
  keyword_id: z.string().uuid('Invalid keyword ID').optional(),
  product_id: z.string().uuid('Invalid product ID').optional(),

  // Pre-provided data (skip stages if provided)
  outline: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        points: z.array(z.string()),
        wordCount: z.number(),
      })
    )
    .optional(),

  title: z.string().optional(),
  content: z.string().optional(),

  // Pipeline configuration
  options: pipelineOptionsSchema.optional(),
});

/**
 * Pipeline execution status response
 */
export const pipelineStatusResponseSchema = z.object({
  pipeline_id: z.string().uuid(),
  status: pipelineStatusEnum,
  current_stage: pipelineStageEnum.optional(),
  progress: z.number().min(0).max(100),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  stages: z.array(
    z.object({
      stage: pipelineStageEnum,
      status: pipelineStatusEnum,
      started_at: z.string().datetime().optional(),
      completed_at: z.string().datetime().optional(),
      error: z.string().optional(),
      duration_ms: z.number().optional(),
    })
  ),
  result: z
    .object({
      article_id: z.string().uuid().optional(),
      article: z
        .object({
          id: z.string().uuid(),
          title: z.string(),
          slug: z.string(),
          content: z.string(),
          excerpt: z.string().optional(),
          featured_image_url: z.string().optional(),
          seo_score: z.number().optional(),
          meta_title: z.string().optional(),
          meta_description: z.string().optional(),
          meta_keywords: z.array(z.string()).optional(),
        })
        .optional(),
      serp_analysis: z.record(z.string(), z.unknown()).optional(),
      outline: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            points: z.array(z.string()),
            wordCount: z.number(),
          })
        )
        .optional(),
      internal_links: z.array(z.record(z.string(), z.unknown())).optional(),
      external_links: z.array(z.record(z.string(), z.unknown())).optional(),
      generated_images: z
        .array(
          z.object({
            url: z.string(),
            prompt: z.string(),
            style: z.string(),
          })
        )
        .optional(),
      seo_analysis: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type PipelineStatusResponse = z.infer<
  typeof pipelineStatusResponseSchema
>;

/**
 * Pipeline stage result interface
 */
export interface PipelineStageResult {
  stage: PipelineStage;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Complete pipeline result interface
 */
export interface PipelineResult {
  pipelineId: string;
  status: PipelineStatus;
  currentStage?: PipelineStage;
  progress: number;
  startedAt: string;
  completedAt?: string;
  stages: PipelineStageResult[];
  result?: {
    articleId?: string;
    article?: {
      id: string;
      title: string;
      slug: string;
      content: string;
      excerpt?: string;
      featured_image_url?: string;
      seo_score?: number;
      meta_title?: string;
      meta_description?: string;
      meta_keywords?: string[];
    };
    serpAnalysis?: Record<string, unknown>;
    outline?: Array<{
      id: string;
      title: string;
      points: string[];
      wordCount: number;
    }>;
    internalLinks?: Array<Record<string, unknown>>;
    externalLinks?: Array<Record<string, unknown>>;
    generatedImages?: Array<{
      url: string;
      prompt: string;
      style: string;
    }>;
    seoAnalysis?: Record<string, unknown>;
  };
  error?: string;
}

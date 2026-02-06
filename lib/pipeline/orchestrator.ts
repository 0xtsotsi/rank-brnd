/**
 * Article Generation Pipeline Orchestrator
 *
 * Main orchestrator for the article generation pipeline.
 * Coordinates execution of all stages in the correct order.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  PipelineExecutionContext,
  PipelineData,
  ExecutePipelineRequest,
  ExecutePipelineResult,
  StageConfig,
  PipelineResult,
  PipelineStage,
  PipelineStatus,
  PipelineStageResult,
} from './types';
import type { PipelineOptions } from '@/lib/schemas/pipeline';

// Import stage executors
import { executeSerpAnalysis } from './stages/serp-analysis';
import { executeOutlineGeneration } from './stages/outline-generation';
import { executeDraftGeneration } from './stages/draft-generation';
import { executeInternalLinking } from './stages/internal-linking';
import { executeExternalLinking } from './stages/external-linking';
import { executeImageGeneration } from './stages/image-generation';
import { executeSeoScoring } from './stages/seo-scoring';
import { executeFinalization } from './stages/finalization';

/**
 * Pipeline stage configurations
 */
export const PIPELINE_STAGES: StageConfig[] = [
  {
    stage: 'serp_analysis',
    name: 'SERP Analysis',
    description: 'Analyze search engine results for the target keyword',
    execute: executeSerpAnalysis,
    dependsOn: [],
  },
  {
    stage: 'outline_generation',
    name: 'Outline Generation',
    description:
      'Generate article structure based on keyword and SERP analysis',
    execute: executeOutlineGeneration,
    dependsOn: ['serp_analysis'],
  },
  {
    stage: 'draft_generation',
    name: 'Draft Generation',
    description: 'Generate full article draft based on outline',
    execute: executeDraftGeneration,
    dependsOn: ['outline_generation'],
  },
  {
    stage: 'internal_linking',
    name: 'Internal Linking',
    description: 'Generate internal link suggestions to related articles',
    execute: executeInternalLinking,
    dependsOn: ['draft_generation'],
    skipIf: (ctx, data) => !ctx.productId, // Skip if no product context
  },
  {
    stage: 'external_linking',
    name: 'External Linking',
    description:
      'Generate external link opportunities to authoritative sources',
    execute: executeExternalLinking,
    dependsOn: ['draft_generation'],
  },
  {
    stage: 'image_generation',
    name: 'Image Generation',
    description: 'Generate featured and inline images using AI',
    execute: executeImageGeneration,
    dependsOn: ['draft_generation'],
  },
  {
    stage: 'seo_scoring',
    name: 'SEO Scoring',
    description: 'Analyze content for SEO quality and provide recommendations',
    execute: executeSeoScoring,
    dependsOn: ['draft_generation'],
  },
  {
    stage: 'finalization',
    name: 'Finalization',
    description: 'Save the article to the database with all metadata',
    execute: executeFinalization,
    dependsOn: ['draft_generation', 'seo_scoring'],
  },
];

/**
 * Generate a unique pipeline ID
 */
function generatePipelineId(): string {
  return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate pipeline progress percentage
 */
function calculateProgress(
  totalStages: number,
  completedStages: number,
  currentStageIndex: number
): number {
  if (completedStages === totalStages) return 100;
  return Math.round(
    (completedStages * 100 + (currentStageIndex * 100) / totalStages) /
      totalStages
  );
}

/**
 * Execute the article generation pipeline
 */
export async function executePipeline(
  request: ExecutePipelineRequest
): Promise<ExecutePipelineResult> {
  const {
    keyword,
    organizationId,
    userId,
    keywordId,
    productId,
    providedOutline,
    providedTitle,
    providedContent,
    options: rawOptions,
  } = request;

  // Set default options
  const options: PipelineOptions = {
    skipSerpAnalysis: false,
    serpLocation: 'United States',
    serpDevice: 'desktop',
    serpDepth: 10,
    skipOutlineGeneration: false,
    outlineSections: 6,
    skipDraftGeneration: false,
    tone: 'professional',
    targetWordCount: 1500,
    customInstructions: undefined,
    skipInternalLinking: false,
    maxInternalLinks: 5,
    autoApplyInternalLinks: false,
    skipExternalLinking: false,
    maxExternalLinks: 5,
    autoApplyExternalLinks: false,
    includeAuthoritySources: true,
    skipImageGeneration: false,
    generateFeaturedImage: true,
    generateInlineImages: false,
    inlineImageCount: 3,
    imageStyle: 'realistic',
    imageSize: '1792x1024',
    imageQuality: 'standard',
    applyBrandColors: true,
    skipSeoScoring: false,
    autoOptimizeSeo: false,
    saveIntermediateResults: true,
    notifyOnCompletion: false,
    ...rawOptions,
  };

  // Initialize pipeline
  const pipelineId = generatePipelineId();
  const startedAt = new Date();

  console.log(
    `[Pipeline] Starting pipeline ${pipelineId} for keyword: "${keyword}"`
  );

  // Create Supabase client
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create execution context
  const context: PipelineExecutionContext = {
    supabase,
    userId,
    organizationId,
    productId,
    keywordId,
    keyword,
    providedOutline,
    providedTitle,
    providedContent,
    options,
    pipelineId,
    startedAt,
  };

  // Initialize pipeline data
  let data: PipelineData = {};

  // Track stage results
  const stageResults: PipelineStageResult[] = [];
  let currentStage: PipelineStage | undefined;
  let status: PipelineStatus = 'running';
  let error: string | undefined;

  try {
    // Execute stages in sequence
    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      const stage = PIPELINE_STAGES[i];
      currentStage = stage.stage;

      const stageStartTime = Date.now();

      console.log(
        `[Pipeline] Stage ${i + 1}/${PIPELINE_STAGES.length}: ${stage.name}`
      );

      // Check if stage should be skipped
      if (stage.skipIf && stage.skipIf(context, data)) {
        console.log(
          `[Pipeline] Skipping stage: ${stage.name} (skipIf condition met)`
        );

        stageResults.push({
          stage: stage.stage,
          status: 'skipped',
          startedAt: new Date().toISOString(),
        });

        continue;
      }

      // Check dependencies
      const dependenciesMet = (stage.dependsOn || []).every((dep) =>
        stageResults.some((r) => r.stage === dep && r.status === 'completed')
      );

      if (!dependenciesMet && (stage.dependsOn?.length || 0) > 0) {
        console.log(
          `[Pipeline] Skipping stage: ${stage.name} (dependencies not met)`
        );

        stageResults.push({
          stage: stage.stage,
          status: 'skipped',
          startedAt: new Date().toISOString(),
        });

        continue;
      }

      // Execute stage
      try {
        data = await stage.execute(context, data);

        const completedAt = Date.now();
        const durationMs = completedAt - stageStartTime;

        stageResults.push({
          stage: stage.stage,
          status: 'completed',
          startedAt: new Date(stageStartTime).toISOString(),
          completedAt: new Date(completedAt).toISOString(),
          durationMs,
        });

        console.log(
          `[Pipeline] Stage completed: ${stage.name} (${durationMs}ms)`
        );

        // Update article ID after draft generation for subsequent stages
        if (stage.stage === 'draft_generation' && data.slug) {
          // Save draft to database to get article ID
          console.log('[Pipeline] Saving draft to database');
          const draftResult = await (supabase as any)
            .from('articles')
            .insert({
              organization_id: organizationId,
              product_id: productId || null,
              keyword_id: keywordId || null,
              title: data.title || keyword,
              slug: data.slug,
              content: data.content || '',
              excerpt: data.excerpt,
              meta_title: data.metaTitle,
              meta_description: data.metaDescription,
              meta_keywords: data.metaKeywords || [],
              status: 'draft',
              word_count: data.content?.split(/\s+/).length || 0,
              reading_time_minutes: Math.ceil(
                (data.content?.split(/\s+/).length || 0) / 200
              ),
              author_id: userId,
            })
            .select('id')
            .single();

          if (!draftResult.error) {
            data.articleId = draftResult.data.id;
            console.log(
              `[Pipeline] Draft saved with article ID: ${data.articleId}`
            );
          }
        }
      } catch (stageError) {
        const completedAt = Date.now();
        const durationMs = completedAt - stageStartTime;
        const errorMessage =
          stageError instanceof Error ? stageError.message : 'Unknown error';

        console.error(`[Pipeline] Stage failed: ${stage.name}`, stageError);

        stageResults.push({
          stage: stage.stage,
          status: 'failed',
          startedAt: new Date(stageStartTime).toISOString(),
          completedAt: new Date(completedAt).toISOString(),
          durationMs,
          error: errorMessage,
        });

        // Continue pipeline even if a stage fails
        // Only critical failures should stop the pipeline
      }
    }

    // Mark pipeline as completed
    status = 'completed';
    currentStage = undefined;

    console.log(`[Pipeline] Pipeline ${pipelineId} completed`);
  } catch (pipelineError) {
    status = 'failed';
    error =
      pipelineError instanceof Error
        ? pipelineError.message
        : 'Unknown pipeline error';

    console.error(`[Pipeline] Pipeline ${pipelineId} failed:`, error);
  }

  // Build final result
  const completedAt = new Date().toISOString();
  const progress =
    status === 'completed'
      ? 100
      : Math.round(
          (stageResults.filter((r) => r.status === 'completed').length /
            PIPELINE_STAGES.length) *
            100
        );

  const result: PipelineResult = {
    pipelineId,
    status,
    currentStage,
    progress,
    startedAt: startedAt.toISOString(),
    completedAt: status === 'completed' ? completedAt : undefined,
    stages: stageResults,
    result:
      status === 'completed'
        ? {
            articleId: data.articleId,
            article: data.articleId
              ? {
                  id: data.articleId,
                  title: data.title || '',
                  slug: data.slug || '',
                  content: data.content || '',
                  excerpt: data.excerpt,
                  featured_image_url: data.generatedImages?.find(
                    (img) => img.isFeatured
                  )?.url,
                  seo_score: data.seoAnalysis?.overallScore,
                  meta_title: data.metaTitle,
                  meta_description: data.metaDescription,
                  meta_keywords: data.metaKeywords,
                }
              : undefined,
            serpAnalysis: data.serpAnalysis,
            outline: data.outline,
            internalLinks: data.internalLinkSuggestions,
            externalLinks: data.externalLinkOpportunities,
            generatedImages: data.generatedImages,
            seoAnalysis: data.seoAnalysis,
          }
        : undefined,
    error,
  };

  return {
    success: status === 'completed',
    pipelineId,
    result,
  };
}

/**
 * Execute pipeline synchronously (returns result immediately)
 */
export async function executePipelineSync(
  request: ExecutePipelineRequest
): Promise<ExecutePipelineResult> {
  return executePipeline(request);
}

/**
 * Get pipeline stage by name
 */
export function getStage(stageName: PipelineStage): StageConfig | undefined {
  return PIPELINE_STAGES.find((s) => s.stage === stageName);
}

/**
 * Get all pipeline stages
 */
export function getAllStages(): StageConfig[] {
  return [...PIPELINE_STAGES];
}

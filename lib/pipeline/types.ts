/**
 * Article Generation Pipeline Types
 *
 * Core types for the article generation pipeline system.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  PipelineStage,
  PipelineStatus,
  PipelineOptions,
  PipelineStageResult,
  PipelineResult,
} from '@/lib/schemas/pipeline';

// Re-export pipeline types for convenience
export type {
  PipelineStage,
  PipelineStatus,
  PipelineOptions,
  PipelineStageResult,
  PipelineResult,
} from '@/lib/schemas/pipeline';

/**
 * Pipeline execution context
 * Contains all state and data needed during pipeline execution
 */
export interface PipelineExecutionContext {
  // Client for database operations
  supabase: SupabaseClient<Database>;

  // User information
  userId: string;

  // Organization context
  organizationId: string;
  productId?: string;
  keywordId?: string;

  // Input data
  keyword: string;
  providedOutline?: Array<{
    id: string;
    title: string;
    points: string[];
    wordCount: number;
  }>;
  providedTitle?: string;
  providedContent?: string;

  // Pipeline options
  options: PipelineOptions;

  // Pipeline tracking
  pipelineId: string;
  startedAt: Date;
  currentStage?: PipelineStage;
}

/**
 * Stage data accumulated during pipeline execution
 */
export interface PipelineData {
  // SERP Analysis results
  serpAnalysis?: {
    query: string;
    results: Array<{
      title: string;
      url: string;
      snippet: string;
      position: number;
    }>;
    competitors: Array<{
      title: string;
      url: string;
      wordCount?: number;
      structure?: string[];
    }>;
    contentGaps?: string[];
    recommendations?: string[];
    keywordDifficulty?: number;
  };

  // Outline data
  outline?: Array<{
    id: string;
    title: string;
    points: string[];
    wordCount: number;
  }>;

  // Draft content
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];

  // Article ID (once saved)
  articleId?: string;

  // Internal link suggestions
  internalLinkSuggestions?: Array<{
    targetArticleId: string;
    targetArticleTitle: string;
    suggestedAnchorText: string;
    contextSnippet: string;
    relevanceScore: number;
    positionInContent?: number;
  }>;

  // External link opportunities
  externalLinkOpportunities?: Array<{
    url: string;
    anchorText: string;
    contextSnippet: string;
    relevanceScore: number;
    authority?: number;
    source?: string;
  }>;

  // Generated images
  generatedImages?: Array<{
    url: string;
    prompt: string;
    style: string;
    size: string;
    altText?: string;
    isFeatured?: boolean;
  }>;

  // SEO analysis
  seoAnalysis?: {
    overallScore: number;
    grade: string;
    keywordDensity?: number;
    readabilityScore?: number;
    headingStructureScore?: number;
    metaTagsScore?: number;
    linkScore?: number;
    recommendations?: string[];
  };
}

/**
 * Individual stage executor function signature
 */
export type StageExecutor = (
  context: PipelineExecutionContext,
  data: PipelineData
) => Promise<PipelineData>;

/**
 * Stage executor configuration
 */
export interface StageConfig {
  stage: PipelineStage;
  name: string;
  description: string;
  execute: StageExecutor;
  dependsOn?: PipelineStage[];
  skipIf?: (context: PipelineExecutionContext, data: PipelineData) => boolean;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  stages: StageConfig[];
  onProgress?: (
    pipelineId: string,
    stage: PipelineStage,
    progress: number,
    message: string
  ) => Promise<void> | void;
  onError?: (
    pipelineId: string,
    stage: PipelineStage,
    error: Error
  ) => Promise<void> | void;
  onComplete?: (
    pipelineId: string,
    result: PipelineResult
  ) => Promise<void> | void;
}

/**
 * Pipeline execution request
 */
export interface ExecutePipelineRequest {
  keyword: string;
  organizationId: string;
  userId: string;
  keywordId?: string;
  productId?: string;
  providedOutline?: Array<{
    id: string;
    title: string;
    points: string[];
    wordCount: number;
  }>;
  providedTitle?: string;
  providedContent?: string;
  options?: Partial<PipelineOptions>;
}

/**
 * Pipeline execution result
 */
export interface ExecutePipelineResult {
  success: boolean;
  pipelineId: string;
  result?: PipelineResult;
  error?: string;
}

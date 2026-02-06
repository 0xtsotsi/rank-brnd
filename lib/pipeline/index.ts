/**
 * Article Generation Pipeline
 *
 * Main entry point for the article generation pipeline system.
 * Exports all types, orchestrators, and stage executors.
 */

// Re-export types
export * from './types';
export * from '../schemas/pipeline';

// Re-export orchestrator
export {
  executePipeline,
  executePipelineSync,
  getStage,
  getAllStages,
  PIPELINE_STAGES,
} from './orchestrator';

// Re-export stage executors
export { executeSerpAnalysis } from './stages/serp-analysis';
export { executeOutlineGeneration } from './stages/outline-generation';
export { executeDraftGeneration } from './stages/draft-generation';
export { executeInternalLinking } from './stages/internal-linking';
export { executeExternalLinking } from './stages/external-linking';
export { executeImageGeneration } from './stages/image-generation';
export { executeSeoScoring } from './stages/seo-scoring';
export { executeFinalization } from './stages/finalization';

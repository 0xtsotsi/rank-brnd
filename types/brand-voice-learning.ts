// @ts-nocheck - Database types need to be regenerated with Supabase CLI
/**
 * Brand Voice Learning Types
 * Types for brand voice sample management and AI-powered brand voice analysis
 *
 * This file provides both database-aligned types and form-facing types
 * for a seamless integration between the UI and the database layer.
 */

import type { Database } from './database';
import type { Json } from './database';

// ============================================================================
// Database-Aligned Types (from Supabase)
// ============================================================================

/**
 * Brand voice learning database row type
 */
export type DbBrandVoiceLearning =
  Database['public']['Tables']['brand_voice_learning']['Row'];

/**
 * Brand voice learning insert type (for creating new records)
 */
export type DbBrandVoiceLearningInsert =
  Database['public']['Tables']['brand_voice_learning']['Insert'];

/**
 * Brand voice learning update type (for updating existing records)
 */
export type DbBrandVoiceLearningUpdate =
  Database['public']['Tables']['brand_voice_learning']['Update'];

/**
 * Brand voice analysis status enum (matches database: brand_voice_analysis_status)
 */
export type BrandVoiceAnalysisStatus = DbBrandVoiceLearning['analysis_status'];

/**
 * Brand voice source type enum
 */
export type BrandVoiceSourceType = DbBrandVoiceLearning['source_type'];

// ============================================================================
// Domain Types (Application Layer)
// ============================================================================

/**
 * Tone analysis result
 */
export interface ToneAnalysis {
  tones: string[];
  primary_tone?: string;
  confidence?: number;
}

/**
 * Vocabulary analysis result
 */
export interface VocabularyAnalysis {
  category?: string;
  complexity_level?: 'simple' | 'moderate' | 'complex' | 'academic';
  common_words?: string[];
  unique_word_count?: number;
  avg_word_length?: number;
}

/**
 * Style analysis result
 */
export interface StyleAnalysis {
  type?: string;
  sentence_structure?: 'simple' | 'compound' | 'complex' | 'varied';
  paragraph_length?: 'short' | 'medium' | 'long' | 'varied';
  use_of_emoji?: boolean;
  use_of_bullets?: boolean;
}

/**
 * Complete brand voice analysis stored in JSONB
 */
export interface BrandVoiceAnalysis {
  tone: string[];
  vocabulary: VocabularyAnalysis;
  style: StyleAnalysis;
  sentiment?: 'positive' | 'neutral' | 'negative';
  formality_level?: 'formal' | 'informal' | 'neutral';
  keywords?: string[];
  [key: string]:
    | Json
    | string[]
    | VocabularyAnalysis
    | StyleAnalysis
    | undefined;
}

/**
 * Brand voice sample metadata
 */
export interface BrandVoiceMetadata {
  source_url?: string;
  author?: string;
  publish_date?: string;
  word_count?: number;
  language?: string;
  tags?: string[];
  [key: string]: Json | string | string[] | undefined;
}

/**
 * Brand voice learning sample
 * This is the main application type that extends the database type
 */
export interface BrandVoiceLearning {
  id: string;
  organization_id: string;
  product_id: string | null;
  sample_text: string;
  source_type: BrandVoiceSourceType;
  analysis: BrandVoiceAnalysis;
  analysis_status: BrandVoiceAnalysisStatus;
  analysis_error: string | null;
  confidence_score: number | null;
  metadata: BrandVoiceMetadata;
  created_at: Date;
  updated_at: Date;
}

/**
 * Brand voice learning with optional ID (for creation)
 */
export type BrandVoiceLearningInput = Omit<
  BrandVoiceLearning,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

/**
 * Form data for creating/updating a brand voice sample
 */
export interface BrandVoiceLearningFormData {
  sample_text: string;
  source_type?: BrandVoiceSourceType;
  product_id?: string;
  metadata?: Partial<BrandVoiceMetadata>;
}

/**
 * Filter options for brand voice samples
 */
export interface BrandVoiceLearningFilters {
  search: string;
  status: BrandVoiceAnalysisStatus | 'all';
  source_type: BrandVoiceSourceType | 'all';
  product_id: string | 'all';
}

/**
 * Brand voice sample list response with pagination
 */
export interface BrandVoiceLearningListResponse {
  samples: BrandVoiceLearning[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Aggregated brand voice analysis for a product/organization
 */
export interface AggregatedBrandVoiceAnalysis {
  tone: Record<string, number>;
  vocabulary: Record<string, number>;
  style: Record<string, number>;
  sentiment_distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  avg_confidence: number;
  sample_count: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Brand voice analysis status label mapping
 */
export const ANALYSIS_STATUS_LABELS: Record<BrandVoiceAnalysisStatus, string> =
  {
    pending: 'Pending',
    analyzing: 'Analyzing',
    completed: 'Completed',
    failed: 'Failed',
  } as const;

/**
 * Brand voice analysis status color mapping (for Tailwind CSS)
 */
export const ANALYSIS_STATUS_COLORS: Record<
  BrandVoiceAnalysisStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
  analyzing: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  completed: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  failed: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
} as const;

/**
 * Brand voice source type label mapping
 */
export const SOURCE_TYPE_LABELS: Record<BrandVoiceSourceType, string> = {
  manual: 'Manual Entry',
  website: 'Website',
  document: 'Document',
  article: 'Article',
  product_page: 'Product Page',
} as const;

/**
 * Default brand voice analysis (empty state)
 */
export const DEFAULT_BRAND_VOICE_ANALYSIS: BrandVoiceAnalysis = {
  tone: [],
  vocabulary: {},
  style: {},
};

/**
 * Default brand voice metadata (empty state)
 */
export const DEFAULT_BRAND_VOICE_METADATA: BrandVoiceMetadata = {};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert database brand voice learning to domain brand voice learning
 */
export function dbBrandVoiceLearningToBrandVoiceLearning(
  dbBrandVoice: DbBrandVoiceLearning
): BrandVoiceLearning {
  return {
    id: dbBrandVoice.id,
    organization_id: dbBrandVoice.organization_id,
    product_id: dbBrandVoice.product_id,
    sample_text: dbBrandVoice.sample_text,
    source_type: dbBrandVoice.source_type,
    analysis: dbBrandVoice.analysis as unknown as BrandVoiceAnalysis,
    analysis_status: dbBrandVoice.analysis_status,
    analysis_error: dbBrandVoice.analysis_error,
    confidence_score: dbBrandVoice.confidence_score,
    metadata: (dbBrandVoice.metadata || {}) as unknown as BrandVoiceMetadata,
    created_at: new Date(dbBrandVoice.created_at),
    updated_at: new Date(dbBrandVoice.updated_at),
  };
}

/**
 * Convert domain brand voice learning to database insert
 */
export function brandVoiceLearningToDbInsert(
  brandVoice: Partial<BrandVoiceLearning> &
    Pick<BrandVoiceLearning, 'organization_id' | 'sample_text'>
): DbBrandVoiceLearningInsert {
  return {
    organization_id: brandVoice.organization_id,
    product_id: brandVoice.product_id || null,
    sample_text: brandVoice.sample_text,
    source_type: brandVoice.source_type || 'manual',
    analysis: (brandVoice.analysis ||
      DEFAULT_BRAND_VOICE_ANALYSIS) as unknown as Json,
    analysis_status: brandVoice.analysis_status || 'pending',
    analysis_error: brandVoice.analysis_error || null,
    confidence_score: brandVoice.confidence_score || null,
    metadata: (brandVoice.metadata ||
      DEFAULT_BRAND_VOICE_METADATA) as unknown as Json,
  };
}

/**
 * Convert domain brand voice learning to database update
 */
export function brandVoiceLearningToDbUpdate(
  brandVoice: Partial<BrandVoiceLearning>
): DbBrandVoiceLearningUpdate {
  const update: DbBrandVoiceLearningUpdate = {};

  if (brandVoice.sample_text !== undefined)
    update.sample_text = brandVoice.sample_text;
  if (brandVoice.source_type !== undefined)
    update.source_type = brandVoice.source_type;
  if (brandVoice.analysis !== undefined)
    update.analysis = brandVoice.analysis as unknown as Json;
  if (brandVoice.analysis_status !== undefined)
    update.analysis_status = brandVoice.analysis_status;
  if (brandVoice.analysis_error !== undefined)
    update.analysis_error = brandVoice.analysis_error;
  if (brandVoice.confidence_score !== undefined)
    update.confidence_score = brandVoice.confidence_score;
  if (brandVoice.metadata !== undefined)
    update.metadata = brandVoice.metadata as unknown as Json;

  return update;
}

/**
 * Convert form data to brand voice learning (for creation)
 */
export function formDataToBrandVoiceLearning(
  data: BrandVoiceLearningFormData,
  organizationId: string,
  id?: string
): BrandVoiceLearningInput {
  return {
    id,
    organization_id: organizationId,
    product_id: data.product_id || null,
    sample_text: data.sample_text.trim(),
    source_type: data.source_type || 'manual',
    analysis: DEFAULT_BRAND_VOICE_ANALYSIS,
    analysis_status: 'pending',
    analysis_error: null,
    confidence_score: null,
    metadata: data.metadata || DEFAULT_BRAND_VOICE_METADATA,
    created_at: id ? new Date() : undefined,
    updated_at: new Date(),
  };
}

/**
 * Calculate word count from text
 */
export function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Truncate text for preview
 */
export function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Check if analysis is complete and successful
 */
export function isAnalysisComplete(brandVoice: BrandVoiceLearning): boolean {
  return (
    brandVoice.analysis_status === 'completed' &&
    brandVoice.confidence_score !== null
  );
}

/**
 * Check if analysis is pending or in progress
 */
export function isAnalysisPending(brandVoice: BrandVoiceLearning): boolean {
  return (
    brandVoice.analysis_status === 'pending' ||
    brandVoice.analysis_status === 'analyzing'
  );
}

/**
 * Get analysis status display info
 */
export function getAnalysisStatusInfo(status: BrandVoiceAnalysisStatus) {
  return {
    label: ANALYSIS_STATUS_LABELS[status],
    ...ANALYSIS_STATUS_COLORS[status],
  };
}

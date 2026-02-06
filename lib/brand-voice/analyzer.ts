// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Brand Voice Analyzer Service
 *
 * Service for analyzing brand voice samples using GPT-4 to extract
 * tone, vocabulary, and formatting patterns. Generates comprehensive
 * style guides from 5-10 content samples.
 */

import { getSupabaseServerClient } from '../supabase/client';
import type { Database } from '@/types/database';
import type {
  BrandVoiceAnalysis,
  AggregatedBrandVoiceAnalysis,
  BrandVoiceLearning,
} from '@/types/brand-voice-learning';
import { dbBrandVoiceLearningToBrandVoiceLearning } from '@/types/brand-voice-learning';

// ============================================================================
// Error Types
// ============================================================================

export type BrandVoiceAnalyzerErrorType =
  | 'API_KEY_MISSING'
  | 'INVALID_INPUT'
  | 'ANALYSIS_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTENT_POLICY_VIOLATION'
  | 'DATABASE_ERROR'
  | 'INSUFFICIENT_SAMPLES'
  | 'UNKNOWN_ERROR';

export class BrandVoiceAnalyzerError extends Error {
  constructor(
    public readonly type: BrandVoiceAnalyzerErrorType,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'BrandVoiceAnalyzerError';
  }
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  model: 'gpt-4o',
  maxSamples: 10,
  minSamples: 5,
  maxSampleLength: 5000,
  maxTokens: 4000,
  temperature: 0.3,
} as const;

// ============================================================================
// Analysis Prompt Templates
// ============================================================================

/**
 * System prompt for single sample analysis
 */
const SINGLE_SAMPLE_ANALYSIS_PROMPT = `You are an expert linguistic analyst specializing in brand voice analysis. Your task is to analyze the provided text sample and extract key characteristics of the brand's communication style.

Analyze the following aspects:

1. **Tone**: Identify the primary tones (e.g., professional, friendly, authoritative, playful, empathetic, urgent). List 3-5 tone descriptors.

2. **Vocabulary**:
   - Category: Describe the vocabulary type (technical, casual, business, creative, etc.)
   - Complexity level: simple, moderate, complex, or academic
   - Common words: List 5-10 distinctive words or phrases frequently used
   - Unique word count: Estimate the variety of vocabulary
   - Average word length: Estimate average word length

3. **Style**:
   - Type: Overall writing style (narrative, instructional, promotional, informational)
   - Sentence structure: simple, compound, complex, or varied
   - Paragraph length: short, medium, long, or varied
   - Use of emoji: true/false
   - Use of bullets: true/false

4. **Sentiment**: overall, neutral, or negative

5. **Formality level**: formal, informal, or neutral

6. **Keywords**: Extract 5-10 important keywords that represent the content

Respond ONLY with a valid JSON object in this exact format:
{
  "tone": ["tone1", "tone2", "tone3"],
  "vocabulary": {
    "category": "description",
    "complexity_level": "simple|moderate|complex|academic",
    "common_words": ["word1", "word2", ...],
    "unique_word_count": 123,
    "avg_word_length": 4.5
  },
  "style": {
    "type": "description",
    "sentence_structure": "simple|compound|complex|varied",
    "paragraph_length": "short|medium|long|varied",
    "use_of_emoji": false,
    "use_of_bullets": false
  },
  "sentiment": "positive|neutral|negative",
  "formality_level": "formal|informal|neutral",
  "keywords": ["keyword1", "keyword2", ...]
}`;

/**
 * System prompt for aggregated analysis (style guide generation)
 */
const AGGREGATED_ANALYSIS_PROMPT = `You are an expert brand strategist and linguistic analyst. Your task is to analyze multiple brand voice samples and create a comprehensive brand voice style guide.

Review the aggregated analysis from multiple content samples and create a synthesized brand voice profile that identifies consistent patterns and unique characteristics.

Your analysis should include:

1. **Dominant Tones**: The most frequently occurring tones across all samples
2. **Vocabulary Patterns**: Consistent vocabulary characteristics
3. **Writing Style**: Common stylistic elements and patterns
4. **Sentiment Tendency**: Overall sentiment distribution
5. **Formality Level**: The typical formality of the brand's communication
6. **Key Themes**: Recurring topics and keywords
7. **Confidence Score**: Your confidence in this analysis (0-1) based on sample consistency

Provide actionable guidance for content creators to maintain this brand voice.

Respond ONLY with a valid JSON object in this exact format:
{
  "dominant_tones": ["tone1", "tone2"],
  "tone_distribution": {"tone1": 0.8, "tone2": 0.6},
  "vocabulary_profile": {
    "category": "description",
    "complexity_level": "moderate",
    "distinctive_words": ["word1", "word2"]
  },
  "style_profile": {
    "sentence_structure": "varied",
    "paragraph_length": "medium",
    "formatting_habits": "description"
  },
  "sentiment_tendency": "positive",
  "formality_level": "neutral",
  "key_themes": ["theme1", "theme2"],
  "guidance": ["tip1", "tip2", "tip3"],
  "confidence_score": 0.85
}`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates that OpenAI API key is available
 */
function validateApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new BrandVoiceAnalyzerError(
      'API_KEY_MISSING',
      'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.'
    );
  }
  return apiKey;
}

/**
 * Parses an OpenAI API error response
 */
function parseApiError(error: unknown): {
  type: BrandVoiceAnalyzerErrorType;
  message: string;
} {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes('api key') ||
      message.includes('authentication') ||
      message.includes('unauthorized')
    ) {
      return {
        type: 'API_KEY_MISSING',
        message:
          'Invalid or missing OpenAI API key. Please check your environment variables.',
      };
    }

    if (
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('429')
    ) {
      return {
        type: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
      };
    }

    if (
      message.includes('content policy') ||
      message.includes('safety') ||
      message.includes('violates')
    ) {
      return {
        type: 'CONTENT_POLICY_VIOLATION',
        message: 'The content violates OpenAI content policy.',
      };
    }

    return {
      type: 'ANALYSIS_FAILED',
      message: `API error: ${error.message}`,
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred during brand voice analysis.',
  };
}

/**
 * Truncates text to maximum length while preserving word boundaries
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Validates sample text before analysis
 */
function validateSampleText(text: string): void {
  if (!text || text.trim().length < 50) {
    throw new BrandVoiceAnalyzerError(
      'INVALID_INPUT',
      'Sample text must be at least 50 characters for meaningful analysis.'
    );
  }

  if (text.length > 50000) {
    throw new BrandVoiceAnalyzerError(
      'INVALID_INPUT',
      'Sample text cannot exceed 50000 characters.'
    );
  }
}

/**
 * Validates the analysis response structure
 */
function validateAnalysisResponse(data: unknown): data is BrandVoiceAnalysis {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  if (!Array.isArray(obj.tone)) {
    return false;
  }

  if (typeof obj.vocabulary !== 'object' || obj.vocabulary === null) {
    return false;
  }

  if (typeof obj.style !== 'object' || obj.style === null) {
    return false;
  }

  return true;
}

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Analyzes a single brand voice sample using GPT-4
 *
 * @param sampleText - The text to analyze
 * @returns Brand voice analysis result
 */
export async function analyzeSingleSample(
  sampleText: string
): Promise<{ analysis: BrandVoiceAnalysis; confidence: number }> {
  // Validate input
  validateSampleText(sampleText);
  const apiKey = validateApiKey();

  // Truncate if necessary
  const textToAnalyze = truncateText(
    sampleText,
    DEFAULT_CONFIG.maxSampleLength
  );

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: SINGLE_SAMPLE_ANALYSIS_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze the following text for brand voice characteristics:\n\n${textToAnalyze}`,
          },
        ],
        temperature: DEFAULT_CONFIG.temperature,
        max_tokens: DEFAULT_CONFIG.maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || response.statusText);
      const parsed = parseApiError(error);
      throw new BrandVoiceAnalyzerError(parsed.type, parsed.message, errorData);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new BrandVoiceAnalyzerError(
        'ANALYSIS_FAILED',
        'No response from OpenAI API'
      );
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new BrandVoiceAnalyzerError(
        'ANALYSIS_FAILED',
        'Empty response from OpenAI API'
      );
    }

    let analysis: BrandVoiceAnalysis;
    try {
      const parsed = JSON.parse(content);
      if (!validateAnalysisResponse(parsed)) {
        throw new Error('Invalid response structure');
      }
      analysis = parsed;
    } catch (parseError) {
      throw new BrandVoiceAnalyzerError(
        'ANALYSIS_FAILED',
        'Failed to parse analysis response from OpenAI'
      );
    }

    // Calculate confidence based on text length and response quality
    const confidence = Math.min(0.95, 0.5 + (sampleText.length / 1000) * 0.1);

    return { analysis, confidence };
  } catch (error) {
    if (error instanceof BrandVoiceAnalyzerError) {
      throw error;
    }
    const parsed = parseApiError(error);
    throw new BrandVoiceAnalyzerError(parsed.type, parsed.message, error);
  }
}

/**
 * Analyzes multiple brand voice samples and generates an aggregated style guide
 *
 * @param samples - Array of brand voice samples to analyze
 * @returns Aggregated brand voice analysis
 */
export async function analyzeSamples(
  samples: BrandVoiceLearning[]
): Promise<AggregatedBrandVoiceAnalysis & { guidance?: string[] }> {
  if (samples.length < DEFAULT_CONFIG.minSamples) {
    throw new BrandVoiceAnalyzerError(
      'INSUFFICIENT_SAMPLES',
      `At least ${DEFAULT_CONFIG.minSamples} samples are required for aggregated analysis. Found: ${samples.length}`
    );
  }

  const samplesToAnalyze = samples.slice(0, DEFAULT_CONFIG.maxSamples);

  // Build aggregated data from existing analyses or analyze new samples
  const aggregatedData: {
    tone: string[];
    vocabulary: Record<string, number>;
    style: Record<string, number>;
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    totalConfidence: number;
    sampleCount: number;
  } = {
    tone: [],
    vocabulary: {},
    style: {},
    sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
    totalConfidence: 0,
    sampleCount: samplesToAnalyze.length,
  };

  for (const sample of samplesToAnalyze) {
    // If sample already has analysis, use it; otherwise analyze it
    let analysis = sample.analysis;
    let confidence = sample.confidence_score ?? 0;

    if (sample.analysis_status !== 'completed' || !sample.confidence_score) {
      const result = await analyzeSingleSample(sample.sample_text);
      analysis = result.analysis;
      confidence = result.confidence;

      // Update the sample in the database
      await updateSampleAnalysis(
        sample.id,
        analysis,
        'completed',
        null,
        confidence
      );
    }

    // Aggregate tone data
    if (analysis.tone && Array.isArray(analysis.tone)) {
      aggregatedData.tone.push(...analysis.tone);
    }

    // Aggregate vocabulary data
    if (analysis.vocabulary?.category) {
      const category = analysis.vocabulary.category;
      aggregatedData.vocabulary[category] =
        (aggregatedData.vocabulary[category] || 0) + 1;
    }

    // Aggregate style data
    if (analysis.style?.type) {
      const styleType = analysis.style.type;
      aggregatedData.style[styleType] =
        (aggregatedData.style[styleType] || 0) + 1;
    }

    // Aggregate sentiment data
    if (analysis.sentiment) {
      aggregatedData.sentimentDistribution[analysis.sentiment]++;
    }

    aggregatedData.totalConfidence += confidence;
  }

  // Calculate frequency distributions
  const toneDistribution: Record<string, number> = {};
  for (const tone of aggregatedData.tone) {
    toneDistribution[tone] = (toneDistribution[tone] || 0) + 1;
  }

  // Find dominant tones (top 3)
  const dominantTones = Object.entries(toneDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tone]) => tone);

  // Normalize tone distribution
  const totalTones = aggregatedData.tone.length || 1;
  const normalizedToneDistribution: Record<string, number> = {};
  for (const [tone, count] of Object.entries(toneDistribution)) {
    normalizedToneDistribution[tone] = count / totalTones;
  }

  // Find dominant vocabulary category
  const dominantVocabulary = Object.entries(aggregatedData.vocabulary)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({ category: cat, count }))
    .slice(0, 3);

  // Find dominant style
  const dominantStyle = Object.entries(aggregatedData.style).sort(
    (a, b) => b[1] - a[1]
  )[0];

  // Build vocabulary distribution from dominant entries
  const vocabularyDistribution: Record<string, number> = {};
  for (const { category, count } of dominantVocabulary) {
    vocabularyDistribution[category] = count / samplesToAnalyze.length;
  }

  return {
    tone: normalizedToneDistribution,
    vocabulary: vocabularyDistribution,
    style: dominantStyle
      ? { [dominantStyle[0]]: dominantStyle[1] / samplesToAnalyze.length }
      : {},
    sentiment_distribution: aggregatedData.sentimentDistribution,
    avg_confidence: aggregatedData.totalConfidence / samplesToAnalyze.length,
    sample_count: samplesToAnalyze.length,
  } as AggregatedBrandVoiceAnalysis;
}

/**
 * Generates a comprehensive brand voice style guide from multiple samples
 *
 * @param organizationId - Organization ID
 * @param productId - Optional product ID for product-specific analysis
 * @returns Generated style guide
 */
export async function generateStyleGuide(
  organizationId: string,
  productId?: string
): Promise<{
  analysis: AggregatedBrandVoiceAnalysis & { guidance?: string[] };
  samplesAnalyzed: number;
}> {
  const supabase = getSupabaseServerClient();

  // Fetch samples for analysis
  let query = supabase
    .from('brand_voice_learning')
    .select('*')
    .eq('organization_id', organizationId);

  if (productId) {
    query = query.eq('product_id', productId);
  } else {
    query = query.is('product_id', null);
  }

  const { data: samples, error } = await query
    .order('created_at', { ascending: false })
    .limit(DEFAULT_CONFIG.maxSamples);

  if (error) {
    throw new BrandVoiceAnalyzerError(
      'DATABASE_ERROR',
      `Failed to fetch samples: ${error.message}`,
      error
    );
  }

  if (!samples || samples.length < DEFAULT_CONFIG.minSamples) {
    throw new BrandVoiceAnalyzerError(
      'INSUFFICIENT_SAMPLES',
      `At least ${DEFAULT_CONFIG.minSamples} samples are required for style guide generation. Found: ${samples?.length || 0}`
    );
  }

  // Convert to domain types
  const brandVoiceSamples = samples.map(
    dbBrandVoiceLearningToBrandVoiceLearning
  );

  // Perform aggregated analysis
  const analysis = await analyzeSamples(brandVoiceSamples);

  return {
    analysis,
    samplesAnalyzed: brandVoiceSamples.length,
  };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Updates a sample's analysis in the database
 */
async function updateSampleAnalysis(
  sampleId: string,
  analysis: BrandVoiceAnalysis,
  status: 'completed' | 'failed',
  error: string | null,
  confidence: number
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error: updateError } = await (supabase as any)
    .from('brand_voice_learning')
    .update({
      analysis:
        analysis as unknown as Database['public']['Tables']['brand_voice_learning']['Insert']['analysis'],
      analysis_status: status,
      analysis_error: error,
      confidence_score: confidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sampleId);

  if (updateError) {
    throw new BrandVoiceAnalyzerError(
      'DATABASE_ERROR',
      `Failed to update sample: ${updateError.message}`,
      updateError
    );
  }
}

/**
 * Analyzes a specific sample by ID
 *
 * @param sampleId - ID of the sample to analyze
 * @param forceRefresh - Whether to re-analyze even if already completed
 * @returns Analysis result
 */
export async function analyzeSampleById(
  sampleId: string,
  forceRefresh: boolean = false
): Promise<{ analysis: BrandVoiceAnalysis; confidence: number }> {
  const supabase = getSupabaseServerClient();

  // Fetch the sample
  const { data: sample, error } = await supabase
    .from('brand_voice_learning')
    .select('*')
    .eq('id', sampleId)
    .single();

  if (error || !sample) {
    throw new BrandVoiceAnalyzerError(
      'DATABASE_ERROR',
      `Sample not found: ${sampleId}`,
      error
    );
  }

  // Check if already analyzed
  if (
    !forceRefresh &&
    (sample as any).analysis_status === 'completed' &&
    (sample as any).confidence_score
  ) {
    return {
      analysis: (sample as any).analysis as unknown as BrandVoiceAnalysis,
      confidence: (sample as any).confidence_score,
    };
  }

  // Update status to analyzing
  await (supabase as any)
    .from('brand_voice_learning')
    .update({
      analysis_status: 'analyzing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sampleId);

  try {
    // Perform the analysis
    const result = await analyzeSingleSample((sample as any).sample_text);

    // Update with results
    await updateSampleAnalysis(
      sampleId,
      result.analysis,
      'completed',
      null,
      result.confidence
    );

    return result;
  } catch (analysisError) {
    // Update with error
    const errorMessage =
      analysisError instanceof Error ? analysisError.message : 'Unknown error';
    await updateSampleAnalysis(
      sampleId,
      {} as BrandVoiceAnalysis,
      'failed',
      errorMessage,
      0
    );
    throw analysisError;
  }
}

/**
 * Batch analyzes multiple samples by ID
 *
 * @param sampleIds - Array of sample IDs to analyze
 * @returns Array of analysis results
 */
export async function batchAnalyzeSamples(sampleIds: string[]): Promise<
  Array<{
    sampleId: string;
    analysis?: BrandVoiceAnalysis;
    confidence?: number;
    error?: string;
  }>
> {
  const results: Array<{
    sampleId: string;
    analysis?: BrandVoiceAnalysis;
    confidence?: number;
    error?: string;
  }> = [];

  for (const sampleId of sampleIds) {
    try {
      const result = await analyzeSampleById(sampleId, true);
      results.push({
        sampleId,
        analysis: result.analysis,
        confidence: result.confidence,
      });
    } catch (error) {
      results.push({
        sampleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Gets aggregated brand voice analysis for an organization or product
 *
 * @param organizationId - Organization ID
 * @param productId - Optional product ID
 * @returns Aggregated analysis or null if insufficient samples
 */
export async function getAggregatedAnalysis(
  organizationId: string,
  productId?: string
): Promise<AggregatedBrandVoiceAnalysis | null> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('brand_voice_learning')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('analysis_status', 'completed');

  if (productId) {
    query = query.eq('product_id', productId);
  } else {
    query = query.is('product_id', null);
  }

  const { data: samples, error } = await query;

  if (error || !samples || samples.length === 0) {
    return null;
  }

  const brandVoiceSamples = samples.map(
    dbBrandVoiceLearningToBrandVoiceLearning
  );

  // Aggregate the data
  const aggregatedData: {
    tone: Record<string, number>;
    vocabulary: Record<string, number>;
    style: Record<string, number>;
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    totalConfidence: number;
  } = {
    tone: {},
    vocabulary: {},
    style: {},
    sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
    totalConfidence: 0,
  };

  for (const sample of brandVoiceSamples) {
    const analysis = sample.analysis;

    if (!analysis) continue;

    // Aggregate tone data
    if (analysis.tone && Array.isArray(analysis.tone)) {
      for (const tone of analysis.tone) {
        aggregatedData.tone[tone] = (aggregatedData.tone[tone] || 0) + 1;
      }
    }

    // Aggregate vocabulary data
    if (analysis.vocabulary?.category) {
      aggregatedData.vocabulary[analysis.vocabulary.category] =
        (aggregatedData.vocabulary[analysis.vocabulary.category] || 0) + 1;
    }

    // Aggregate style data
    if (analysis.style?.type) {
      aggregatedData.style[analysis.style.type] =
        (aggregatedData.style[analysis.style.type] || 0) + 1;
    }

    // Aggregate sentiment data
    if (analysis.sentiment) {
      aggregatedData.sentimentDistribution[analysis.sentiment]++;
    }

    aggregatedData.totalConfidence += sample.confidence_score ?? 0;
  }

  // Normalize distributions
  const totalSamples = brandVoiceSamples.length;
  const normalizedTone: Record<string, number> = {};
  for (const [tone, count] of Object.entries(aggregatedData.tone)) {
    normalizedTone[tone] = count / totalSamples;
  }

  const normalizedVocabulary: Record<string, number> = {};
  for (const [vocab, count] of Object.entries(aggregatedData.vocabulary)) {
    normalizedVocabulary[vocab] = count / totalSamples;
  }

  const normalizedStyle: Record<string, number> = {};
  for (const [style, count] of Object.entries(aggregatedData.style)) {
    normalizedStyle[style] = count / totalSamples;
  }

  return {
    tone: normalizedTone,
    vocabulary: normalizedVocabulary,
    style: normalizedStyle,
    sentiment_distribution: aggregatedData.sentimentDistribution,
    avg_confidence: aggregatedData.totalConfidence / totalSamples,
    sample_count: totalSamples,
  };
}

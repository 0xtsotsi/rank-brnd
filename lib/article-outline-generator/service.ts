/**
 * Article Outline Generator Service
 *
 * Service for generating article outlines using keyword research,
 * SERP analysis, and brand voice integration.
 */

import { getSupabaseServerClient } from '../supabase/client';
import type {
  ArticleOutlineRequest,
  ArticleOutlineResponse,
  ArticleOutline,
  OutlineHeading,
  OutlineSection,
  SerpInsights,
  BrandVoiceSummary,
  OutlineMetadata,
  OutlineGenerationErrorType,
} from '@/types/article-outline-generator';
import {
  OutlineGenerationError,
  DEFAULT_OUTLINE_CONFIG,
  SECTION_COUNT_RANGES,
  WORD_COUNT_RANGES,
} from '@/types/article-outline-generator';
import type { Json } from '@/types/database';
import type { BrandVoiceAnalysis } from '@/types/brand-voice-learning';
import type { SerpAnalysisRow } from '@/lib/supabase/serp-analyses';

/**
 * System prompt for outline generation
 */
const OUTLINE_GENERATION_PROMPT = `You are an expert SEO content strategist and outline generator. Your task is to create comprehensive, well-structured article outlines that:

1. Follow SEO best practices with proper heading hierarchy (H1, H2, H3)
2. Incorporate target keywords naturally throughout the structure
3. Provide clear descriptions for each section
4. Estimate word counts that align with content goals
5. Suggest related keywords and semantic variations

Respond ONLY with a valid JSON object in this exact format:
{
  "h1": {
    "level": "H1",
    "text": "Main heading text",
    "description": "Brief description of what the article covers",
    "estimatedWordCount": 150,
    "suggestedKeywords": ["keyword1", "keyword2"],
    "optional": false
  },
  "sections": [
    {
      "heading": {
        "level": "H2",
        "text": "Section heading",
        "description": "What this section covers",
        "estimatedWordCount": 300,
        "suggestedKeywords": ["keyword"],
        "optional": false
      },
      "subsections": [
        {
          "level": "H3",
          "text": "Subsection heading",
          "description": "What this subsection covers",
          "estimatedWordCount": 200,
          "suggestedKeywords": [],
          "optional": false
        }
      ]
    }
  ]
}`;

/**
 * Validates an outline generation request
 */
function validateRequest(request: ArticleOutlineRequest): void {
  if (!request.keyword || request.keyword.trim().length === 0) {
    throw new OutlineGenerationError('INVALID_KEYWORD', 'Keyword is required');
  }

  if (request.keyword.length > 200) {
    throw new OutlineGenerationError(
      'INVALID_KEYWORD',
      'Keyword must be less than 200 characters'
    );
  }

  const validContentTypes = [
    'blog_post',
    'guide',
    'tutorial',
    'listicle',
    'review',
    'comparison',
    'case_study',
    'news_article',
    'opinion',
    'faq',
    'how_to',
  ];
  if (request.contentType && !validContentTypes.includes(request.contentType)) {
    throw new OutlineGenerationError(
      'INVALID_CONTENT_TYPE',
      `Invalid content type. Must be one of: ${validContentTypes.join(', ')}`
    );
  }

  const validDetailLevels = ['basic', 'standard', 'comprehensive'];
  if (request.detailLevel && !validDetailLevels.includes(request.detailLevel)) {
    throw new OutlineGenerationError(
      'INVALID_DETAIL_LEVEL',
      `Invalid detail level. Must be one of: ${validDetailLevels.join(', ')}`
    );
  }
}

/**
 * Parses an OpenAI API error response
 */
function parseApiError(error: unknown): {
  type: OutlineGenerationErrorType;
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

    return {
      type: 'API_ERROR',
      message: `API error: ${error.message}`,
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred during outline generation.',
  };
}

/**
 * Gets SERP analysis for a keyword
 */
async function getSerpAnalysis(
  keywordId: string,
  organizationId: string
): Promise<SerpAnalysisRow | null> {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('serp_analyses')
      .select('*')
      .eq('keyword_id', keywordId)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as SerpAnalysisRow;
  } catch {
    return null;
  }
}

/**
 * Gets brand voice analysis for an organization
 */
async function getBrandVoiceAnalysis(
  organizationId: string,
  sampleId?: string
): Promise<BrandVoiceAnalysis | null> {
  try {
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('brand_voice_learning')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('analysis_status', 'completed');

    if (sampleId) {
      query = query.eq('id', sampleId);
    } else {
      // Get the most recent completed analysis
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    return (data as any).analysis as BrandVoiceAnalysis;
  } catch {
    return null;
  }
}

/**
 * Builds the context prompt from SERP analysis
 */
function buildSerpContext(serpAnalysis: SerpAnalysisRow | null): string {
  if (!serpAnalysis) {
    return '';
  }

  const gaps = (serpAnalysis.gaps as Record<string, unknown>[]) || [];
  const recommendations =
    (serpAnalysis.recommendations as Record<string, unknown>[]) || [];
  const serpFeatures = serpAnalysis.serp_features as Record<
    string,
    unknown
  > | null;

  let context = '\n\n=== SERP ANALYSIS CONTEXT ===\n';

  // Add competitor insights
  if (gaps.length > 0) {
    context += '\nContent gaps identified:\n';
    gaps.forEach((gap: any, index: number) => {
      context += `  ${index + 1}. ${gap.description || gap.type}\n`;
    });
  }

  // Add SERP features
  if (serpFeatures) {
    const features = Object.keys(serpFeatures).filter(
      (k) => serpFeatures[k] !== null
    );
    if (features.length > 0) {
      context += `\nSERP features present: ${features.join(', ')}\n`;
    }
  }

  // Add recommendations
  if (recommendations.length > 0) {
    context += '\nSEO recommendations:\n';
    recommendations.slice(0, 5).forEach((rec: any, index: number) => {
      context += `  ${index + 1}. ${rec.recommendation || rec.type}\n`;
    });
  }

  if (serpAnalysis.difficulty_score !== null) {
    context += `\nSERP difficulty score: ${serpAnalysis.difficulty_score}/100\n`;
  }

  return context;
}

/**
 * Builds the brand voice context
 */
function buildBrandVoiceContext(brandVoice: BrandVoiceAnalysis | null): string {
  if (!brandVoice) {
    return '';
  }

  let context = '\n\n=== BRAND VOICE CONTEXT ===\n';

  if (brandVoice.tone && brandVoice.tone.length > 0) {
    context += `Tone: ${brandVoice.tone.join(', ')}\n`;
  }

  if (brandVoice.vocabulary) {
    const vocab = brandVoice.vocabulary as Record<string, unknown>;
    if (vocab.complexity_level) {
      context += `Vocabulary complexity: ${vocab.complexity_level}\n`;
    }
  }

  if (brandVoice.style) {
    const style = brandVoice.style as Record<string, unknown>;
    if (style.type) {
      context += `Writing style: ${style.type}\n`;
    }
    if (style.sentence_structure) {
      context += `Sentence structure: ${style.sentence_structure}\n`;
    }
  }

  if (brandVoice.formality_level) {
    context += `Formality: ${brandVoice.formality_level}\n`;
  }

  return context;
}

/**
 * Generates a prompt for outline generation
 */
function buildOutlinePrompt(
  request: ArticleOutlineRequest,
  serpContext: string,
  brandVoiceContext: string
): string {
  const contentType = request.contentType || DEFAULT_OUTLINE_CONFIG.contentType;
  const detailLevel = request.detailLevel || DEFAULT_OUTLINE_CONFIG.detailLevel;
  const sectionRange = SECTION_COUNT_RANGES[detailLevel];
  const sectionCount =
    request.sectionCount || Math.floor((sectionRange[0] + sectionRange[1]) / 2);
  const wordCountRange = WORD_COUNT_RANGES[contentType];
  const targetWordCount =
    request.targetWordCount ||
    Math.floor((wordCountRange[0] + wordCountRange[1]) / 2);

  let prompt = `Generate a comprehensive article outline for the following topic:\n\n`;
  prompt += `**Primary Keyword:** ${request.keyword}\n`;
  prompt += `**Content Type:** ${contentType}\n`;
  prompt += `**Target Audience:** ${request.targetAudience || 'General audience interested in the topic'}\n`;
  prompt += `**Detail Level:** ${detailLevel}\n`;
  prompt += `**Target Word Count:** ${targetWordCount} words\n`;
  prompt += `**Number of Main Sections:** ${sectionCount} H2 sections\n`;

  if (request.additionalContext) {
    prompt += `\n**Additional Context:** ${request.additionalContext}\n`;
  }

  prompt += serpContext;
  prompt += brandVoiceContext;

  prompt += `\n\nREQUIREMENTS:\n`;
  prompt += `1. Create ${sectionCount} main sections (H2 headings)\n`;
  prompt += `2. Each H2 section should include 2-4 H3 subsections for ${detailLevel === 'comprehensive' ? 'comprehensive coverage' : detailLevel === 'standard' ? 'good coverage' : 'basic coverage'}\n`;
  prompt += `3. Total word count should be approximately ${targetWordCount} words\n`;
  prompt += `4. Include the primary keyword "${request.keyword}" in the H1 and at least 2 H2 sections\n`;
  prompt += `5. Suggest related keywords and semantic variations for each section\n`;
  prompt += `6. Provide clear, actionable descriptions for each section\n`;

  return prompt;
}

/**
 * Extracts SERP insights from SERP analysis
 */
function extractSerpInsights(
  serpAnalysis: SerpAnalysisRow | null
): SerpInsights | undefined {
  if (!serpAnalysis) {
    return undefined;
  }

  const gaps = (serpAnalysis.gaps as Record<string, unknown>[]) || [];
  const recommendations =
    (serpAnalysis.recommendations as Record<string, unknown>[]) || [];
  const serpFeatures = serpAnalysis.serp_features as Record<
    string,
    unknown
  > | null;

  return {
    competitorPatterns: recommendations
      .filter((r: any) => r.type === 'content_format' || r.type === 'structure')
      .map((r: any) => r.recommendation || r.type),
    contentGaps: gaps.map((g: any) => g.description || g.type),
    recommendedTopics: recommendations
      .filter((r: any) => r.type === 'structure' || r.type === 'seo_element')
      .map((r: any) => r.recommendation || r.type)
      .slice(0, 5),
    difficultyScore: serpAnalysis.difficulty_score || 50,
  };
}

/**
 * Extracts brand voice summary
 */
function extractBrandVoiceSummary(
  brandVoice: BrandVoiceAnalysis | null
): BrandVoiceSummary | undefined {
  if (!brandVoice) {
    return undefined;
  }

  const vocab = brandVoice.vocabulary as Record<string, unknown> | null;
  const style = brandVoice.style as Record<string, unknown> | null;

  return {
    tone: brandVoice.tone || [],
    vocabularyLevel: vocab?.complexity_level?.toString() || 'moderate',
    style: style?.type?.toString() || 'informative',
  };
}

/**
 * Generates SEO recommendations
 */
function generateSeoRecommendations(
  keyword: string,
  serpInsights: SerpInsights | undefined,
  contentType: string
): string[] {
  const recommendations = [
    `Include the primary keyword "${keyword}" in the H1 heading`,
    `Use the keyword naturally in the first 100 words`,
    `Include the keyword in at least one H2 heading`,
    `Add a compelling meta description (150-160 characters)`,
  ];

  if (serpInsights) {
    if (serpInsights.contentGaps.length > 0) {
      recommendations.push(
        `Address content gaps: ${serpInsights.contentGaps.slice(0, 2).join(', ')}`
      );
    }
    if (serpInsights.difficultyScore < 40) {
      recommendations.push(
        'Low competition - focus on comprehensive coverage to outrank competitors'
      );
    } else if (serpInsights.difficultyScore > 70) {
      recommendations.push(
        'High competition - consider a unique angle or more specific topic'
      );
    }
  }

  // Content type specific recommendations
  switch (contentType) {
    case 'how_to':
    case 'tutorial':
      recommendations.push(
        'Include step-by-step instructions with clear headings'
      );
      recommendations.push('Add a "Tools/Prerequisites" section');
      break;
    case 'listicle':
      recommendations.push('Use numbered list items for main sections');
      recommendations.push('Add a brief introduction and conclusion');
      break;
    case 'comparison':
      recommendations.push('Include a comparison table summary');
      recommendations.push('Add pros and cons for each item compared');
      break;
    case 'review':
      recommendations.push('Include an overall verdict or rating');
      recommendations.push(
        'Add "Who should buy this" and "Who should avoid" sections'
      );
      break;
  }

  return recommendations;
}

/**
 * Generates an article outline using AI
 *
 * @param request - The outline generation request
 * @returns The generated outline response
 * @throws {OutlineGenerationError} If the request fails
 */
export async function generateArticleOutline(
  request: ArticleOutlineRequest
): Promise<ArticleOutlineResponse> {
  const startTime = Date.now();

  // Validate the request
  validateRequest(request);

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OutlineGenerationError(
      'API_KEY_MISSING',
      'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.'
    );
  }

  // Apply defaults
  const config = {
    ...DEFAULT_OUTLINE_CONFIG,
    ...request,
    contentType: request.contentType || DEFAULT_OUTLINE_CONFIG.contentType,
    detailLevel: request.detailLevel || DEFAULT_OUTLINE_CONFIG.detailLevel,
  };

  // Fetch SERP analysis if enabled
  let serpAnalysis: SerpAnalysisRow | null = null;
  if (config.serpIntegration?.enabled && request.keywordId) {
    serpAnalysis = await getSerpAnalysis(
      request.keywordId,
      request.organizationId
    );
    if (!serpAnalysis && config.serpIntegration?.weight > 0.5) {
      // SERP was requested but not found - warn but continue
      console.warn(
        'SERP analysis requested but not found for keyword:',
        request.keywordId
      );
    }
  }

  // Fetch brand voice if enabled
  let brandVoice: BrandVoiceAnalysis | null = null;
  if (config.brandVoice?.enabled) {
    brandVoice = await getBrandVoiceAnalysis(
      request.organizationId,
      config.brandVoice.sampleId
    );
  }

  // Build context strings
  const serpContext = buildSerpContext(serpAnalysis);
  const brandVoiceContext = buildBrandVoiceContext(brandVoice);

  // Build the user prompt
  const userPrompt = buildOutlinePrompt(
    request,
    serpContext,
    brandVoiceContext
  );

  try {
    // Make the API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: OUTLINE_GENERATION_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || response.statusText);
      const parsed = parseApiError(error);
      throw new OutlineGenerationError(parsed.type, parsed.message, errorData);
    }

    // Parse the response
    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new OutlineGenerationError(
        'API_ERROR',
        'No choices returned from API'
      );
    }

    const content = data.choices[0].message?.content;
    if (!content) {
      throw new OutlineGenerationError(
        'API_ERROR',
        'No content returned from API'
      );
    }

    // Parse the JSON response
    let outline: ArticleOutline;
    try {
      outline = JSON.parse(content) as ArticleOutline;
    } catch (parseError) {
      throw new OutlineGenerationError(
        'API_ERROR',
        'Failed to parse AI response as valid outline JSON',
        parseError
      );
    }

    // Validate outline structure
    if (!outline.h1 || !outline.sections || !Array.isArray(outline.sections)) {
      throw new OutlineGenerationError(
        'API_ERROR',
        'AI response missing required outline structure'
      );
    }

    // Calculate total estimated word count
    const totalEstimatedWordCount = outline.sections.reduce((sum, section) => {
      const sectionWords = section.heading.estimatedWordCount || 0;
      const subsectionWords =
        section.subsections?.reduce(
          (subSum, sub) => subSum + (sub.estimatedWordCount || 0),
          0
        ) || 0;
      return sum + sectionWords + subsectionWords;
    }, outline.h1.estimatedWordCount || 0);

    // Extract insights
    const serpInsights = extractSerpInsights(serpAnalysis);
    const brandVoiceApplied = extractBrandVoiceSummary(brandVoice);
    const seoRecommendations = generateSeoRecommendations(
      request.keyword,
      serpInsights,
      config.contentType
    );

    const generationTime = Date.now() - startTime;

    // Generate ID and create response
    const outlineId = crypto.randomUUID();
    const metadata: OutlineMetadata = {
      model: 'gpt-4o',
      tokensUsed: data.usage?.total_tokens,
      generationTime,
      serpAnalysisId: serpAnalysis?.id,
      brandVoiceSampleId: config.brandVoice?.sampleId,
    };

    // Store in database if we have organization context
    if (request.organizationId) {
      try {
        await storeOutlineInDatabase(
          outlineId,
          request,
          outline,
          serpInsights,
          brandVoiceApplied,
          seoRecommendations,
          totalEstimatedWordCount,
          metadata
        );
      } catch (storageError) {
        console.error('Failed to store outline:', storageError);
        // Don't fail the request if storage fails
      }
    }

    return {
      id: outlineId,
      outline,
      keyword: request.keyword,
      contentType: config.contentType,
      totalEstimatedWordCount,
      serpInsights,
      brandVoiceApplied,
      seoRecommendations,
      createdAt: Date.now(),
      metadata,
    };
  } catch (error) {
    // Re-throw OutlineGenerationErrors as-is
    if (error instanceof OutlineGenerationError) {
      throw error;
    }

    // Parse other errors
    const parsed = parseApiError(error);
    throw new OutlineGenerationError(parsed.type, parsed.message, error);
  }
}

/**
 * Stores the generated outline in the database
 */
async function storeOutlineInDatabase(
  outlineId: string,
  request: ArticleOutlineRequest,
  outline: ArticleOutline,
  serpInsights: SerpInsights | undefined,
  brandVoiceApplied: BrandVoiceSummary | undefined,
  seoRecommendations: string[],
  estimatedWordCount: number,
  metadata: OutlineMetadata
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const insertData = {
    id: outlineId,
    organization_id: request.organizationId,
    product_id: request.productId || null,
    user_id: request.userId || null,
    keyword_id: request.keywordId || null,
    keyword: request.keyword,
    content_type: request.contentType || DEFAULT_OUTLINE_CONFIG.contentType,
    outline: outline as unknown as Json,
    serp_insights: (serpInsights as unknown as Json) || null,
    brand_voice_applied: (brandVoiceApplied as unknown as Json) || null,
    seo_recommendations: seoRecommendations,
    target_word_count: request.targetWordCount || null,
    estimated_word_count: estimatedWordCount,
    status: 'completed' as const,
    error_message: null,
    metadata: metadata as unknown as Json,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from('article_outlines')
    .insert(insertData);

  if (error) {
    throw new OutlineGenerationError(
      'DATABASE_ERROR',
      `Failed to store outline: ${error.message}`,
      error
    );
  }
}

/**
 * Gets a stored outline by ID
 */
export async function getOutline(
  outlineId: string,
  organizationId: string
): Promise<ArticleOutlineResponse | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await (supabase as any)
    .from('article_outlines')
    .select('*')
    .eq('id', outlineId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    outline: data.outline as unknown as ArticleOutline,
    keyword: data.keyword,
    contentType: data.content_type,
    totalEstimatedWordCount: data.estimated_word_count,
    serpInsights: data.serp_insights as unknown as SerpInsights,
    brandVoiceApplied: data.brand_voice_applied as unknown as BrandVoiceSummary,
    seoRecommendations: data.seo_recommendations || [],
    createdAt: new Date(data.created_at).getTime(),
    metadata: (data.metadata || {}) as unknown as OutlineMetadata,
  };
}

/**
 * Lists outlines for an organization
 */
export async function listOrganizationOutlines(
  organizationId: string,
  options: {
    productId?: string;
    keywordId?: string;
    contentType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ArticleOutlineResponse[]> {
  const { limit = 50, offset = 0 } = options;

  const supabase = getSupabaseServerClient();

  let query = (supabase as any)
    .from('article_outlines')
    .select('*')
    .eq('organization_id', organizationId);

  if (options.productId) {
    query = query.eq('product_id', options.productId);
  }
  if (options.keywordId) {
    query = query.eq('keyword_id', options.keywordId);
  }
  if (options.contentType) {
    query = query.eq('content_type', options.contentType);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new OutlineGenerationError(
      'DATABASE_ERROR',
      `Failed to list outlines: ${error.message}`,
      error
    );
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    outline: item.outline as unknown as ArticleOutline,
    keyword: item.keyword,
    contentType: item.content_type,
    totalEstimatedWordCount: item.estimated_word_count,
    serpInsights: item.serp_insights as unknown as SerpInsights,
    brandVoiceApplied: item.brand_voice_applied as unknown as BrandVoiceSummary,
    seoRecommendations: item.seo_recommendations || [],
    createdAt: new Date(item.created_at).getTime(),
    metadata: (item.metadata || {}) as unknown as OutlineMetadata,
  }));
}

/**
 * Deletes an outline
 */
export async function deleteOutline(
  outlineId: string,
  organizationId: string
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await (supabase as any)
    .from('article_outlines')
    .delete()
    .eq('id', outlineId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new OutlineGenerationError(
      'DATABASE_ERROR',
      `Failed to delete outline: ${error.message}`,
      error
    );
  }
}

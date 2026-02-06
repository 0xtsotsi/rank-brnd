// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Article Draft Generator Service
 *
 * Service for generating 1500-3000 word article drafts from outlines using GPT-4.
 *
 * Features:
 * - Keyword density 1-2% (configurable)
 * - Brand voice adherence
 * - Internal link placeholders
 * - SEO optimization
 * - Table of contents generation
 */

import { getSupabaseServerClient } from '../supabase/client';
import type { Database } from '@/types/database';
import type {
  ArticleDraftGenerationRequest,
  ArticleDraftGenerationResponse,
  ArticleDraftMetadata,
  ArticleDraftSEO,
  ArticleDraftGeneratorErrorType,
  BrandVoiceConfig,
  InternalLinkPlaceholder,
  TOCEntry,
} from '@/types/article-draft-generator';
import {
  ArticleDraftGeneratorError,
  DEFAULT_DRAFT_CONFIG,
  DEFAULT_BRAND_VOICE,
  calculateKeywordDensity,
  calculateWordCount,
  calculateReadingTime,
  generateSlug,
  validateDraftRequest,
} from '@/types/article-draft-generator';
import type { BrandVoiceAnalysis } from '@/types/brand-voice-learning';
import { getAggregatedAnalysis } from '../brand-voice/analyzer';

// ============================================================================
// Configuration
// ============================================================================

const SERVICE_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4000,
  minWordCount: 1500,
  maxWordCount: 3000,
  targetWordCount: 2000,
  keywordDensityMin: 0.01,
  keywordDensityMax: 0.02,
  keywordDensityTarget: 0.015,
} as const;

// ============================================================================
// Prompt Templates
// ============================================================================

/**
 * System prompt for article draft generation
 */
const ARTICLE_GENERATION_SYSTEM_PROMPT = `You are an expert SEO content writer with deep knowledge of creating engaging, well-structured articles. Your task is to write comprehensive articles based on provided outlines while adhering to specific style and SEO requirements.

# Content Requirements

1. **Structure**: Follow the provided outline exactly, expanding each section with substantive content.
2. **Word Count**: Write 1500-3000 words total, distributing content appropriately across sections.
3. **Headers**: Use markdown headers (## for H2, ### for H3) for all sections.
4. **Flow**: Ensure smooth transitions between sections and paragraphs.

# SEO Requirements

1. **Keyword Usage**: Naturally incorporate the primary keyword throughout the article at the specified density (1-2%).
2. **Keyword Placement**: Include the keyword in:
   - The first paragraph
   - At least one H2 heading
   - The conclusion
   - Naturally throughout the content (avoid keyword stuffing)
3. **Secondary Keywords**: Weave in secondary keywords where they fit naturally.

# Style Requirements

Match the specified brand voice characteristics:
- **Tone**: Reflect the specified tones (e.g., professional, casual, authoritative)
- **Formality**: Use the specified formality level (formal, informal, neutral)
- **Sentence Structure**: Vary sentence structures as specified
- **Paragraph Length**: Follow the specified paragraph length preference
- **Bullets**: Use bullet points where appropriate for readability

# Internal Links

Include placeholder internal links using the format: [{{ANCHOR_TEXT}}](INTERNAL_LINK:{{TARGET_KEYWORD}}). Place these strategically where readers would benefit from related content.

# Output Format

Return ONLY a valid JSON object with this exact structure:
{
  "title": "SEO-optimized article title",
  "content": "Full article content in markdown format",
  "excerpt": "Compelling 2-3 sentence excerpt",
  "table_of_contents": [
    {"level": 1, "title": "Section Title", "id": "section-id"}
  ],
  "internal_links_used": [
    {"anchor_text": "Link Text", "target_keyword": "target", "placement": "description"}
  ]
}`;

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parses an OpenAI API error response
 */
function parseApiError(error: unknown): {
  type: ArticleDraftGeneratorErrorType;
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
      type: 'GENERATION_FAILED',
      message: `API error: ${error.message}`,
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred during article generation.',
  };
}

/**
 * Validates OpenAI API key is available
 */
function validateApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ArticleDraftGeneratorError(
      'API_KEY_MISSING',
      'OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.'
    );
  }
  return apiKey;
}

// ============================================================================
// Brand Voice Integration
// ============================================================================

/**
 * Fetches brand voice analysis for an organization
 */
async function fetchBrandVoice(
  organizationId: string,
  productId?: string
): Promise<BrandVoiceConfig> {
  try {
    const aggregatedAnalysis = await getAggregatedAnalysis(
      organizationId,
      productId
    );

    if (!aggregatedAnalysis) {
      return DEFAULT_BRAND_VOICE;
    }

    // Convert aggregated analysis to brand voice config
    const dominantTones = Object.entries(aggregatedAnalysis.tone)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tone]) => tone);

    const dominantVocab = Object.entries(aggregatedAnalysis.vocabulary).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const dominantStyle = Object.entries(aggregatedAnalysis.style).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      tone: dominantTones.length > 0 ? dominantTones : DEFAULT_BRAND_VOICE.tone,
      vocabulary: {
        category: dominantVocab?.[0],
        complexity_level: DEFAULT_BRAND_VOICE.vocabulary?.complexity_level,
      },
      style: {
        sentence_structure: DEFAULT_BRAND_VOICE.style?.sentence_structure,
        paragraph_length: DEFAULT_BRAND_VOICE.style?.paragraph_length,
        use_of_bullets: DEFAULT_BRAND_VOICE.style?.use_of_bullets,
      },
    };
  } catch (error) {
    console.error('Error fetching brand voice:', error);
    return DEFAULT_BRAND_VOICE;
  }
}

/**
 * Builds the brand voice instruction string
 */
function buildBrandVoiceInstructions(brandVoice: BrandVoiceConfig): string {
  const instructions: string[] = [];

  if (brandVoice.tone && brandVoice.tone.length > 0) {
    instructions.push(
      `**Tone**: Use a ${brandVoice.tone.join(' yet ')} tone throughout the article.`
    );
  }

  if (brandVoice.formality_level) {
    const formalityMap = {
      formal: 'Use formal language with proper grammar and avoid contractions.',
      informal:
        'Use conversational language with contractions and a relaxed style.',
      neutral: 'Maintain a balanced, professional tone.',
    };
    instructions.push(formalityMap[brandVoice.formality_level]);
  }

  if (brandVoice.vocabulary?.complexity_level) {
    const complexityMap = {
      simple:
        'Use simple, accessible language suitable for a general audience.',
      moderate:
        'Use moderate complexity with some technical terms where appropriate.',
      complex:
        'Use sophisticated language and industry terminology suitable for expert readers.',
      academic:
        'Use academic language with proper citations and formal structure.',
    };
    instructions.push(complexityMap[brandVoice.vocabulary.complexity_level]);
  }

  if (brandVoice.style?.sentence_structure) {
    const structureMap = {
      simple: 'Keep sentences simple and direct.',
      compound: 'Use compound sentences to connect related ideas.',
      complex: 'Use complex sentences to express nuanced ideas.',
      varied: 'Vary sentence structure for engaging flow.',
    };
    instructions.push(structureMap[brandVoice.style.sentence_structure]);
  }

  if (brandVoice.style?.paragraph_length) {
    const lengthMap = {
      short: 'Keep paragraphs short (2-3 sentences) for easy reading.',
      medium: 'Use medium-length paragraphs (4-5 sentences).',
      long: 'Write longer, more developed paragraphs (6+ sentences).',
      varied: 'Vary paragraph length for visual interest and pacing.',
    };
    instructions.push(lengthMap[brandVoice.style.paragraph_length]);
  }

  return instructions.join('\n');
}

// ============================================================================
// SEO Functions
// ============================================================================

/**
 * Builds SEO instruction string
 */
function buildSEOInstructions(
  keyword: string,
  targetDensity: number,
  secondaryKeywords?: string[]
): string {
  const densityPercentage = Math.round(targetDensity * 100);
  const instructions: string[] = [
    `**Primary Keyword**: "${keyword}" - Target density: ${densityPercentage}%`,
  ];

  if (secondaryKeywords && secondaryKeywords.length > 0) {
    instructions.push(
      `**Secondary Keywords**: ${secondaryKeywords.map((k) => `"${k}"`).join(', ')}`
    );
  }

  instructions.push(
    `**Keyword Placement Guidelines**:`,
    `- Include "${keyword}" in the first 100 words`,
    `- Mention "${keyword}" in at least one subheading`,
    `- Use "${keyword}" naturally throughout (aim for ${densityPercentage}% density)`,
    `- Include "${keyword}" in the conclusion`
  );

  return instructions.join('\n');
}

/**
 * Generates meta title from keyword
 */
function generateMetaTitle(keyword: string, maxLength: number = 60): string {
  const templates = [
    `The Ultimate Guide to ${keyword}`,
    `How to Master ${keyword}: Complete Guide`,
    `${keyword}: Everything You Need to Know`,
    `Your Complete ${keyword} Handbook`,
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.length > maxLength
    ? template.substring(0, maxLength - 3) + '...'
    : template;
}

/**
 * Generates meta description
 */
function generateMetaDescription(
  keyword: string,
  maxLength: number = 160
): string {
  const templates = [
    `Discover comprehensive strategies and expert insights on ${keyword}. Learn proven techniques to achieve optimal results in this detailed guide.`,
    `Looking for expert advice on ${keyword}? Our comprehensive guide covers everything you need to know, from basics to advanced strategies.`,
    `Master ${keyword} with our in-depth guide. Expert tips, proven strategies, and actionable insights to help you succeed.`,
  ];

  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.length > maxLength
    ? template.substring(0, maxLength - 3) + '...'
    : template;
}

/**
 * Generates meta keywords array
 */
function generateMetaKeywords(
  keyword: string,
  secondaryKeywords?: string[]
): string[] {
  const baseKeyword = keyword.toLowerCase();
  const keywords = [
    baseKeyword,
    `${baseKeyword} guide`,
    `${baseKeyword} tips`,
    `${baseKeyword} strategies`,
    `how to ${baseKeyword}`,
  ];

  if (secondaryKeywords && secondaryKeywords.length > 0) {
    keywords.push(...secondaryKeywords.map((k) => k.toLowerCase()));
  }

  return [...new Set(keywords)]; // Remove duplicates
}

// ============================================================================
// Content Generation Functions
// ============================================================================

/**
 * Generates the user message for GPT-4
 */
function buildUserMessage(
  request: ArticleDraftGenerationRequest,
  brandVoice: BrandVoiceConfig
): string {
  const {
    keyword,
    outline,
    target_word_count,
    internal_link_placeholders,
    custom_instructions,
    seo_config,
  } = request;

  const keywordDensity =
    seo_config?.keyword_density_target || SERVICE_CONFIG.keywordDensityTarget;

  let message = `# Article Generation Request\n\n`;
  message += `**Primary Keyword**: ${keyword}\n`;
  message += `**Target Word Count**: ${target_word_count || SERVICE_CONFIG.targetWordCount} words\n\n`;

  // Add SEO instructions
  message += `## SEO Instructions\n${buildSEOInstructions(keyword, keywordDensity, seo_config?.secondary_keywords)}\n\n`;

  // Add brand voice instructions
  message += `## Style Guidelines\n${buildBrandVoiceInstructions(brandVoice)}\n\n`;

  // Add outline
  message += `## Article Outline\n\n`;
  outline.forEach((section, index) => {
    message += `${index + 1}. **${section.title}** (${section.wordCount || 200} words)\n`;
    if (section.points && section.points.length > 0) {
      section.points.forEach((point) => {
        message += `   - ${point}\n`;
      });
    }
    message += `\n`;
  });

  // Add internal link placeholders
  if (internal_link_placeholders && internal_link_placeholders.length > 0) {
    message += `## Internal Links to Include\n\n`;
    internal_link_placeholders.forEach((link) => {
      message += `- [${link.anchor_text}] -> Target: ${link.target_keyword} (${link.placement_hint})\n`;
    });
    message += `\n`;
  }

  // Add custom instructions
  if (custom_instructions) {
    message += `## Additional Instructions\n${custom_instructions}\n\n`;
  }

  return message;
}

/**
 * Processes the AI response and extracts article data
 */
function processAIResponse(
  aiContent: string,
  keyword: string,
  brandVoice: BrandVoiceConfig,
  request: ArticleDraftGenerationRequest
): {
  title: string;
  content: string;
  excerpt: string;
  table_of_contents: TOCEntry[];
  internal_links_used: InternalLinkPlaceholder[];
} {
  try {
    const parsed = JSON.parse(aiContent);

    // Generate table of contents from content if not provided
    let toc = parsed.table_of_contents || parsed.tableOfContents || [];
    if (!toc || toc.length === 0) {
      toc = generateTableOfContentsFromContent(parsed.content);
    }

    return {
      title: parsed.title || generateMetaTitle(keyword),
      content: parsed.content || '',
      excerpt: parsed.excerpt || generateExcerptFromContent(parsed.content),
      table_of_contents: toc,
      internal_links_used:
        parsed.internal_links_used || parsed.internalLinksUsed || [],
    };
  } catch (parseError) {
    // If JSON parsing fails, treat the response as markdown content
    const title = generateMetaTitle(keyword);
    const content = aiContent;
    const excerpt = generateExcerptFromContent(content);
    const toc = generateTableOfContentsFromContent(content);

    return {
      title,
      content,
      excerpt,
      table_of_contents: toc,
      internal_links_used: [],
    };
  }
}

/**
 * Generates excerpt from content
 */
function generateExcerptFromContent(
  content: string,
  maxLength: number = 300
): string {
  const firstParagraph = content.split('\n\n')[0].replace(/[#*]/g, '').trim();
  return firstParagraph.length > maxLength
    ? firstParagraph.substring(0, maxLength - 3) + '...'
    : firstParagraph;
}

/**
 * Generates table of contents from markdown content
 */
function generateTableOfContentsFromContent(content: string): TOCEntry[] {
  const toc: TOCEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length - 1; // H2 = 1, H3 = 2
      const title = match[2].trim();
      const id = title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      toc.push({ level, title, id });
    }
  }

  return toc;
}

/**
 * Replaces internal link placeholders with actual markdown links
 */
function processInternalLinks(
  content: string,
  placeholders: InternalLinkPlaceholder[]
): { content: string; linksUsed: InternalLinkPlaceholder[] } {
  const linksUsed: InternalLinkPlaceholder[] = [];

  for (const placeholder of placeholders) {
    const placeholderPattern = `\\[\\{\\{${placeholder.anchor_text}\\}\\}\\]`;
    const linkPattern = `\\[\\{\\{${placeholder.anchor_text}\\}\\}\\]\\(INTERNAL_LINK:${placeholder.target_keyword}\\)`;

    // Check if placeholder exists in content
    if (new RegExp(linkPattern).test(content)) {
      content = content.replace(
        new RegExp(linkPattern, 'g'),
        `[${placeholder.anchor_text}]`
      );
      linksUsed.push(placeholder);
    }
  }

  // Remove any remaining placeholders
  content = content.replace(
    /\[\{\{[^\}]+\}\}\]\(INTERNAL_LINK:[^\)]+\)/g,
    (match) => {
      const anchorMatch = match.match(/\[\{\{(.+?)\}\}\]/);
      return anchorMatch ? `[${anchorMatch[1]}]` : match;
    }
  );

  return { content, linksUsed };
}

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Generates an article draft from an outline using GPT-4
 *
 * @param request - The article draft generation request
 * @returns The generated article draft response
 * @throws {ArticleDraftGeneratorError} If generation fails
 */
export async function generateArticleDraft(
  request: ArticleDraftGenerationRequest
): Promise<ArticleDraftGenerationResponse> {
  const startTime = Date.now();

  // Validate request
  const validation = validateDraftRequest(request);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    throw new ArticleDraftGeneratorError(
      'INVALID_INPUT',
      firstError.message,
      validation.errors
    );
  }

  // Validate API key
  const apiKey = validateApiKey();

  // Fetch brand voice
  const brandVoice =
    request.brand_voice_config ||
    (await fetchBrandVoice(request.organization_id, request.product_id));

  // Build messages
  const userMessage = buildUserMessage(request, brandVoice);

  try {
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SERVICE_CONFIG.model,
        messages: [
          { role: 'system', content: ARTICLE_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: SERVICE_CONFIG.temperature,
        max_tokens: SERVICE_CONFIG.maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error?.message || response.statusText);
      const parsed = parseApiError(error);
      throw new ArticleDraftGeneratorError(
        parsed.type,
        parsed.message,
        errorData
      );
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new ArticleDraftGeneratorError(
        'GENERATION_FAILED',
        'No response from OpenAI API'
      );
    }

    const aiContent = data.choices[0]?.message?.content;
    if (!aiContent) {
      throw new ArticleDraftGeneratorError(
        'GENERATION_FAILED',
        'Empty response from OpenAI API'
      );
    }

    // Process AI response
    const processed = processAIResponse(
      aiContent,
      request.keyword,
      brandVoice,
      request
    );

    // Process internal links
    const { content: finalContent, linksUsed } = processInternalLinks(
      processed.content,
      request.internal_link_placeholders || []
    );

    // Calculate metrics
    const wordCount = calculateWordCount(finalContent);
    const keywordDensity = calculateKeywordDensity(
      finalContent,
      request.keyword
    );
    const readingTime = calculateReadingTime(wordCount);
    const generationTime = Date.now() - startTime;

    // Build SEO data
    const seoConfig = request.seo_config || {
      primary_keyword: request.keyword,
      meta_title_length: DEFAULT_DRAFT_CONFIG.meta_title_length,
      meta_description_length: DEFAULT_DRAFT_CONFIG.meta_description_length,
    };

    const seo: ArticleDraftSEO = {
      meta_title: generateMetaTitle(
        request.keyword,
        seoConfig.meta_title_length
      ),
      meta_description: generateMetaDescription(
        request.keyword,
        seoConfig.meta_description_length
      ),
      meta_keywords: generateMetaKeywords(
        request.keyword,
        seoConfig.secondary_keywords
      ),
      primary_keyword: request.keyword,
      keyword_density: keywordDensity,
      keyword_count: Math.round(keywordDensity * wordCount),
      suggested_slug: generateSlug(processed.title),
    };

    // Build metadata
    const metadata: ArticleDraftMetadata = {
      word_count: wordCount,
      keyword_density: keywordDensity,
      reading_time_minutes: readingTime,
      internal_links_count: linksUsed.length,
      sections_count: request.outline.length,
      generation_time_ms: generationTime,
      model_used: SERVICE_CONFIG.model,
    };

    return {
      title: processed.title,
      slug: seo.suggested_slug,
      content: finalContent,
      excerpt: processed.excerpt,
      seo,
      metadata,
      internal_link_placeholders: linksUsed,
      table_of_contents: processed.table_of_contents,
      brand_voice_applied: brandVoice,
    };
  } catch (error) {
    if (error instanceof ArticleDraftGeneratorError) {
      throw error;
    }
    const parsed = parseApiError(error);
    throw new ArticleDraftGeneratorError(parsed.type, parsed.message, error);
  }
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Saves a generated draft to the database
 */
export async function saveDraftToDatabase(
  organizationId: string,
  request: ArticleDraftGenerationRequest,
  response: ArticleDraftGenerationResponse
): Promise<string> {
  const supabase = getSupabaseServerClient();

  const draftId = crypto.randomUUID();
  const now = new Date().toISOString();

  // For now, save to articles table with draft status
  // In a full implementation, you might want a separate article_drafts table
  const { data, error } = await (supabase as any)
    .from('articles')
    .insert({
      id: draftId,
      organization_id: organizationId,
      product_id: request.product_id || null,
      keyword_id: request.keyword_id || null,
      title: response.title,
      slug: response.slug,
      content: response.content,
      excerpt: response.excerpt,
      status: 'draft',
      word_count: response.metadata.word_count,
      reading_time_minutes: response.metadata.reading_time_minutes,
      meta_title: response.seo.meta_title,
      meta_description: response.seo.meta_description,
      meta_keywords: response.seo.meta_keywords,
      metadata: {
        draft_generation: {
          original_request: request,
          seo: response.seo,
          internal_link_placeholders: response.internal_link_placeholders,
          table_of_contents: response.table_of_contents,
          brand_voice_applied: response.brand_voice_applied,
        },
      } as any,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) {
    throw new ArticleDraftGeneratorError(
      'GENERATION_FAILED',
      `Failed to save draft: ${error.message}`,
      error
    );
  }

  return data.id;
}

/**
 * Lists drafts for an organization
 */
export async function listOrganizationDrafts(
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<Database['public']['Tables']['articles']['Row'][]> {
  const { limit = 20, offset = 0 } = options;

  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('articles')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ArticleDraftGeneratorError(
      'GENERATION_FAILED',
      `Failed to list drafts: ${error.message}`,
      error
    );
  }

  return data || [];
}

/**
 * Gets a draft by ID
 */
export async function getDraftById(
  draftId: string,
  organizationId: string
): Promise<Database['public']['Tables']['articles']['Row'] | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', draftId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new ArticleDraftGeneratorError(
      'GENERATION_FAILED',
      `Failed to get draft: ${error.message}`,
      error
    );
  }

  return data;
}

/**
 * Deletes a draft
 */
export async function deleteDraft(
  draftId: string,
  organizationId: string
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await (supabase as any)
    .from('articles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new ArticleDraftGeneratorError(
      'GENERATION_FAILED',
      `Failed to delete draft: ${error.message}`,
      error
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Analyzes keyword density in existing content
 */
export function analyzeKeywordDensity(
  content: string,
  keyword: string
): {
  density: number;
  count: number;
  totalWords: number;
  inRange: boolean;
  recommendations: string[];
} {
  const totalWords = calculateWordCount(content);
  const keywordLower = keyword.toLowerCase();

  // Count keyword occurrences (exact match and partial matches)
  const words = content.toLowerCase().split(/\s+/);
  const count = words.filter(
    (word) => word.includes(keywordLower) || keywordLower.includes(word)
  ).length;

  const density = count / totalWords;
  const densityPercent = density * 100;

  const inRange =
    density >= SERVICE_CONFIG.keywordDensityMin &&
    density <= SERVICE_CONFIG.keywordDensityMax;

  const recommendations: string[] = [];

  if (density < SERVICE_CONFIG.keywordDensityMin) {
    const needed = Math.round(
      SERVICE_CONFIG.keywordDensityTarget * totalWords - count
    );
    recommendations.push(
      `Keyword density is low (${densityPercent.toFixed(2)}%). Add approximately ${needed} more occurrences of "${keyword}".`
    );
  } else if (density > SERVICE_CONFIG.keywordDensityMax) {
    const excess = Math.round(
      count - SERVICE_CONFIG.keywordDensityTarget * totalWords
    );
    recommendations.push(
      `Keyword density is high (${densityPercent.toFixed(2)}%). Remove approximately ${excess} occurrences of "${keyword}" to avoid keyword stuffing.`
    );
  } else {
    recommendations.push(
      `Keyword density is optimal (${densityPercent.toFixed(2)}%).`
    );
  }

  return {
    density,
    count,
    totalWords,
    inRange,
    recommendations,
  };
}

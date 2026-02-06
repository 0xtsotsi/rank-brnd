/**
 * Keyword Search API Route
 * Handles keyword research and suggestions using DataForSEO API
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  getKeywordMetrics,
  getKeywordSuggestions,
  researchKeyword,
  LocationCodes,
  LanguageCodes,
} from '@/lib/dataforseo';
import { difficultyScoreToLevel } from '@/types/keyword-research';

// ============================================================================
// Schemas
// ============================================================================

/**
 * Search query schema
 */
const searchQuerySchema = z.object({
  keyword: z.string().min(1, 'Keyword is required'),
  location_code: z.coerce.number().int().positive().optional(),
  language_code: z.string().optional(),
  include_suggestions: z.coerce.boolean().optional().default(false),
  suggestion_limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20),
});

/**
 * Bulk research schema
 */
const bulkResearchSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(50),
  location_code: z.coerce.number().int().positive().optional(),
  language_code: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get DataForSEO credentials from environment
 */
function getDataForSEOCredentials(): {
  username: string;
  password: string;
} | null {
  const username = process.env.DATAFORSEO_USERNAME;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

/**
 * Transform metrics to database-compatible format
 */
function transformMetricsToDbFormat(
  metrics: any,
  keyword: string,
  organizationId: string
) {
  return {
    organization_id: organizationId,
    keyword,
    search_volume: metrics.searchVolume,
    difficulty: difficultyScoreToLevel(metrics.difficulty),
    cpc: metrics.cpc,
    competition: metrics.competition,
    opportunity_score: metrics.opportunity,
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/keywords/search
 * Search for a keyword and get its metrics
 * Query params:
 *   - keyword: The keyword to search for
 *   - location_code: Optional location code (default: 2840 for US)
 *   - language_code: Optional language code (default: 'en')
 *   - include_suggestions: Include keyword suggestions (default: false)
 *   - suggestion_limit: Number of suggestions to return (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      keyword: searchParams.get('keyword'),
      location_code: searchParams.get('location_code'),
      language_code: searchParams.get('language_code'),
      include_suggestions: searchParams.get('include_suggestions'),
      suggestion_limit: searchParams.get('suggestion_limit'),
    };

    const validatedParams = searchQuerySchema.parse(queryParams);

    // Check if DataForSEO credentials are configured
    const credentials = getDataForSEOCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'DataForSEO credentials not configured' },
        { status: 503 }
      );
    }

    // Get keyword metrics
    const metrics = await getKeywordMetrics(validatedParams.keyword, {
      locationCode:
        validatedParams.location_code ?? LocationCodes.UNITED_STATES,
      languageCode: validatedParams.language_code ?? LanguageCodes.ENGLISH,
    });

    if (!metrics) {
      return NextResponse.json(
        { error: 'Failed to retrieve keyword data' },
        { status: 500 }
      );
    }

    // Build response
    const response: any = {
      keyword: validatedParams.keyword,
      metrics: {
        search_volume: metrics.searchVolume,
        difficulty: metrics.difficulty,
        difficulty_level: difficultyScoreToLevel(metrics.difficulty),
        opportunity: metrics.opportunity,
        cpc: metrics.cpc,
        competition: metrics.competition,
        trend: metrics.trend,
        backlinks: metrics.backlinks,
        traffic: metrics.traffic,
      },
    };

    // Get suggestions if requested
    if (validatedParams.include_suggestions) {
      try {
        const suggestions = await getKeywordSuggestions(
          validatedParams.keyword,
          {
            locationCode:
              validatedParams.location_code ?? LocationCodes.UNITED_STATES,
            languageCode:
              validatedParams.language_code ?? LanguageCodes.ENGLISH,
          },
          validatedParams.suggestion_limit
        );

        response.suggestions = suggestions.map((suggestion) => ({
          keyword: suggestion.keyword,
          search_volume: suggestion.searchVolume,
          difficulty: suggestion.difficulty,
          difficulty_level: difficultyScoreToLevel(suggestion.difficulty),
          opportunity: suggestion.opportunity,
          cpc: suggestion.cpc,
          competition: suggestion.competition,
        }));
      } catch (error) {
        // Don't fail the whole request if suggestions fail
        console.error('Error getting keyword suggestions:', error);
        response.suggestions = [];
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in keyword search:', error);
    return NextResponse.json(
      { error: 'Failed to search keyword' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keywords/search
 * Research multiple keywords in batch
 * Body:
 *   - keywords: Array of keywords to research
 *   - location_code: Optional location code
 *   - language_code: Optional language code
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkResearchSchema.parse(body);

    // Check if DataForSEO credentials are configured
    const credentials = getDataForSEOCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'DataForSEO credentials not configured' },
        { status: 503 }
      );
    }

    // Import the research function dynamically
    const { researchKeywordsBatch } = await import('@/lib/dataforseo');

    // Research keywords in batch
    const results = await researchKeywordsBatch(validatedData.keywords, {
      locationCode: validatedData.location_code ?? LocationCodes.UNITED_STATES,
      languageCode: validatedData.language_code ?? LanguageCodes.ENGLISH,
    });

    // Transform results
    const transformedResults = results.map((result) => ({
      keyword: result.keyword,
      search_volume: result.metrics.searchVolume,
      difficulty: result.metrics.difficulty,
      difficulty_level: difficultyScoreToLevel(result.metrics.difficulty),
      opportunity: result.metrics.opportunity,
      cpc: result.metrics.cpc,
      competition: result.metrics.competition,
      intent: result.intent,
      recommended: result.recommended,
    }));

    return NextResponse.json({
      keywords: transformedResults,
      total: transformedResults.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in bulk keyword research:', error);
    return NextResponse.json(
      { error: 'Failed to research keywords' },
      { status: 500 }
    );
  }
}

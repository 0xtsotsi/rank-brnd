/**
 * SERP Analyses Utilities
 *
 * Helper functions for working with SERP analyses stored in Supabase.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Json } from '@/types/database';
import type {
  SerpAnalysis,
  SerpAnalysisInsert,
  SerpAnalysisStatus,
  SerpApiResponse,
  SerpAnalysisSummary,
  SerpSearchParams,
} from '@/types/serpapi';
import { extractDomain } from '@/lib/serpapi/client';
import { analyzeSerp } from '@/lib/serpapi/analyzer';

// Define row and update types inline since Database types are marked @ts-nocheck
export interface SerpAnalysisRow {
  id: string;
  organization_id: string;
  product_id: string | null;
  keyword_id: string;
  query: string;
  device: string;
  location: string;
  competitor_urls: string[];
  competitor_domains: string[];
  top_10_results: Json | null;
  gaps: Json;
  serp_features: Json;
  search_volume: number;
  difficulty_score: number | null;
  opportunity_score: number | null;
  status: SerpAnalysisStatus;
  error_message: string | null;
  recommendations: Json;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Json;
}

type SerpAnalysisUpdate = Partial<Omit<SerpAnalysisRow, 'id'>>;

/**
 * Result type for SERP analysis operations
 */
export type SerpAnalysisResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get a SERP analysis by ID
 */
export async function getSerpAnalysisById(
  client: SupabaseClient,
  analysisId: string
): Promise<SerpAnalysisResult<SerpAnalysisRow>> {
  try {
    const { data, error } = await client
      .from('serp_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('SERP analysis not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch SERP analysis',
    };
  }
}

/**
 * Get SERP analyses for a keyword
 */
export async function getKeywordSerpAnalyses(
  client: SupabaseClient,
  keywordId: string,
  options: {
    status?: SerpAnalysisStatus;
    limit?: number;
    sortBy?:
      | 'analyzed_at'
      | 'created_at'
      | 'difficulty_score'
      | 'opportunity_score';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<SerpAnalysisResult<SerpAnalysisRow[]>> {
  try {
    let query = client
      .from('serp_analyses')
      .select('*')
      .eq('keyword_id', keywordId);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const sortColumn = options.sortBy || 'analyzed_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No SERP analyses found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch SERP analyses',
    };
  }
}

/**
 * Get SERP analyses for an organization
 */
export async function getOrganizationSerpAnalyses(
  client: SupabaseClient,
  organizationId: string,
  options: {
    productId?: string;
    status?: SerpAnalysisStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<SerpAnalysisResult<SerpAnalysisRow[]>> {
  try {
    let query = client
      .from('serp_analyses')
      .select('*')
      .eq('organization_id', organizationId);

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        (options.offset || 0) + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No SERP analyses found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch SERP analyses',
    };
  }
}

/**
 * Get the latest completed SERP analysis for a keyword
 */
export async function getLatestSerpAnalysis(
  client: SupabaseClient,
  keywordId: string
): Promise<SerpAnalysisResult<SerpAnalysisRow | null>> {
  try {
    const { data, error } = await client
      .from('serp_analyses')
      .select('*')
      .eq('keyword_id', keywordId)
      .eq('status', 'completed')
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch latest SERP analysis',
    };
  }
}

/**
 * Create a new SERP analysis record (pending status)
 */
export async function createSerpAnalysis(
  client: SupabaseClient,
  analysis: SerpAnalysisInsert
): Promise<SerpAnalysisResult<SerpAnalysisRow>> {
  try {
    const insertData = {
      organization_id: analysis.organization_id,
      product_id: analysis.product_id || null,
      keyword_id: analysis.keyword_id,
      query: analysis.query,
      device: analysis.device || 'desktop',
      location: analysis.location || 'United States',
      competitor_urls: [],
      competitor_domains: [],
      top_10_results: null,
      gaps: {},
      serp_features: {},
      search_volume: analysis.search_volume || 0,
      difficulty_score: null,
      opportunity_score: null,
      status: 'pending' as const,
      error_message: null,
      recommendations: {},
      analyzed_at: null,
      metadata: {},
    };

    const { data, error } = await client
      .from('serp_analyses')
      .insert(insertData as any)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create SERP analysis');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create SERP analysis',
    };
  }
}

/**
 * Update a SERP analysis with results
 */
export async function updateSerpAnalysis(
  client: SupabaseClient,
  analysisId: string,
  updates: SerpAnalysisUpdate
): Promise<SerpAnalysisResult<SerpAnalysisRow>> {
  try {
    const { data, error } = await client
      .from('serp_analyses')
      .update(updates)
      .eq('id', analysisId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('SERP analysis not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update SERP analysis',
    };
  }
}

/**
 * Update SERP analysis status
 */
export async function updateSerpAnalysisStatus(
  client: SupabaseClient,
  analysisId: string,
  status: SerpAnalysisStatus,
  errorMessage?: string
): Promise<SerpAnalysisResult<SerpAnalysisRow>> {
  const updates: SerpAnalysisUpdate = {
    status,
    ...(status === 'completed' && { analyzed_at: new Date().toISOString() }),
    ...(errorMessage && { error_message: errorMessage }),
  };

  return updateSerpAnalysis(client, analysisId, updates);
}

/**
 * Save SERP analysis results from API response
 */
export async function saveSerpAnalysisResults(
  client: SupabaseClient,
  analysisId: string,
  response: SerpApiResponse,
  searchParams: SerpSearchParams
): Promise<SerpAnalysisResult<SerpAnalysisRow>> {
  try {
    // Perform analysis
    const analysis = analyzeSerp(response, searchParams);

    // Extract competitor URLs and domains
    const competitorUrls: string[] = response.organicResults.map((r) => r.link);
    const competitorDomains: string[] = Array.from(
      new Set(response.organicResults.map((r) => extractDomain(r.link)))
    );

    // Prepare SERP features data
    const serpFeatures: Record<string, unknown> = {
      featuredSnippet: response.featuredSnippet || null,
      knowledgeGraph: response.knowledgeGraph || null,
      localResults: response.localResults || null,
      peopleAlsoAsk: response.peopleAlsoAsk || null,
      relatedSearches: response.relatedSearches || null,
    };

    // Prepare gaps data
    const gapsData = analysis.contentGaps.map((gap) => ({
      type: gap.type,
      description: gap.description,
      opportunityScore: gap.opportunityScore,
    }));

    // Prepare recommendations data
    const recommendationsData = analysis.recommendations.map((rec) => ({
      type: rec.type,
      recommendation: rec.recommendation,
      priority: rec.priority,
      basedOn: rec.basedOn,
    }));

    // Calculate opportunity score (inverse of difficulty)
    const opportunityScore = Math.max(0, 100 - analysis.serpDifficulty);

    // Update the analysis record
    const result = await updateSerpAnalysis(client, analysisId, {
      competitor_urls: competitorUrls,
      competitor_domains: competitorDomains,
      top_10_results: response.organicResults as unknown as Json,
      gaps: gapsData as unknown as Json,
      serp_features: serpFeatures as unknown as Json,
      difficulty_score: analysis.serpDifficulty,
      opportunity_score: opportunityScore,
      status: 'completed',
      error_message: null,
      recommendations: recommendationsData as unknown as Json,
      analyzed_at: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to save SERP analysis results',
    };
  }
}

/**
 * Delete a SERP analysis
 */
export async function deleteSerpAnalysis(
  client: SupabaseClient,
  analysisId: string
): Promise<SerpAnalysisResult<void>> {
  try {
    const { error } = await client
      .from('serp_analyses')
      .delete()
      .eq('id', analysisId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete SERP analysis',
    };
  }
}

/**
 * Get SERP analysis statistics for an organization
 */
export async function getSerpAnalysisStats(
  client: SupabaseClient,
  organizationId: string,
  productId?: string
): Promise<
  SerpAnalysisResult<{
    total: number;
    byStatus: Record<SerpAnalysisStatus, number>;
    avgDifficultyScore: number;
    avgOpportunityScore: number;
  }>
> {
  try {
    let query = client
      .from('serp_analyses')
      .select('*')
      .eq('organization_id', organizationId);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          total: 0,
          byStatus: {
            pending: 0,
            analyzing: 0,
            completed: 0,
            failed: 0,
          },
          avgDifficultyScore: 0,
          avgOpportunityScore: 0,
        },
      };
    }

    const byStatus: Record<SerpAnalysisStatus, number> = {
      pending: 0,
      analyzing: 0,
      completed: 0,
      failed: 0,
    };

    let totalDifficultyScore = 0;
    let totalOpportunityScore = 0;
    let scoredCount = 0;

    for (const analysis of data as SerpAnalysisRow[]) {
      const status = analysis.status as SerpAnalysisStatus;
      if (byStatus[status] !== undefined) {
        byStatus[status]++;
      }

      if (analysis.difficulty_score !== null) {
        totalDifficultyScore += analysis.difficulty_score;
        scoredCount++;
      }
      if (analysis.opportunity_score !== null) {
        totalOpportunityScore += analysis.opportunity_score;
      }
    }

    return {
      success: true,
      data: {
        total: data.length,
        byStatus,
        avgDifficultyScore:
          scoredCount > 0 ? totalDifficultyScore / scoredCount : 0,
        avgOpportunityScore:
          scoredCount > 0 ? totalOpportunityScore / scoredCount : 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch SERP analysis stats',
    };
  }
}

/**
 * Check if a user can access a SERP analysis (via organization membership)
 */
export async function canUserAccessSerpAnalysis(
  client: SupabaseClient,
  analysisId: string,
  userId: string
): Promise<boolean> {
  try {
    // First get the analysis to find the organization
    const analysisResult = await getSerpAnalysisById(client, analysisId);
    if (!analysisResult.success) return false;

    // Then check if user is a member of that organization
    const { data, error } = await client
      .from('organization_members')
      .select('id')
      .eq('organization_id', analysisResult.data.organization_id)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Validate SERP analysis data
 */
export function validateSerpAnalysis(analysis: {
  query?: string;
  device?: string;
  location?: string;
  difficulty_score?: number | null;
  opportunity_score?: number | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (analysis.query !== undefined) {
    if (typeof analysis.query !== 'string') {
      errors.push('Query must be a string');
    } else if (analysis.query.length === 0) {
      errors.push('Query cannot be empty');
    } else if (analysis.query.length > 500) {
      errors.push('Query cannot exceed 500 characters');
    }
  }

  if (
    analysis.difficulty_score !== undefined &&
    analysis.difficulty_score !== null
  ) {
    if (typeof analysis.difficulty_score !== 'number') {
      errors.push('Difficulty score must be a number');
    } else if (
      analysis.difficulty_score < 0 ||
      analysis.difficulty_score > 100
    ) {
      errors.push('Difficulty score must be between 0 and 100');
    }
  }

  if (
    analysis.opportunity_score !== undefined &&
    analysis.opportunity_score !== null
  ) {
    if (typeof analysis.opportunity_score !== 'number') {
      errors.push('Opportunity score must be a number');
    } else if (
      analysis.opportunity_score < 0 ||
      analysis.opportunity_score > 100
    ) {
      errors.push('Opportunity score must be between 0 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

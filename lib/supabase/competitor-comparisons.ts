// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Competitor Comparisons Utilities
 * Helper functions for working with competitor ranking comparisons.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type CompetitorComparison =
  Database['public']['Tables']['competitor_comparisons']['Row'];
type CompetitorComparisonInsert =
  Database['public']['Tables']['competitor_comparisons']['Insert'];
type CompetitorComparisonUpdate =
  Database['public']['Tables']['competitor_comparisons']['Update'];

type OpportunityType = 'quick-win' | 'medium-effort' | 'long-term';
type RankTrend = 'up' | 'down' | 'stable';

export type CompetitorComparisonResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface CompetitorRankEntry {
  domain: string;
  rank: number | null;
  url?: string;
}

export interface RankingGap {
  domain: string;
  rank: number;
  gap_size: number;
  opportunity_type: OpportunityType;
}

export async function getCompetitorComparisonById(
  client: SupabaseClient<Database>,
  comparisonId: string
): Promise<CompetitorComparisonResult<CompetitorComparison>> {
  try {
    const { data, error } = await client
      .from('competitor_comparisons')
      .select('*')
      .eq('id', comparisonId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Competitor comparison not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch competitor comparison',
    };
  }
}

export async function getKeywordCompetitorComparison(
  client: SupabaseClient<Database>,
  keywordId: string,
  options: { device?: string; location?: string } = {}
): Promise<CompetitorComparisonResult<CompetitorComparison>> {
  try {
    const { data, error } = await client.rpc(
      'get_keyword_competitor_comparison',
      {
        p_keyword_id: keywordId,
        p_device: options.device || 'desktop',
        p_location: options.location || 'us',
      }
    );

    if (error) throw error;
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error('No competitor comparison found for this keyword');
    }

    const result = Array.isArray(data) ? data[0] : data;
    return { success: true, data: result as CompetitorComparison };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch competitor comparison',
    };
  }
}

export async function getOrganizationCompetitorComparisons(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    productId?: string;
    opportunityType?: OpportunityType;
    quickWinsOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<CompetitorComparisonResult<CompetitorComparison[]>> {
  try {
    const { data, error } = await client.rpc(
      'get_organization_competitor_comparisons',
      {
        p_organization_id: organizationId,
        p_product_id: options.productId || null,
        p_opportunity_type: options.opportunityType || null,
        p_quick_wins_only: options.quickWinsOnly || false,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0,
      }
    );

    if (error) throw error;
    if (!data) throw new Error('No competitor comparisons found');

    return { success: true, data: data as CompetitorComparison[] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch competitor comparisons',
    };
  }
}

export async function getQuickWinOpportunities(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: { productId?: string; limit?: number } = {}
): Promise<CompetitorComparisonResult<CompetitorComparison[]>> {
  try {
    const { data, error } = await client.rpc('get_quick_win_opportunities', {
      p_organization_id: organizationId,
      p_product_id: options.productId || null,
      p_limit: options.limit || 20,
    });

    if (error) throw error;
    if (!data) throw new Error('No quick-win opportunities found');

    return { success: true, data: data as CompetitorComparison[] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch quick-win opportunities',
    };
  }
}

export async function upsertCompetitorComparison(
  client: SupabaseClient<Database>,
  params: {
    organizationId: string;
    productId?: string | null;
    keywordId: string;
    userCurrentRank?: number | null;
    userUrl?: string | null;
    competitorDomains?: string[];
    competitorRanks?: Record<string, { rank: number; url?: string }>;
    competitorUrls?: Record<string, string>;
    opportunityType?: OpportunityType;
    opportunityScore?: number | null;
    device?: string;
    location?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<CompetitorComparisonResult<CompetitorComparison>> {
  try {
    const competitorRanksJson = params.competitorRanks
      ? Object.entries(params.competitorRanks).reduce(
          (acc, [domain, data]) => ({
            ...acc,
            [domain]: { rank: data.rank, ...(data.url && { url: data.url }) },
          }),
          {} as Record<string, unknown>
        )
      : null;

    const { data, error } = await client.rpc('upsert_competitor_comparison', {
      p_organization_id: params.organizationId,
      p_product_id: params.productId || null,
      p_keyword_id: params.keywordId,
      p_user_current_rank: params.userCurrentRank || null,
      p_user_url: params.userUrl || null,
      p_competitor_domains: params.competitorDomains || null,
      p_competitor_ranks: (competitorRanksJson || {}) as Json,
      p_competitor_urls: (params.competitorUrls || {}) as Json,
      p_opportunity_type: params.opportunityType || 'medium-effort',
      p_opportunity_score: params.opportunityScore || null,
      p_device: params.device || 'desktop',
      p_location: params.location || 'us',
      p_metadata: (params.metadata || {}) as Json,
    });

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert competitor comparison');

    return { success: true, data: data as CompetitorComparison };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to upsert competitor comparison',
    };
  }
}

export async function updateCompetitorComparison(
  client: SupabaseClient<Database>,
  comparisonId: string,
  updates: CompetitorComparisonUpdate
): Promise<CompetitorComparisonResult<CompetitorComparison>> {
  try {
    const { data, error } = await client
      .from('competitor_comparisons')
      .update(updates)
      .eq('id', comparisonId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Competitor comparison not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update competitor comparison',
    };
  }
}

export async function deleteCompetitorComparison(
  client: SupabaseClient<Database>,
  comparisonId: string
): Promise<CompetitorComparisonResult<void>> {
  try {
    const { error } = await client
      .from('competitor_comparisons')
      .delete()
      .eq('id', comparisonId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete competitor comparison',
    };
  }
}

export function calculateOpportunityScore(
  userCurrentRank: number | null,
  competitorRanks: Record<string, { rank: number }>,
  searchVolume: number = 0
): number {
  if (
    !userCurrentRank ||
    !competitorRanks ||
    Object.keys(competitorRanks).length === 0
  ) {
    return 0;
  }

  const gaps = Object.values(competitorRanks)
    .filter((c) => c.rank < userCurrentRank)
    .map((c) => userCurrentRank - c.rank);

  if (gaps.length === 0) return 0;

  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const gapScore = Math.max(0, 40 - avgGap * 4);

  let volumeScore = 0;
  if (searchVolume >= 10000) volumeScore = 40;
  else if (searchVolume >= 5000) volumeScore = 32;
  else if (searchVolume >= 1000) volumeScore = 24;
  else if (searchVolume >= 500) volumeScore = 16;
  else if (searchVolume >= 100) volumeScore = 8;
  else volumeScore = 4;

  let positionBonus = 0;
  if (userCurrentRank <= 15) positionBonus = 20;
  else if (userCurrentRank <= 20) positionBonus = 15;
  else if (userCurrentRank <= 30) positionBonus = 10;
  else if (userCurrentRank <= 50) positionBonus = 5;

  return Math.min(100, Math.round(gapScore + volumeScore + positionBonus));
}

export function determineOpportunityType(
  userCurrentRank: number | null,
  competitorRanks: Record<string, { rank: number }>
): OpportunityType {
  if (
    !userCurrentRank ||
    !competitorRanks ||
    Object.keys(competitorRanks).length === 0
  ) {
    return 'long-term';
  }

  const minGap = Object.values(competitorRanks)
    .map((c) =>
      c.rank < userCurrentRank ? userCurrentRank - c.rank : Infinity
    )
    .reduce((min, gap) => Math.min(min, gap), Infinity);

  if (minGap <= 3) return 'quick-win';
  else if (minGap <= 10) return 'medium-effort';
  else return 'long-term';
}

export async function getCompetitorComparisonStats(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId?: string
): Promise<
  CompetitorComparisonResult<{
    total: number;
    byOpportunityType: Record<OpportunityType, number>;
    avgGapToFirstPage: number;
    quickWinCount: number;
    avgOpportunityScore: number;
    rankTrends: Record<RankTrend, number>;
  }>
> {
  try {
    let query = client
      .from('competitor_comparisons')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No competitor comparisons found');

    const byOpportunityType: Record<OpportunityType, number> = {
      'quick-win': 0,
      'medium-effort': 0,
      'long-term': 0,
    };

    const rankTrends: Record<RankTrend, number> = {
      up: 0,
      down: 0,
      stable: 0,
    };

    let totalGapToFirstPage = 0;
    let gapCount = 0;
    let totalOpportunityScore = 0;
    let scoreCount = 0;

    for (const comparison of data) {
      byOpportunityType[comparison.opportunity_type as OpportunityType]++;

      if (comparison.rank_trend) {
        rankTrends[comparison.rank_trend as RankTrend]++;
      }

      if (comparison.gap_to_first_page !== null) {
        totalGapToFirstPage += comparison.gap_to_first_page;
        gapCount++;
      }

      if (comparison.opportunity_score !== null) {
        totalOpportunityScore += comparison.opportunity_score;
        scoreCount++;
      }
    }

    return {
      success: true,
      data: {
        total: data.length,
        byOpportunityType,
        avgGapToFirstPage: gapCount > 0 ? totalGapToFirstPage / gapCount : 0,
        quickWinCount: byOpportunityType['quick-win'],
        avgOpportunityScore:
          scoreCount > 0 ? totalOpportunityScore / scoreCount : 0,
        rankTrends,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch competitor comparison stats',
    };
  }
}

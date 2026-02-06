/**
 * SERP Analysis Stage
 *
 * Fetches and analyzes SERP data for the target keyword.
 * Provides competitive intelligence and content gap analysis.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';
import {
  fetchTop10Results,
  analyzeSerp,
  isSerpApiConfigured,
} from '@/lib/serpapi';

/**
 * Execute SERP analysis stage
 */
export async function executeSerpAnalysis(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const { keyword, options, organizationId, productId } = context;

  // Check if stage should be skipped
  if (options.skipSerpAnalysis) {
    console.log('[Pipeline] Skipping SERP analysis stage');
    return data;
  }

  // Check if SerpAPI is configured
  if (!isSerpApiConfigured()) {
    console.warn('[Pipeline] SerpAPI not configured, skipping SERP analysis');
    return {
      ...data,
      serpAnalysis: {
        query: keyword,
        results: [],
        competitors: [],
        contentGaps: [],
        recommendations: [
          'SerpAPI not configured - add SERPAPI_API_KEY to enable',
        ],
        keywordDifficulty: 50, // Default middle value
      },
    };
  }

  try {
    // Fetch SERP results
    console.log(`[Pipeline] Fetching SERP results for: "${keyword}"`);
    const serpResponse = await fetchTop10Results(keyword, {
      device: options.serpDevice || 'desktop',
      location: options.serpLocation || 'United States',
    });

    // Analyze SERP data
    console.log('[Pipeline] Analyzing SERP data');
    const analysis = analyzeSerp(serpResponse, { query: keyword });

    // Extract competitor content structure
    const competitors =
      (serpResponse as any).organic_results
        ?.slice(0, 10)
        .map((result: any) => ({
          title: result.title || '',
          url: result.link || '',
          snippet: result.snippet || '',
          position: result.position || 0,
        })) || [];

    // Extract content gaps from analysis
    const contentGaps =
      analysis.contentGaps?.map((gap: any) => gap.description) || [];
    const recommendations =
      analysis.recommendations?.map((rec: any) => rec.suggestion) || [];

    return {
      ...data,
      serpAnalysis: {
        query: keyword,
        results: competitors,
        competitors: competitors.map((c: any) => ({
          title: c.title,
          url: c.url,
        })),
        contentGaps,
        recommendations,
        keywordDifficulty: (analysis as any).averageDifficulty || 50,
      },
    };
  } catch (error) {
    console.error('[Pipeline] SERP analysis failed:', error);
    // Don't fail the pipeline, just continue with empty SERP data
    return {
      ...data,
      serpAnalysis: {
        query: keyword,
        results: [],
        competitors: [],
        contentGaps: [],
        recommendations: [],
        keywordDifficulty: 50,
      },
    };
  }
}

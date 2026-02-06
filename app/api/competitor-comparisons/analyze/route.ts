// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Analyze Competitors API Route
 * Triggers competitor analysis for specified keywords using SERP API
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { analyzeCompetitorsSchema } from '@/lib/schemas/competitor-comparisons';
import {
  upsertCompetitorComparison,
  calculateOpportunityScore,
  determineOpportunityType,
} from '@/lib/supabase/competitor-comparisons';
import { ZodError } from 'zod';

/**
 * POST /api/competitor-comparisons/analyze
 * Analyze competitors for specified keywords using SERP data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = analyzeCompetitorsSchema.parse(body);

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const isMember = await isOrganizationMember(
      client,
      validatedData.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    // Fetch keywords to analyze
    const { data: keywords, error: keywordsError } = await client
      .from('keywords')
      .select('id, keyword, organization_id, product_id, search_volume')
      .in('id', validatedData.keyword_ids)
      .eq('organization_id', validatedData.organization_id);

    if (keywordsError) {
      return NextResponse.json(
        { error: 'Failed to fetch keywords', details: keywordsError.message },
        { status: 500 }
      );
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: 'No keywords found to analyze' },
        { status: 404 }
      );
    }

    // For each keyword, we would typically call a SERP API
    // For this implementation, we'll simulate the analysis
    // In production, this would integrate with a SERP API like DataForSEO or SerpAPI

    const analysisResults = await Promise.allSettled(
      keywords.map(async (keyword) => {
        try {
          // Simulate SERP analysis - in production, call actual SERP API here
          const serpResult = await simulateSerpAnalysis(
            keyword.keyword,
            validatedData.device,
            validatedData.location
          );

          // Extract competitor ranks from SERP results
          const competitorRanks: Record<
            string,
            { rank: number; url?: string }
          > = {};
          const competitorDomains: string[] = [];
          const competitorUrls: Record<string, string> = {};

          // Find user's ranking position (simulated - would match domain in production)
          const userDomain = extractUserDomain(keyword); // Helper to get user's domain
          const userRanking = serpResult.results.find(
            (r) => r.domain === userDomain || r.url.includes(userDomain)
          );

          const userCurrentRank = userRanking ? userRanking.rank : null;
          const userUrl = userRanking ? userRanking.url : null;

          // Build competitor data (excluding user's own ranking)
          for (const result of serpResult.results) {
            if (
              result.domain !== userDomain &&
              !result.url.includes(userDomain)
            ) {
              competitorRanks[result.domain] = {
                rank: result.rank,
                url: result.url,
              };
              competitorUrls[result.domain] = result.url;
              if (!competitorDomains.includes(result.domain)) {
                competitorDomains.push(result.domain);
              }
            }
          }

          // Calculate opportunity score and type
          const opportunityScore = calculateOpportunityScore(
            userCurrentRank,
            competitorRanks,
            keyword.search_volume || undefined
          );
          const opportunityType = determineOpportunityType(
            userCurrentRank,
            competitorRanks
          );

          // Upsert the competitor comparison
          const result = await upsertCompetitorComparison(client, {
            organizationId: validatedData.organization_id,
            productId:
              validatedData.product_id || keyword.product_id || undefined,
            keywordId: keyword.id,
            userCurrentRank,
            userUrl,
            competitorDomains,
            competitorRanks,
            competitorUrls,
            opportunityType,
            opportunityScore,
            device: validatedData.device,
            location: validatedData.location,
            metadata: {
              analyzed_at: new Date().toISOString(),
              serp_source: 'simulated', // In production: 'dataforseo' | 'serpapi'
              total_results: serpResult.results.length,
            },
          });

          return {
            keyword_id: keyword.id,
            keyword: keyword.keyword,
            success: result.success,
            data: result.success ? result.data : undefined,
            error: result.success ? undefined : result.error,
          };
        } catch (error) {
          return {
            keyword_id: keyword.id,
            keyword: keyword.keyword,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const successful = analysisResults.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = analysisResults.length - successful;

    return NextResponse.json({
      total: keywords.length,
      successful,
      failed,
      results: analysisResults.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : { status: 'rejected', reason: r.reason }
      ),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error analyzing competitors:', error);
    return NextResponse.json(
      { error: 'Failed to analyze competitors' },
      { status: 500 }
    );
  }
}

/**
 * Simulated SERP analysis function
 * In production, this would call DataForSEO or SerpAPI
 */
async function simulateSerpAnalysis(
  keyword: string,
  device: string,
  location: string
): Promise<{
  results: Array<{ rank: number; domain: string; url: string; title: string }>;
}> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simulated competitors - in production, this would be real SERP data
  const simulatedCompetitors = [
    {
      domain: 'wikipedia.org',
      url: `https://en.wikipedia.org/wiki/${keyword.replace(/\s+/g, '_')}`,
      title: `${keyword} - Wikipedia`,
    },
    {
      domain: 'example.com',
      url: `https://example.com/${keyword.replace(/\s+/g, '-')}`,
      title: `Example: ${keyword}`,
    },
    {
      domain: 'competitor1.com',
      url: `https://competitor1.com/guide/${keyword}`,
      title: `Complete Guide to ${keyword}`,
    },
    {
      domain: 'competitor2.com',
      url: `https://competitor2.com/${keyword}`,
      title: `Best ${keyword} Services`,
    },
    {
      domain: 'competitor3.com',
      url: `https://competitor3.net/articles/${keyword}`,
      title: `${keyword} Explained`,
    },
    {
      domain: 'competitor4.org',
      url: `https://competitor4.org/${keyword}`,
      title: `Understanding ${keyword}`,
    },
    {
      domain: 'competitor5.io',
      url: `https://competitor5.io/${keyword}`,
      title: `${keyword} Resources`,
    },
    {
      domain: 'competitor6.com',
      url: `https://competitor6.com/blog/${keyword}`,
      title: `Blog: ${keyword}`,
    },
    {
      domain: 'competitor7.net',
      url: `https://competitor7.net/${keyword}`,
      title: `Top ${keyword} Tips`,
    },
    {
      domain: 'competitor8.org',
      url: `https://competitor8.org/${keyword}`,
      title: `${keyword} Overview`,
    },
  ];

  return {
    results: simulatedCompetitors.map((c, i) => ({
      rank: i + 1,
      ...c,
    })),
  };
}

/**
 * Extract user domain from keyword data
 * In production, this would come from user's product/site configuration
 */
function extractUserDomain(keyword: any): string {
  // Simulated - would use product.domain or similar in production
  return 'mywebsite.com';
}

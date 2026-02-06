// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Competitor Comparisons API Route
 * Handles CRUD operations for competitor ranking comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  competitorComparisonsQuerySchema,
  createCompetitorComparisonSchema,
  bulkCompetitorComparisonsSchema,
} from '@/lib/schemas/competitor-comparisons';
import {
  getOrganizationCompetitorComparisons,
  upsertCompetitorComparison,
} from '@/lib/supabase/competitor-comparisons';
import { ZodError } from 'zod';

/**
 * GET /api/competitor-comparisons
 * Fetch competitor comparisons with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = {
      organization_id: searchParams.get('organization_id') || undefined,
      product_id: searchParams.get('product_id') || undefined,
      keyword_id: searchParams.get('keyword_id') || undefined,
      opportunity_type:
        (searchParams.get('opportunity_type') as any) || undefined,
      quick_wins_only: searchParams.get('quick_wins_only') === 'true',
      min_gap_to_first_page: searchParams.get('min_gap_to_first_page')
        ? parseInt(searchParams.get('min_gap_to_first_page')!)
        : undefined,
      max_gap_to_first_page: searchParams.get('max_gap_to_first_page')
        ? parseInt(searchParams.get('max_gap_to_first_page')!)
        : undefined,
      min_opportunity_score: searchParams.get('min_opportunity_score')
        ? parseInt(searchParams.get('min_opportunity_score')!)
        : undefined,
      max_opportunity_score: searchParams.get('max_opportunity_score')
        ? parseInt(searchParams.get('max_opportunity_score')!)
        : undefined,
      rank_trend: (searchParams.get('rank_trend') as any) || undefined,
      device: searchParams.get('device') || undefined,
      location: searchParams.get('location') || undefined,
      sort: searchParams.get('sort') || 'opportunity_score',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    };

    const validatedParams = competitorComparisonsQuerySchema.parse(queryParams);

    // organization_id is required
    if (!validatedParams.organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const isMember = await isOrganizationMember(
      client,
      validatedParams.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    // Build query with filters
    let query = client
      .from('competitor_comparisons')
      .select('*', { count: 'exact' })
      .eq('organization_id', validatedParams.organization_id)
      .eq('is_active', true);

    // Apply filters
    if (validatedParams.product_id) {
      query = query.eq('product_id', validatedParams.product_id);
    }

    if (validatedParams.keyword_id) {
      query = query.eq('keyword_id', validatedParams.keyword_id);
    }

    if (validatedParams.opportunity_type) {
      query = query.eq('opportunity_type', validatedParams.opportunity_type);
    }

    if (validatedParams.min_gap_to_first_page !== undefined) {
      query = query.gte(
        'gap_to_first_page',
        validatedParams.min_gap_to_first_page
      );
    }

    if (validatedParams.max_gap_to_first_page !== undefined) {
      query = query.lte(
        'gap_to_first_page',
        validatedParams.max_gap_to_first_page
      );
    }

    if (validatedParams.min_opportunity_score !== undefined) {
      query = query.gte(
        'opportunity_score',
        validatedParams.min_opportunity_score
      );
    }

    if (validatedParams.max_opportunity_score !== undefined) {
      query = query.lte(
        'opportunity_score',
        validatedParams.max_opportunity_score
      );
    }

    if (validatedParams.rank_trend) {
      query = query.eq('rank_trend', validatedParams.rank_trend);
    }

    if (validatedParams.device) {
      query = query.eq('device', validatedParams.device);
    }

    if (validatedParams.location) {
      query = query.eq('location', validatedParams.location);
    }

    // For quick wins, apply additional filter
    if (validatedParams.quick_wins_only) {
      query = query
        .eq('opportunity_type', 'quick-win')
        .lte('gap_to_first_page', 5);
    }

    // Apply sorting
    const sortColumn =
      validatedParams.sort === 'opportunity_score'
        ? 'opportunity_score'
        : validatedParams.sort === 'gap_to_first_page'
          ? 'gap_to_first_page'
          : validatedParams.sort === 'user_current_rank'
            ? 'user_current_rank'
            : validatedParams.sort === 'last_analyzed_at'
              ? 'last_analyzed_at'
              : 'created_at';

    query = query.order(sortColumn, {
      ascending: validatedParams.order === 'asc',
      nullsFirst: false,
    });

    // Apply pagination
    const from = validatedParams.offset;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch competitor comparisons',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comparisons: data || [],
      total: count || 0,
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        total: count || 0,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching competitor comparisons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor comparisons' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/competitor-comparisons
 * Create a new competitor comparison or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const client = getSupabaseServerClient();

    // Check if this is a bulk operation
    const isBulk = body && 'bulk' in body && body.bulk === true;

    if (isBulk) {
      const validatedData = bulkCompetitorComparisonsSchema.safeParse(body);

      if (!validatedData.success) {
        return NextResponse.json(
          {
            error: 'Invalid request body',
            details: validatedData.error.issues,
          },
          { status: 400 }
        );
      }

      const organizationId = validatedData.data.organization_id;
      const comparisons = validatedData.data.comparisons;

      // Verify user is a member
      const isMember = await isOrganizationMember(
        client,
        organizationId,
        userId
      );

      if (!isMember) {
        return NextResponse.json(
          { error: 'Forbidden - Not a member of this organization' },
          { status: 403 }
        );
      }

      // Process each comparison
      const results = await Promise.allSettled(
        comparisons.map((comparison) =>
          upsertCompetitorComparison(client, {
            organizationId,
            productId: validatedData.data.product_id,
            keywordId: comparison.keyword_id,
            userCurrentRank: comparison.user_current_rank,
            userUrl: comparison.user_url,
            competitorDomains: comparison.competitor_domains,
            competitorRanks: comparison.competitor_ranks,
            competitorUrls: comparison.competitor_urls,
            device: comparison.device,
            location: comparison.location,
          })
        )
      );

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;
      const failed = results.length - successful;

      return NextResponse.json({
        total: comparisons.length,
        successful,
        failed,
        results: results.map((r, i) => ({
          keyword_id: comparisons[i].keyword_id,
          success: r.status === 'fulfilled' && r.value.success ? true : false,
          error:
            r.status === 'fulfilled' && !r.value.success
              ? r.value.error
              : r.status === 'rejected'
                ? r.reason?.message || 'Unknown error'
                : undefined,
        })),
      });
    }

    // Single comparison creation
    const validatedData = createCompetitorComparisonSchema.parse(body);

    // Verify user is a member
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

    const result = await upsertCompetitorComparison(client, {
      organizationId: validatedData.organization_id,
      productId: validatedData.product_id,
      keywordId: validatedData.keyword_id,
      userCurrentRank: validatedData.user_current_rank,
      userUrl: validatedData.user_url || undefined,
      competitorDomains: validatedData.competitor_domains,
      competitorRanks: validatedData.competitor_ranks,
      competitorUrls: validatedData.competitor_urls,
      opportunityType: validatedData.opportunity_type,
      opportunityScore: validatedData.opportunity_score,
      device: validatedData.device,
      location: validatedData.location,
      metadata: validatedData.metadata as Record<string, unknown>,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating competitor comparison:', error);
    return NextResponse.json(
      { error: 'Failed to create competitor comparison' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/competitor-comparisons?id=<comparison-id>
 * Soft delete (deactivate) a competitor comparison
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Comparison ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First check if user has access
    const { data: comparison } = await client
      .from('competitor_comparisons')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!comparison) {
      return NextResponse.json(
        { error: 'Competitor comparison not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      comparison.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Soft delete by setting is_active to false
    const { error } = await client
      .from('competitor_comparisons')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete competitor comparison',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting competitor comparison:', error);
    return NextResponse.json(
      { error: 'Failed to delete competitor comparison' },
      { status: 500 }
    );
  }
}

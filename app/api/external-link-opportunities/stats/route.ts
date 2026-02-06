// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * External Link Opportunities Statistics
 * Returns statistics about external link opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { externalLinkOpportunityStatsQuerySchema } from '@/lib/schemas/external-link-opportunities';
import { ZodError } from 'zod';

/**
 * GET /api/external-link-opportunities/stats
 * Get statistics for external link opportunities
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
      article_id: searchParams.get('article_id') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    };

    const validatedParams =
      externalLinkOpportunityStatsQuerySchema.parse(queryParams);

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

    // Build query for statistics
    let query = client
      .from('external_link_opportunities')
      .select('*', { count: 'exact', head: false })
      .eq('organization_id', validatedParams.organization_id)
      .is('deleted_at', null);

    // Apply filters
    if (validatedParams.product_id) {
      query = query.eq('product_id', validatedParams.product_id);
    }

    if (validatedParams.article_id) {
      query = query.eq('article_id', validatedParams.article_id);
    }

    if (validatedParams.date_from) {
      query = query.gte('suggested_at', validatedParams.date_from);
    }

    if (validatedParams.date_to) {
      query = query.lte('suggested_at', validatedParams.date_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics', details: error.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const total = data?.length || 0;
    const pending = data?.filter((d) => d.status === 'pending').length || 0;
    const approved = data?.filter((d) => d.status === 'approved').length || 0;
    const applied = data?.filter((d) => d.status === 'applied').length || 0;
    const rejected = data?.filter((d) => d.status === 'rejected').length || 0;

    // Calculate average relevance score
    const relevanceScores =
      data?.map((d) => d.relevance_score).filter((r) => r !== null) || [];
    const avgRelevance =
      relevanceScores.length > 0
        ? relevanceScores.reduce((sum, r) => sum + (r || 0), 0) /
          relevanceScores.length
        : 0;

    // Count by link type
    const byLinkType = (data || []).reduce(
      (acc, d) => {
        const type = d.link_type || 'external';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      total_opportunities: total,
      pending_opportunities: pending,
      approved_opportunities: approved,
      applied_opportunities: applied,
      rejected_opportunities: rejected,
      avg_relevance_score: Math.round(avgRelevance * 100) / 100,
      by_link_type: byLinkType,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

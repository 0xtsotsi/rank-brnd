// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Quick Wins API Route
 * Returns quick-win opportunities (keywords close to first page with high opportunity score)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { quickWinsQuerySchema } from '@/lib/schemas/competitor-comparisons';
import { getQuickWinOpportunities } from '@/lib/supabase/competitor-comparisons';
import { ZodError } from 'zod';

/**
 * GET /api/competitor-comparisons/quick-wins
 * Fetch quick-win opportunities for an organization
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
      organization_id: searchParams.get('organization_id') || '',
      product_id: searchParams.get('product_id') || undefined,
      max_gap_to_first_page: searchParams.get('max_gap_to_first_page')
        ? parseInt(searchParams.get('max_gap_to_first_page')!)
        : undefined,
      min_opportunity_score: searchParams.get('min_opportunity_score')
        ? parseInt(searchParams.get('min_opportunity_score')!)
        : undefined,
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : undefined,
    };

    const validatedParams = quickWinsQuerySchema.parse(queryParams);

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

    const result = await getQuickWinOpportunities(
      client,
      validatedParams.organization_id,
      {
        productId: validatedParams.product_id,
        limit: validatedParams.limit,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Apply additional client-side filters
    let filteredData = result.data || [];

    if (validatedParams.max_gap_to_first_page !== undefined) {
      filteredData = filteredData.filter(
        (c) =>
          c.gap_to_first_page !== null &&
          c.gap_to_first_page <= validatedParams.max_gap_to_first_page!
      );
    }

    if (validatedParams.min_opportunity_score !== undefined) {
      filteredData = filteredData.filter(
        (c) =>
          c.opportunity_score !== null &&
          c.opportunity_score >= validatedParams.min_opportunity_score!
      );
    }

    return NextResponse.json({
      quick_wins: filteredData,
      total: filteredData.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching quick wins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick-win opportunities' },
      { status: 500 }
    );
  }
}

// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Competitor Comparisons Stats API Route
 * Returns aggregated statistics for competitor comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { getCompetitorComparisonStats } from '@/lib/supabase/competitor-comparisons';

/**
 * GET /api/competitor-comparisons/stats
 * Fetch aggregated statistics for competitor comparisons
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const productId = searchParams.get('product_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const isMember = await isOrganizationMember(client, organizationId, userId);

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    const result = await getCompetitorComparisonStats(
      client,
      organizationId,
      productId || undefined
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching competitor comparison stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor comparison statistics' },
      { status: 500 }
    );
  }
}

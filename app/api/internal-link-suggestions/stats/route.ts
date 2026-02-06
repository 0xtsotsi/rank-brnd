// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Internal Link Statistics API Route
 * Returns statistics about internal link suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';

/**
 * GET /api/internal-link-suggestions/stats
 * Get internal link statistics for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get('organization_id');
    const product_id = searchParams.get('product_id');

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const isMember = await isOrganizationMember(
      client,
      organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get statistics
    const { data, error } = await client.rpc(
      'get_internal_link_suggestion_stats',
      {
        p_org_id: organization_id,
        p_product_id: product_id,
      }
    );

    if (error) {
      console.error('Error fetching stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics', details: error.message },
        { status: 500 }
      );
    }

    const stats = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      total_suggestions: stats?.total_suggestions || 0,
      pending_suggestions: stats?.pending_suggestions || 0,
      approved_suggestions: stats?.approved_suggestions || 0,
      applied_suggestions: stats?.applied_suggestions || 0,
      rejected_suggestions: stats?.rejected_suggestions || 0,
      avg_relevance_score: stats?.avg_relevance_score || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

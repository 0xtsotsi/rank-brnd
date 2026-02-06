// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Activity Logs Stats API Route
 * Handles fetching activity statistics for organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { activityStatsQuerySchema } from '@/lib/schemas/activity-logs';
import { ZodError } from 'zod';

/**
 * GET /api/activity-logs/stats
 * Fetch activity statistics for an organization
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
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
    };

    const validatedParams = activityStatsQuerySchema.parse(queryParams);

    // Verify user is a member of the organization
    const client = getSupabaseServerClient();
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

    // Get activity stats using the database function
    const { data, error } = await client.rpc('get_activity_stats', {
      p_org_id: validatedParams.organization_id,
      p_start_date: validatedParams.start_date || null,
      p_end_date: validatedParams.end_date || null,
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity stats', details: error.message },
        { status: 500 }
      );
    }

    // Group stats by action type for easier consumption
    const statsByAction: Record<string, number> = {};
    const statsByResource: Record<string, number> = {};
    let totalCount = 0;

    for (const stat of data || []) {
      const key = `${stat.action}:${stat.resource_type}`;
      statsByAction[key] = (statsByAction[key] || 0) + stat.count;
      statsByResource[stat.resource_type] =
        (statsByResource[stat.resource_type] || 0) + stat.count;
      totalCount += stat.count;
    }

    return NextResponse.json({
      stats: data || [],
      total: totalCount,
      by_action: statsByAction,
      by_resource_type: statsByResource,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching activity stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity stats' },
      { status: 500 }
    );
  }
}

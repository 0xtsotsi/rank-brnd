/**
 * Resource Activity Logs API Route
 * Handles fetching activity logs for specific resources
 * Route pattern: /api/activity-logs/resource/{resourceType}/{resourceId}
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { ZodError } from 'zod';

/**
 * GET /api/activity-logs/resource/{resourceType}/{resourceId}
 * Fetch activity logs for a specific resource
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string[] }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract resourceType and resourceId from path
    const { resource } = await params;
    const [resourceType, resourceId] = resource;

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: 'Resource type and ID are required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const limit = searchParams.get('limit')
      ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
      : 50;

    const client = getSupabaseServerClient();

    // If organization_id is provided, verify user is a member
    if (organizationId) {
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
    }

    // Build query with filters
    let query = client
      .from('activity_logs')
      .select(
        `
        *,
        user:user_id (
          id,
          name,
          email
        )
      `
      )
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity logs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activity_logs: data || [],
      resource_type: resourceType,
      resource_id: resourceId,
      total: data?.length || 0,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching resource activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

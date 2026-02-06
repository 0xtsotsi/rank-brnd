// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Activity Logs API Route
 * Handles fetching and creating activity logs for organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  activityLogsQuerySchema,
  createActivityLogSchema,
} from '@/lib/schemas/activity-logs';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/activity-logs
 * Fetch activity logs with filtering, sorting, and pagination
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
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
      action: (searchParams.get('action') as any) || undefined,
      resource_type: searchParams.get('resource_type') || undefined,
      user_id: searchParams.get('user_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'timestamp',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
    };

    const validatedParams = activityLogsQuerySchema.parse(queryParams);

    // If organization_id is provided, verify user is a member
    if (validatedParams.organization_id) {
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
    } else {
      // If no organization_id, return error - must filter by organization
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

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
      `,
        { count: 'exact' }
      )
      .eq('organization_id', validatedParams.organization_id);

    // Apply filters
    if (validatedParams.action) {
      query = query.eq('action', validatedParams.action);
    }

    if (validatedParams.resource_type) {
      query = query.eq('resource_type', validatedParams.resource_type);
    }

    if (validatedParams.user_id) {
      query = query.eq('user_id', validatedParams.user_id);
    }

    if (validatedParams.start_date) {
      query = query.gte('timestamp', validatedParams.start_date);
    }

    if (validatedParams.end_date) {
      query = query.lte('timestamp', validatedParams.end_date);
    }

    // Apply sorting
    query = query.order(validatedParams.sort_by, {
      ascending: validatedParams.sort_order === 'asc',
    });

    // Apply pagination
    const from = validatedParams.offset;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity logs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activity_logs: data || [],
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

    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activity-logs
 * Create a new activity log entry
 * Note: This is primarily for internal service use via service role
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createActivityLogSchema.parse(body);

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

    // Create activity log
    const activityLogToInsert: Database['public']['Tables']['activity_logs']['Insert'] =
      {
        organization_id: validatedData.organization_id,
        user_id: validatedData.user_id,
        action: validatedData.action,
        resource_type: validatedData.resource_type,
        resource_id: validatedData.resource_id,
        metadata:
          validatedData.metadata as Database['public']['Tables']['activity_logs']['Insert']['metadata'],
      };

    const { data, error } = await client
      .from('activity_logs')
      .insert(activityLogToInsert)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create activity log', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
}

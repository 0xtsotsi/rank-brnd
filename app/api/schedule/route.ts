// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Schedules API Route
 * Handles CRUD operations for scheduled articles with date/status tracking and RLS checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  schedulesQuerySchema,
  createScheduleSchema,
  updateScheduleSchema,
  deleteScheduleSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas';
import {
  getScheduledArticles,
  getScheduledArticleById,
  scheduleArticle,
  updateScheduledArticle,
  cancelScheduledArticle,
  removeSchedule,
  canUserAccessSchedule,
} from '@/lib/supabase/schedules';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { APIErrors, handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/schedule
 * Fetch all scheduled articles with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      schedulesQuerySchema
    );

    const params = validationResult.success
      ? validationResult.data
      : {
          organization_id:
            request.nextUrl.searchParams.get('organization_id') || undefined,
          product_id:
            request.nextUrl.searchParams.get('product_id') || undefined,
          status: request.nextUrl.searchParams.get('status') || undefined,
          date_from: request.nextUrl.searchParams.get('date_from') || undefined,
          date_to: request.nextUrl.searchParams.get('date_to') || undefined,
          search: request.nextUrl.searchParams.get('search') || undefined,
          limit: request.nextUrl.searchParams.get('limit') || '50',
          offset: request.nextUrl.searchParams.get('offset') || '0',
          sort: request.nextUrl.searchParams.get('sort') || 'scheduled_at',
          order: request.nextUrl.searchParams.get('order') || 'asc',
        };

    if (!params || !params.organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', params!.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const result = await getScheduledArticles(client, params!.organization_id, {
      productId: params!.product_id,
      status: params!.status as any,
      dateFrom: params!.date_from,
      dateTo: params!.date_to,
      search: params!.search,
      limit: params!.limit ? Number(params!.limit) : 50,
      offset: params!.offset ? Number(params!.offset) : 0,
      sortBy: params!.sort as any,
      sortOrder: params!.order as any,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      schedules: result.data,
      total: result.data.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/schedule');
  }
}

/**
 * POST /api/schedule
 * Create a new schedule for an article
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, createScheduleSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    // Verify user has access to the article
    const hasAccess = await canUserAccessSchedule(
      client,
      validationResult.data.article_id,
      userId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this article' },
        { status: 403 }
      );
    }

    // Validate scheduled date is in the future
    const scheduledDate = new Date(validationResult.data.scheduled_at);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    const result = await scheduleArticle(
      client,
      validationResult.data.article_id,
      validationResult.data.scheduled_at,
      {
        status: validationResult.data.status,
        recurrence: validationResult.data.recurrence,
        recurrenceEndDate: validationResult.data.recurrence_end_date,
        notes: validationResult.data.notes,
        metadata: validationResult.data.metadata,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'POST /api/schedule');
  }
}

/**
 * PUT /api/schedule
 * Update a scheduled article
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, updateScheduleSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { id, organization_id, ...updates } = body as {
      id: string;
      organization_id: string;
    };

    if (!id || !organization_id) {
      return NextResponse.json(
        { error: 'id and organization_id are required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user has access to the article
    const hasAccess = await canUserAccessSchedule(client, id, userId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this schedule' },
        { status: 403 }
      );
    }

    // If updating scheduled date, validate it's in the future
    if (updates.scheduled_at) {
      const scheduledDate = new Date(updates.scheduled_at);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled date must be in the future' },
          { status: 400 }
        );
      }
    }

    const result = await updateScheduledArticle(
      client,
      id,
      organization_id,
      updates
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'PUT /api/schedule');
  }
}

/**
 * DELETE /api/schedule
 * Delete/remove a schedule (does not delete the article)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      deleteScheduleSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    const client = getSupabaseServerClient();

    // Verify user has access to the article
    const hasAccess = await canUserAccessSchedule(client, id, userId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this schedule' },
        { status: 403 }
      );
    }

    // Get organization_id from the article
    const { data: article } = await client
      .from('articles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!article) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Check if user has admin or owner role
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (article as any).organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only organization owners and admins can delete schedules' },
        { status: 403 }
      );
    }

    const result = await removeSchedule(
      client,
      id,
      (article as any).organization_id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/schedule');
  }
}

/**
 * Schedule Article for Publishing API Route
 *
 * Handles scheduling articles for publishing with timezone support.
 * Converts client timezone to UTC for storage in the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  scheduleArticleForPublishingSchema,
  rescheduleArticleSchema,
  getScheduledArticlesSchema,
  validateRequest,
} from '@/lib/schemas';
import { queueArticleForPublishing } from '@/lib/supabase/publishing-queue';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';
import { toUTC, fromUTC, formatRelativeTime } from '@/lib/publishing/timezone';
import type { Json } from '@/types/database';

/**
 * POST /api/publishing-queue/schedule
 *
 * Schedule an article for publishing at a specific time.
 * Converts the provided scheduled_for time from the user's timezone to UTC.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(
      body,
      scheduleArticleForPublishingSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error || 'Validation failed' },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const client = getSupabaseServerClient();

    // Convert the scheduled time from user's timezone to UTC
    const scheduledForUTC = toUTC(data.scheduled_for, data.timezone || 'UTC');

    // Validate that the scheduled time is in the future
    const scheduledDate = new Date(scheduledForUTC);
    const now = new Date();
    if (scheduledDate <= now) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Queue the article with the UTC scheduled time
    const result = await queueArticleForPublishing(
      client,
      data.organization_id,
      data.article_id,
      data.platform,
      {
        integrationId: data.integration_id,
        priority: data.priority,
        scheduledFor: scheduledForUTC,
        productId: data.product_id,
      }
    );

    if (!result.success) {
      const errorResult = result as { success: false; error: string };
      return NextResponse.json({ error: errorResult.error }, { status: 500 });
    }

    const successResult = result as { success: true; data: any };

    // Add timezone metadata to the item
    await (client as any)
      .from('publishing_queue')
      .update({
        metadata: {
          timezone: data.timezone || 'UTC',
          scheduled_in_local: data.scheduled_for,
        } as Json,
      })
      .eq('id', successResult.data.id);

    // Return the result with the formatted scheduled time
    return NextResponse.json(
      {
        ...successResult.data,
        scheduled_for_display: formatDateInUserTimezone(
          scheduledForUTC,
          data.timezone || 'UTC'
        ),
        relative_time: formatRelativeTime(scheduledDate, now),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error, 'POST /api/publishing-queue/schedule');
  }
}

/**
 * GET /api/publishing-queue/schedule
 *
 * Get all scheduled articles for an organization.
 * Returns times in the user's timezone if provided.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const timezone = searchParams.get('timezone') || 'UTC';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Build query for scheduled items
    let query = client
      .from('publishing_queue')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .not('scheduled_for', 'is', null)
      .gte('scheduled_for', new Date().toISOString());

    // Apply optional filters
    const productId = searchParams.get('product_id');
    if (productId) {
      query = query.eq('product_id', productId);
    }

    const platform = searchParams.get('platform');
    if (platform) {
      query = query.eq('platform', platform);
    }

    const dateFrom = searchParams.get('date_from');
    if (dateFrom) {
      query = query.gte('scheduled_for', dateFrom);
    }

    const dateTo = searchParams.get('date_to');
    if (dateTo) {
      query = query.lte('scheduled_for', dateTo);
    }

    query = query.order('scheduled_for', { ascending: true });

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to include timezone-aware display times
    const items = (data || []).map((item: any) => {
      const scheduledDate = new Date(item.scheduled_for);
      return {
        ...item,
        scheduled_for_display: formatDateInUserTimezone(
          item.scheduled_for,
          timezone
        ),
        relative_time: formatRelativeTime(scheduledDate, new Date()),
      };
    });

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
      total: count || 0,
      timezone,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/publishing-queue/schedule');
  }
}

/**
 * PUT /api/publishing-queue/schedule
 *
 * Reschedule an article to a new time.
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, rescheduleArticleSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error || 'Validation failed' },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const client = getSupabaseServerClient();

    // Convert the scheduled time from user's timezone to UTC
    const scheduledForUTC = toUTC(data.scheduled_for, data.timezone || 'UTC');

    // Validate that the scheduled time is in the future
    const scheduledDate = new Date(scheduledForUTC);
    const now = new Date();
    if (scheduledDate <= now) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Update the scheduled time
    const { data: item, error } = await (client as any)
      .from('publishing_queue')
      .update({
        scheduled_for: scheduledForUTC,
        status: 'pending',
        metadata: {
          timezone: data.timezone || 'UTC',
          scheduled_in_local: data.scheduled_for,
          rescheduled_at: new Date().toISOString(),
          rescheduled_by: userId,
        } as Json,
      })
      .eq('id', data.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...item,
      scheduled_for_display: formatDateInUserTimezone(
        scheduledForUTC,
        data.timezone || 'UTC'
      ),
      relative_time: formatRelativeTime(scheduledDate, now),
    });
  } catch (error) {
    return handleAPIError(error, 'PUT /api/publishing-queue/schedule');
  }
}

/**
 * DELETE /api/publishing-queue/schedule
 *
 * Cancel a scheduled article.
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
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    // Cancel by updating status to cancelled
    const { error } = await (client as any)
      .from('publishing_queue')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/publishing-queue/schedule');
  }
}

/**
 * Format a UTC date for display in user's timezone
 */
function formatDateInUserTimezone(utcDate: string, timezone: string): string {
  const dateInTz = fromUTC(utcDate, timezone);
  const year = dateInTz.getFullYear();
  const month = String(dateInTz.getMonth() + 1).padStart(2, '0');
  const day = String(dateInTz.getDate()).padStart(2, '0');
  const hours = String(dateInTz.getHours()).padStart(2, '0');
  const minutes = String(dateInTz.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Drag-Drop Scheduling API Route
 * Handles article rescheduling via calendar drag-drop interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dragDropRescheduleSchema, validateRequest } from '@/lib/schemas';
import {
  updateScheduledArticle,
  scheduleArticle,
  canUserAccessSchedule,
} from '@/lib/supabase/schedules';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/schedule/drag-drop
 * Reschedule an article via drag-drop on the calendar
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, dragDropRescheduleSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { article_id, scheduled_at, organization_id, source_date } =
      validationResult.data;
    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Verify user has access to the article
    const hasAccess = await canUserAccessSchedule(client, article_id, userId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this article' },
        { status: 403 }
      );
    }

    // Validate scheduled date is in the future
    const scheduledDate = new Date(scheduled_at);
    const now = new Date();

    // Allow same-day scheduling if time is in the future
    if (scheduledDate <= now) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    // Get the article to check if it already has a schedule
    const { data: article } = await client
      .from('articles')
      .select('id, scheduled_at, organization_id')
      .eq('id', article_id)
      .eq('organization_id', organization_id)
      .single();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Use source_date for tracking in metadata
    const metadata = {
      drag_drop_reschedule: true,
      source_date: source_date || article.scheduled_at,
      rescheduled_at: now.toISOString(),
      rescheduled_by: userId,
    };

    let result;
    if (article.scheduled_at) {
      // Article already has a schedule, update it
      result = await updateScheduledArticle(
        client,
        article_id,
        organization_id,
        {
          scheduled_at,
          notes: `Rescheduled from calendar (drag-drop)`,
          metadata,
        }
      );
    } else {
      // Article doesn't have a schedule yet, create one
      result = await scheduleArticle(client, article_id, scheduled_at, {
        status: 'scheduled',
        notes: 'Scheduled from calendar (drag-drop)',
        metadata,
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Article rescheduled successfully',
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/schedule/drag-drop');
  }
}

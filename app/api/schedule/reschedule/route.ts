// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Reschedule API Route
 * Reschedules an article to a new date/time
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rescheduleSchema, validateRequest } from '@/lib/schemas';
import {
  updateScheduledArticle,
  canUserAccessSchedule,
} from '@/lib/supabase/schedules';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/schedule/reschedule
 * Reschedule an article to a new date/time
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, rescheduleSchema);

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
      validationResult.data.id,
      userId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this schedule' },
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

    // Get organization_id from the article
    const { data: article } = await client
      .from('articles')
      .select('organization_id')
      .eq('id', validationResult.data.id)
      .single();

    if (!article) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Store the reason in metadata notes
    const metadata = {
      reschedule_reason: validationResult.data.reason,
    };

    const result = await updateScheduledArticle(
      client,
      validationResult.data.id,
      (article as any).organization_id,
      {
        scheduled_at: validationResult.data.scheduled_at,
        notes: validationResult.data.reason,
        metadata,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Article rescheduled successfully',
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/schedule/reschedule');
  }
}

// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Cancel Schedule API Route
 * Cancels a scheduled article (removes schedule but keeps the article)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cancelScheduleSchema, validateRequest } from '@/lib/schemas';
import {
  cancelScheduledArticle,
  canUserAccessSchedule,
} from '@/lib/supabase/schedules';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/schedule/cancel
 * Cancel a scheduled article
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, cancelScheduleSchema);

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

    const result = await cancelScheduledArticle(
      client,
      validationResult.data.id,
      (article as any).organization_id,
      validationResult.data.reason
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule cancelled successfully',
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/schedule/cancel');
  }
}

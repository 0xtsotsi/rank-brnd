// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Bulk Update Schedules API Route
 * Handles bulk operations on scheduled articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { bulkUpdateSchedulesSchema, validateRequest } from '@/lib/schemas';
import { bulkUpdateSchedules } from '@/lib/supabase/schedules';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/schedule/bulk
 * Bulk update scheduled articles
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, bulkUpdateSchedulesSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    // Get organization_id from the first schedule
    const { data: firstArticle } = await client
      .from('articles')
      .select('organization_id')
      .eq('id', validationResult.data.schedule_ids[0])
      .single();

    if (!firstArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const organizationId = (firstArticle as any).organization_id;

    // Verify user is an admin or owner
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json(
        {
          error:
            'Only organization owners and admins can bulk update schedules',
        },
        { status: 403 }
      );
    }

    // Validate scheduled date is in the future if provided
    if (validationResult.data.scheduled_at) {
      const scheduledDate = new Date(validationResult.data.scheduled_at);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled date must be in the future' },
          { status: 400 }
        );
      }
    }

    const result = await bulkUpdateSchedules(
      client,
      validationResult.data.schedule_ids,
      organizationId,
      {
        scheduled_at: validationResult.data.scheduled_at,
        status: validationResult.data.status,
        notes: validationResult.data.notes,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'POST /api/schedule/bulk');
  }
}

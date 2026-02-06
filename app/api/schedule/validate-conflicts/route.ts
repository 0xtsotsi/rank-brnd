// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Validate Scheduling Conflicts API Route
 * Validates if an article can be scheduled at a given date without conflicts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateConflictsSchema, validateRequest } from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/schedule/validate-conflicts
 * Check if scheduling an article at a given date would cause conflicts
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, validateConflictsSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { article_id, scheduled_at, organization_id } = validationResult.data;
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

    // Validate scheduled date is in the future
    const scheduledDate = new Date(scheduled_at);
    const now = new Date();

    if (scheduledDate <= now) {
      return NextResponse.json({
        valid: false,
        hasConflicts: true,
        conflicts: [
          {
            type: 'past_date',
            message: 'Scheduled date must be in the future',
          },
        ],
      });
    }

    // Get the article to check if it's already scheduled
    const { data: article } = await client
      .from('articles')
      .select('id, scheduled_at, title')
      .eq('id', article_id)
      .eq('organization_id', organization_id)
      .single();

    if (!article) {
      return NextResponse.json({
        valid: false,
        hasConflicts: true,
        conflicts: [
          {
            type: 'article_not_found',
            message: 'Article not found',
          },
        ],
      });
    }

    // Check for other articles scheduled at the same time (same day)
    const startOfDay = new Date(scheduledDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(scheduledDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const { data: sameDayArticles } = await client
      .from('articles')
      .select('id, title, scheduled_at')
      .eq('organization_id', organization_id)
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .not('id', 'eq', article_id) // Exclude the current article
      .is('deleted_at', null)
      .limit(10);

    const conflicts: Array<{
      type: string;
      message: string;
      article_id?: string;
      article_title?: string;
    }> = [];

    // Check for same-day scheduling conflicts (optional warning)
    if (sameDayArticles && sameDayArticles.length > 0) {
      conflicts.push({
        type: 'same_day_scheduled',
        message: `${sameDayArticles.length} other article(s) already scheduled for this day`,
      });
    }

    return NextResponse.json({
      valid: conflicts.length === 0,
      hasConflicts: conflicts.length > 0,
      conflicts,
      article: {
        id: article.id,
        title: article.title,
        currently_scheduled_at: article.scheduled_at,
        new_scheduled_at: scheduled_at,
      },
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/schedule/validate-conflicts');
  }
}

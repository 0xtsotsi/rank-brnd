/**
 * Fail Publishing Queue Item API Route
 * Handles marking publishing items as failed (typically called by webhooks or background jobs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  markPublishingQueueItemFailedSchema,
  validateRequest,
} from '@/lib/schemas';
import { markPublishingItemFailed } from '@/lib/supabase/publishing-queue';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/publishing-queue/fail
 * Mark a publishing item as failed
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
      markPublishingQueueItemFailedSchema
    );

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    // Verify access to the item's organization
    const { data: queueItem } = await client
      .from('publishing_queue')
      .select('organization_id')
      .eq('id', validationResult.data.id)
      .single();

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (queueItem as any).organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await markPublishingItemFailed(
      client,
      validationResult.data.id,
      validationResult.data.error_message,
      validationResult.data.error_type
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'POST /api/publishing-queue/fail');
  }
}

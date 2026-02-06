/**
 * Queue Article for Publishing API Route
 * Handles queueing articles for publishing to CMS platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  queueArticleForPublishingSchema,
  validateRequest,
} from '@/lib/schemas';
import { queueArticleForPublishing } from '@/lib/supabase/publishing-queue';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/publishing-queue/queue
 * Queue an article for publishing
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
      queueArticleForPublishingSchema
    );

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    const result = await queueArticleForPublishing(
      client,
      validationResult.data.organization_id,
      validationResult.data.article_id,
      validationResult.data.platform,
      {
        integrationId: validationResult.data.integration_id,
        priority: validationResult.data.priority,
        scheduledFor: validationResult.data.scheduled_for,
        productId: validationResult.data.product_id,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'POST /api/publishing-queue/queue');
  }
}

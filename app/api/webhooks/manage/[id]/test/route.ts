/**
 * Test Webhook API Route
 * Sends a test event to a webhook endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { getWebhookById } from '@/lib/supabase/webhooks';
import { deliverWebhook, generateEventId } from '@/lib/webhooks/delivery';
import { handleAPIError } from '@/lib/api-error-handler';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/webhooks/manage/[id]/test
 * Send a test event to the webhook
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const webhookId = params.id;

    const body = await request.json();
    const eventType = body.event_type || 'article.published';

    const client = getSupabaseServerClient();

    // Get webhook with secret
    const { data: webhookWithSecret } = await client
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (!webhookWithSecret) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Verify user is an admin or owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (webhookWithSecret as any).organization_id)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Only organization admins and owners can test webhooks' },
        { status: 403 }
      );
    }

    // Create test payload
    const testPayload = body.test_payload || {
      article_id: generateEventId(),
      title: 'Test Article',
      slug: 'test-article',
      status: 'published',
      published_at: new Date().toISOString(),
      scheduled_at: null,
      author_id: userId,
      product_id: null,
      keyword_id: null,
    };

    // Deliver test webhook
    const result = await deliverWebhook(
      webhookWithSecret as any,
      eventType,
      testPayload,
      client
    );

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? 'Test webhook delivered successfully'
        : `Test webhook failed: ${result.error}`,
      error: result.error,
      statusCode: result.statusCode,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/webhooks/manage/[id]/test');
  }
}

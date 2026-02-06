/**
 * Webhook Delivery Logs API Route
 * Fetches delivery logs for a webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { queryDeliveryLogsSchema, validateQueryParams } from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getWebhookById,
  getWebhookDeliveryLogs,
} from '@/lib/supabase/webhooks';
import { handleAPIError } from '@/lib/api-error-handler';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/webhooks/manage/[id]/logs
 * Fetch delivery logs for a webhook
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const webhookId = params.id;

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      queryDeliveryLogsSchema
    );

    const client = getSupabaseServerClient();

    // Get webhook to verify access
    const webhookResult = await getWebhookById(client, webhookId);

    if (!webhookResult.success) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const webhook = webhookResult.data;

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', webhook.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query options
    const options = validationResult.success
      ? validationResult.data
      : {
          webhook_id: webhookId,
          limit: request.nextUrl.searchParams.get('limit')
            ? Number(request.nextUrl.searchParams.get('limit'))
            : 50,
          offset: request.nextUrl.searchParams.get('offset')
            ? Number(request.nextUrl.searchParams.get('offset'))
            : 0,
        };

    const result = await getWebhookDeliveryLogs(client, webhookId, options);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      logs: result.data,
      total: result.data.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/webhooks/manage/[id]/logs');
  }
}

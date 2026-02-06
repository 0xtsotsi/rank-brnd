/**
 * Regenerate Webhook Secret API Route
 * Regenerates the webhook secret for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getWebhookById,
  regenerateWebhookSecret,
} from '@/lib/supabase/webhooks';
import { handleAPIError } from '@/lib/api-error-handler';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/webhooks/manage/[id]/regenerate-secret
 * Regenerate webhook secret
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const webhookId = params.id;

    const client = getSupabaseServerClient();

    // Get webhook to verify ownership
    const webhookResult = await getWebhookById(client, webhookId);

    if (!webhookResult.success) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const webhook = webhookResult.data;

    // Verify user is an admin or owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', webhook.organization_id)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        {
          error:
            'Only organization admins and owners can regenerate webhook secrets',
        },
        { status: 403 }
      );
    }

    const result = await regenerateWebhookSecret(client, webhookId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      secret: result.data.secret,
      message:
        'Webhook secret regenerated successfully. Please update your integration immediately.',
    });
  } catch (error) {
    return handleAPIError(
      error,
      'POST /api/webhooks/manage/[id]/regenerate-secret'
    );
  }
}

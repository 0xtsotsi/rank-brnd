/**
 * Single Webhook API Route
 * Handles operations on individual webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getWebhookById,
  deleteWebhook as deleteWebhookRecord,
} from '@/lib/supabase/webhooks';
import { handleAPIError } from '@/lib/api-error-handler';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/webhooks/manage/[id]
 * Get a single webhook by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const webhookId = params.id;

    const client = getSupabaseServerClient();

    const result = await getWebhookById(client, webhookId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const webhook = result.data;

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

    // Return webhook without the secret
    const { secret, ...webhookWithoutSecret } = webhook as any;

    return NextResponse.json(webhookWithoutSecret);
  } catch (error) {
    return handleAPIError(error, 'GET /api/webhooks/manage/[id]');
  }
}

/**
 * DELETE /api/webhooks/manage/[id]
 * Delete a webhook
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const webhookId = params.id;

    const client = getSupabaseServerClient();

    // Get webhook to verify ownership
    const { data: webhook } = await client
      .from('webhooks')
      .select('organization_id')
      .eq('id', webhookId)
      .single();

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Verify user is an owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (webhook as any).organization_id)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Only organization owners can delete webhooks' },
        { status: 403 }
      );
    }

    const result = await deleteWebhookRecord(client, webhookId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/webhooks/manage/[id]');
  }
}

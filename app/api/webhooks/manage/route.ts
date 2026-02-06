/**
 * Webhooks API Route
 * Handles CRUD operations for webhook management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createWebhookSchema,
  queryWebhooksSchema,
  updateWebhookSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas';
import {
  getOrganizationWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook as deleteWebhookRecord,
  regenerateWebhookSecret,
} from '@/lib/supabase/webhooks';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/webhooks/manage
 * Fetch all webhooks for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      queryWebhooksSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { organization_id, status, event_type } = validationResult.data;

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await getOrganizationWebhooks(
      client,
      String(organization_id),
      {
        status,
        event_type,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      webhooks: result.data,
      total: result.data.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/webhooks/manage');
  }
}

/**
 * POST /api/webhooks/manage
 * Create a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, createWebhookSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { organization_id, ...webhookData } = validationResult.data;

    const client = getSupabaseServerClient();

    // Verify user is an admin or owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Only organization admins and owners can create webhooks' },
        { status: 403 }
      );
    }

    const result = await createWebhook(client, {
      organization_id: String(organization_id),
      ...webhookData,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return webhook without the secret
    const { secret, ...webhookWithoutSecret } = result.data as any;

    return NextResponse.json(
      {
        webhook: webhookWithoutSecret,
        secret: webhookData.secret ? secret : undefined, // Only show secret if user provided one
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error, 'POST /api/webhooks/manage');
  }
}

/**
 * PATCH /api/webhooks/manage
 * Update a webhook
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, updateWebhookSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { id, ...updates } = validationResult.data;

    const client = getSupabaseServerClient();

    // Get webhook to verify ownership
    const { data: webhook } = await client
      .from('webhooks')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Verify user is an admin or owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', String((webhook as any).organization_id))
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Only organization admins and owners can update webhooks' },
        { status: 403 }
      );
    }

    const result = await updateWebhook(client, String(id), updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return webhook without the secret
    const { secret, ...webhookWithoutSecret } = result.data as any;

    return NextResponse.json(webhookWithoutSecret);
  } catch (error) {
    return handleAPIError(error, 'PATCH /api/webhooks/manage');
  }
}

/**
 * DELETE /api/webhooks/manage
 * Delete a webhook
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Get webhook to verify ownership
    const { data: webhook } = await client
      .from('webhooks')
      .select('organization_id')
      .eq('id', id)
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

    const result = await deleteWebhookRecord(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/webhooks/manage');
  }
}

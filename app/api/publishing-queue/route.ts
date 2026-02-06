/**
 * Publishing Queue API Route
 * Handles CRUD operations for the publishing queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  publishingQueueQuerySchema,
  createPublishingQueueItemSchema,
  updatePublishingQueueItemSchema,
  deletePublishingQueueItemSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas';
import {
  getOrganizationPublishingQueue,
  createPublishingQueueItem,
  updatePublishingQueueItem,
  softDeletePublishingQueueItem,
  getPublishingQueueStats,
} from '@/lib/supabase/publishing-queue';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/publishing-queue
 * Fetch all publishing queue items with optional filtering
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
      publishingQueueQuerySchema
    );

    const params = validationResult.success
      ? validationResult.data
      : {
          organization_id:
            request.nextUrl.searchParams.get('organization_id') || undefined,
          product_id:
            request.nextUrl.searchParams.get('product_id') || undefined,
          article_id:
            request.nextUrl.searchParams.get('article_id') || undefined,
          status: request.nextUrl.searchParams.get('status') || undefined,
          platform: request.nextUrl.searchParams.get('platform') || undefined,
          search: request.nextUrl.searchParams.get('search') || undefined,
          sort: request.nextUrl.searchParams.get('sort') || 'created_at',
          order: request.nextUrl.searchParams.get('order') || 'desc',
          limit: request.nextUrl.searchParams.get('limit') || '50',
          offset: request.nextUrl.searchParams.get('offset') || '0',
        };

    if (!params?.organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    const result = await getOrganizationPublishingQueue(
      client,
      params.organization_id,
      {
        productId: params.product_id,
        articleId: params.article_id,
        status: params.status as any,
        platform: params.platform as any,
        search: params.search,
        sortBy: params.sort as any,
        sortOrder: params.order as any,
        limit: params.limit ? Number(params.limit) : 50,
        offset: params.offset ? Number(params.offset) : 0,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      items: result.data,
      total: result.data.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/publishing-queue');
  }
}

/**
 * POST /api/publishing-queue
 * Create a new publishing queue item
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
      createPublishingQueueItemSchema
    );

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    const result = await createPublishingQueueItem(client, {
      ...validationResult.data,
      integration_id: validationResult.data.integration_id || null,
      metadata: (validationResult.data.metadata || {}) as any,
    } as any);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'POST /api/publishing-queue');
  }
}

/**
 * PATCH /api/publishing-queue
 * Update a publishing queue item
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(
      body,
      updatePublishingQueueItemSchema
    );

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { id, ...updates } = validationResult.data;

    const client = getSupabaseServerClient();

    // Check if user has access to the organization
    const { data: queueItem } = await client
      .from('publishing_queue')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    const { data: memberRole } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (queueItem as any).organization_id)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Only organization owners can update queue items' },
        { status: 403 }
      );
    }

    const result = await updatePublishingQueueItem(client, id, updates as any);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'PATCH /api/publishing-queue');
  }
}

/**
 * DELETE /api/publishing-queue
 * Delete a publishing queue item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      deletePublishingQueueItemSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    const client = getSupabaseServerClient();

    // Check if user is owner (required for deletion)
    const { data: queueItem } = await client
      .from('publishing_queue')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    const { data: memberRole } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (queueItem as any).organization_id)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Only organization owners can delete queue items' },
        { status: 403 }
      );
    }

    const result = await softDeletePublishingQueueItem(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/publishing-queue');
  }
}

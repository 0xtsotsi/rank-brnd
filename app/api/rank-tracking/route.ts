/**
 * Rank Tracking API Route
 * Handles CRUD operations for rank tracking data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { Json } from '@/types/database';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getOrganizationRankTracking,
  createRankTracking,
  updateRankTracking,
  deleteRankTracking,
  getKeywordRankHistory,
  getKeywordRankStats,
  bulkInsertRankTracking,
  upsertRankTracking,
} from '@/lib/supabase/rank-tracking';
import {
  rankTrackingQuerySchema,
  rankTrackingPostSchema,
  updateRankTrackingSchema,
  deleteRankTrackingSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas/rank-tracking';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/rank-tracking
 * Fetch rank tracking records with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseServerClient();

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      rankTrackingQuerySchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get user's organization ID
    const { data: userData, error: userError } = await client
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to get user organization' },
        { status: 400 }
      );
    }

    const organizationId =
      data.organization_id || (userData as any).organization_id;

    // Fetch rank tracking records
    const result = await getOrganizationRankTracking(client, organizationId, {
      productId: data.product_id,
      keywordId: data.keyword_id,
      device: data.device,
      location: data.location,
      dateFrom: data.date_from,
      dateTo: data.date_to,
      minPosition: data.min_position,
      maxPosition: data.max_position,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sort,
      sortOrder: data.order,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Get keyword names for the records
    const records = result.data || [];
    const keywordIds = [...new Set(records.map((r) => r.keyword_id))];

    let keywordNames: Record<string, string> = {};
    if (keywordIds.length > 0) {
      const { data: keywords } = await client
        .from('keywords')
        .select('id, keyword')
        .in('id', keywordIds);

      if (keywords) {
        keywordNames = keywords.reduce(
          (acc, kw: any) => {
            acc[kw.id] = kw.keyword;
            return acc;
          },
          {} as Record<string, string>
        );
      }
    }

    // Calculate position changes for records with previous day data
    const withChanges = await Promise.all(
      records.map(async (record) => {
        // Get previous day's record
        const previousDate = new Date(record.date);
        previousDate.setDate(previousDate.getDate() - 1);

        const { data: previousRecords } = await client
          .from('rank_tracking')
          .select('*')
          .eq('keyword_id', record.keyword_id)
          .eq('device', record.device)
          .eq('location', record.location)
          .eq('date', previousDate.toISOString().split('T')[0])
          .limit(1);

        const previousRecord = previousRecords?.[0];
        const position_change = previousRecord
          ? (previousRecord as any).position - record.position
          : null;

        return {
          ...record,
          keyword: keywordNames[record.keyword_id] || record.keyword_id,
          position_change,
          previous_position: previousRecord
            ? (previousRecord as any).position
            : null,
        };
      })
    );

    return NextResponse.json({
      rankings: withChanges,
      total: withChanges.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/rank-tracking');
  }
}

/**
 * POST /api/rank-tracking
 * Create a new rank tracking record or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseServerClient();

    const body = await request.json();
    const validationResult = validateRequest(body, rankTrackingPostSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get user's organization ID
    const { data: userData, error: userError } = await client
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to get user organization' },
        { status: 400 }
      );
    }

    const organizationId =
      data.organization_id || (userData as any).organization_id;

    // Handle bulk import
    if (data.bulk) {
      const records = data.records.map((record) => ({
        ...record,
        organization_id: organizationId,
        product_id: data.product_id,
        date: record.date
          ? record.date instanceof Date
            ? record.date.toISOString()
            : record.date
          : undefined,
      }));

      const result = await bulkInsertRankTracking(client, records);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json(result.data);
    }

    // Single record creation (with bulk: false)
    const result = await createRankTracking(client, {
      organization_id: organizationId,
      product_id: data.product_id,
      keyword_id: data.keyword_id,
      position: data.position,
      device: data.device,
      location: data.location,
      url: data.url || undefined,
      date: data.date?.toISOString().split('T')[0] as string | undefined,
      search_volume: data.search_volume,
      ctr: data.ctr,
      impressions: data.impressions,
      clicks: data.clicks,
      metadata: (data.metadata || {}) as Json,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'POST /api/rank-tracking');
  }
}

/**
 * PATCH /api/rank-tracking
 * Update a rank tracking record
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseServerClient();

    const body = await request.json();
    const validationResult = validateRequest(body, updateRankTrackingSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;
    const updates = { ...validationResult.data };
    delete (updates as any).id;

    // Cast metadata to Json type
    if (updates.metadata) {
      (updates as any).metadata = updates.metadata as Json;
    }

    const result = await updateRankTracking(client, id, updates as any);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'PATCH /api/rank-tracking');
  }
}

/**
 * DELETE /api/rank-tracking
 * Delete a rank tracking record
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseServerClient();

    const body = await request.json();
    const validationResult = validateRequest(body, deleteRankTrackingSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    const result = await deleteRankTracking(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/rank-tracking');
  }
}

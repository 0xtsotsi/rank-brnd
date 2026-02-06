/**
 * Google Search Console API Route
 * Handles CRUD operations for Google Search Console search performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  searchConsoleQuerySchema,
  createSearchConsoleDataSchema,
  deleteSearchConsoleDataSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getProductSearchConsoleData,
  createSearchConsoleData,
  deleteSearchConsoleData,
} from '@/lib/supabase/google-search-console';

/**
 * GET /api/search-console
 * Fetch all search console data for a product with optional filtering
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
      searchConsoleQuerySchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const {
      productId,
      keyword,
      startDate,
      endDate,
      sort,
      order,
      limit,
      offset,
    } = validationResult.data;

    const client = getSupabaseServerClient();
    const result = await getProductSearchConsoleData(client, productId, {
      keyword,
      startDate,
      endDate,
      sortBy: sort,
      sortOrder: order,
      limit,
      offset,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      data: result.data,
      total: result.data.length,
    });
  } catch (error) {
    console.error('Error fetching search console data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search console data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search-console
 * Create a new search console data record
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
      createSearchConsoleDataSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { productId, data } = validationResult.data;

    // Get user's organization from the product
    const client = getSupabaseServerClient();
    const { data: product, error: productError } = await client
      .from('products')
      .select('organization_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create the search console data record
    const result = await createSearchConsoleData(client, {
      organization_id: (product as any).organization_id,
      product_id: productId,
      keyword: data.keyword,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.ctr,
      avg_position: data.avg_position,
      date:
        data.date instanceof Date
          ? data.date.toISOString().split('T')[0]
          : data.date,
      metadata: data.metadata,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error creating search console data:', error);
    return NextResponse.json(
      { error: 'Failed to create search console data' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/search-console
 * Delete a search console data record
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
      deleteSearchConsoleDataSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    const client = getSupabaseServerClient();
    const result = await deleteSearchConsoleData(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting search console data:', error);
    return NextResponse.json(
      { error: 'Failed to delete search console data' },
      { status: 500 }
    );
  }
}

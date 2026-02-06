/**
 * Google Search Console Bulk Import API Route
 * Handles bulk upsert operations for Google Search Console data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  bulkImportSearchConsoleDataSchema,
  validateRequest,
} from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { bulkUpsertSearchConsoleData } from '@/lib/supabase/google-search-console';

/**
 * POST /api/search-console/bulk
 * Bulk upsert search console data records
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
      bulkImportSearchConsoleDataSchema
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
      .select('organization_id' as any)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Format data for bulk upsert
    const formattedData = data.map((item) => ({
      keyword: item.keyword,
      impressions: item.impressions,
      clicks: item.clicks,
      ctr: item.ctr,
      avg_position: item.avg_position,
      date:
        item.date instanceof Date
          ? item.date.toISOString().split('T')[0]
          : item.date,
      metadata: item.metadata,
    }));

    // Bulk upsert the search console data
    const result = await bulkUpsertSearchConsoleData(
      client,
      (product as any).organization_id,
      productId,
      formattedData
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: result.data,
      message: `Successfully processed ${result.data} records`,
    });
  } catch (error) {
    console.error('Error bulk upserting search console data:', error);
    return NextResponse.json(
      { error: 'Failed to bulk upsert search console data' },
      { status: 500 }
    );
  }
}

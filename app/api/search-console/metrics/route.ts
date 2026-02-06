/**
 * Google Search Console Metrics API Route
 * Handles aggregated metrics queries for Google Search Console data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  searchConsoleMetricsQuerySchema,
  validateQueryParams,
} from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { getProductSearchConsoleMetrics } from '@/lib/supabase/google-search-console';

/**
 * GET /api/search-console/metrics
 * Get aggregated metrics for a product
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
      searchConsoleMetricsQuerySchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { productId, startDate, endDate } = validationResult.data;

    const client = getSupabaseServerClient();
    const result = await getProductSearchConsoleMetrics(client, productId, {
      startDate,
      endDate,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching search console metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search console metrics' },
      { status: 500 }
    );
  }
}

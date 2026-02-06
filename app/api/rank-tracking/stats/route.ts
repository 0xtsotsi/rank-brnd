/**
 * Rank Statistics API Route
 * Get rank statistics for keywords
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { getKeywordRankStats } from '@/lib/supabase/rank-tracking';
import {
  getRankStatsSchema,
  validateQueryParams,
} from '@/lib/schemas/rank-tracking';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/rank-tracking/stats
 * Get rank statistics for a keyword
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
      getRankStatsSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get rank stats
    const result = await getKeywordRankStats(client, data.keyword_id, {
      device: data.device,
      location: data.location,
      days: data.days,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      keyword_id: data.keyword_id,
      stats: result.data,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/rank-tracking/stats');
  }
}

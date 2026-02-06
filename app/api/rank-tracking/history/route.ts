/**
 * Rank History API Route
 * Get historical rank data for a keyword
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { getKeywordRankHistory } from '@/lib/supabase/rank-tracking';
import {
  getRankHistorySchema,
  validateQueryParams,
} from '@/lib/schemas/rank-tracking';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/rank-tracking/history
 * Get rank history for a keyword
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
      getRankHistorySchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get rank history
    const result = await getKeywordRankHistory(client, data.keyword_id, {
      device: data.device,
      location: data.location,
      days: data.days,
      endDate: data.end_date,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      keyword_id: data.keyword_id,
      history: result.data || [],
      total: (result.data || []).length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/rank-tracking/history');
  }
}

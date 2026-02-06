// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Schedule Statistics API Route
 * Returns statistics about scheduled articles for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getScheduleStats } from '@/lib/supabase/schedules';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * Query schema for schedule stats
 */
const statsQuerySchema = z.object({
  organization_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
});

/**
 * GET /api/schedule/stats
 * Get schedule statistics for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const validationResult = statsQuerySchema.safeParse(params);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', validationResult.data.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const result = await getScheduleStats(
      client,
      validationResult.data.organization_id,
      validationResult.data.product_id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'GET /api/schedule/stats');
  }
}

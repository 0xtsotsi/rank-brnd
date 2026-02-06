// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Upcoming Schedules API Route
 * Returns upcoming scheduled articles within a date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getUpcomingSchedules } from '@/lib/supabase/schedules';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * Query schema for upcoming schedules
 */
const upcomingQuerySchema = z.object({
  organization_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  days: z.coerce.number().int().positive().max(90).optional().default(7),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

/**
 * GET /api/schedule/upcoming
 * Get upcoming scheduled articles
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const validationResult = upcomingQuerySchema.safeParse(params);

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

    const result = await getUpcomingSchedules(
      client,
      validationResult.data.organization_id,
      {
        productId: validationResult.data.product_id,
        days: validationResult.data.days,
        limit: validationResult.data.limit,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      schedules: result.data,
      total: result.data.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/schedule/upcoming');
  }
}

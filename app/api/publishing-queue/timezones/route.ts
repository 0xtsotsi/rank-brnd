/**
 * Timezones API Route
 *
 * Returns a list of available timezones for scheduling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { COMMON_TIMEZONES } from '@/lib/publishing/timezone';

/**
 * GET /api/publishing-queue/timezones
 *
 * Get a list of available timezones for scheduling.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();

    let timezones = COMMON_TIMEZONES;

    // Filter by search term if provided
    if (search) {
      timezones = timezones.filter(
        (tz) =>
          tz.label.toLowerCase().includes(search) ||
          tz.value.toLowerCase().includes(search) ||
          tz.group.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      timezones,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch timezones' },
      { status: 500 }
    );
  }
}

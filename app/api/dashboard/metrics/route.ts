import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/dashboard/metrics
 *
 * Returns dashboard metrics for the authenticated user including:
 * - Articles written count
 * - Keywords tracked count
 * - Publishing status breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, these would be fetched from your database
    // For now, returning mock data that matches the expected structure
    const metrics = {
      articles: {
        total: 24,
        trend: {
          value: 12,
          isPositive: true,
        },
      },
      keywords: {
        total: 156,
        trend: {
          value: 8,
          isPositive: true,
        },
      },
      publishingStatus: {
        published: 18,
        draft: 4,
        scheduled: 1,
        pending_review: 1,
      },
      // Additional metrics for extensibility
      views: {
        total: '12.4K',
        trend: {
          value: 24,
          isPositive: true,
        },
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

/**
 * Revalidation configuration for Next.js ISR
 * Revalidate every 5 minutes to keep metrics relatively fresh
 */
export const dynamic = 'force-dynamic';

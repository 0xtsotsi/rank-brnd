import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Connect to actual database and fetch real metrics
    // For now, return mock data
    const metrics = {
      articles: {
        total: 0,
        trend: { value: 0, isPositive: true }
      },
      keywords: {
        total: 0,
        trend: { value: 0, isPositive: true }
      },
      views: {
        total: '0',
        trend: { value: 0, isPositive: true }
      },
      publishingStatus: {
        published: 0,
        draft: 0,
        scheduled: 0,
        pending_review: 0
      }
    };

    return NextResponse.json(metrics);
  } catch {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        status: 500
      }
    );
  }
}

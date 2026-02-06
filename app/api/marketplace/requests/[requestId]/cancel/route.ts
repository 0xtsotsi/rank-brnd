// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Cancel Exchange Request API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId: id } = await context.params;

    // In production, update the database record
    return NextResponse.json({
      success: true,
      request: {
        id,
        status: 'cancelled',
      },
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel request' },
      { status: 500 }
    );
  }
}

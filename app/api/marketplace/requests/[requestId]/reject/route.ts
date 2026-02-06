// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Reject Exchange Request API Route
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
    const body = await request.json();
    const { reason } = body;

    // In production, update the database record with reason
    return NextResponse.json({
      success: true,
      request: {
        id,
        status: 'rejected',
        rejection_reason: reason || 'No reason provided',
      },
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    return NextResponse.json(
      { error: 'Failed to reject request' },
      { status: 500 }
    );
  }
}

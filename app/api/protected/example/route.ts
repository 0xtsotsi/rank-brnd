import { NextResponse } from 'next/server';
import { requireUserId, requireOrganizationId } from '@/lib/auth';

/**
 * Protected API Route Example
 *
 * This demonstrates how to protect API routes using Clerk authentication.
 * The authentication is verified via the httpOnly cookie automatically.
 */

export async function GET() {
  try {
    // Verify user is authenticated
    const userId = await requireUserId();
    const orgId = await requireOrganizationId().catch(() => null);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        organizationId: orgId,
        message:
          'This is protected data only accessible to authenticated users',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 401 }
    );
  }
}

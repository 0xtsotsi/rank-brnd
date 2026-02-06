import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import {
  createDeletionRequest,
  getPendingDeletionRequest,
  cancelDeletionRequest,
  getDeletionSummary,
  getUserActiveSubscriptions,
} from '@/lib/supabase/account-deletion';

/**
 * Account Deletion API
 *
 * GDPR-compliant account deletion endpoints:
 *
 * GET /api/user/account/deletion
 * - Get current deletion status and summary of what will be deleted
 *
 * POST /api/user/account/deletion
 * - Request account deletion (creates pending request with confirmation token)
 * - Body: { "confirmed": true } to confirm deletion immediately
 *
 * DELETE /api/user/account/deletion
 * - Cancel a pending deletion request
 */

/**
 * GET - Get deletion status and summary
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    // Get pending deletion request
    const pendingResult = await getPendingDeletionRequest(userId);

    if (!pendingResult.success) {
      return NextResponse.json(
        { success: false, error: pendingResult.error },
        { status: 500 }
      );
    }

    // Get summary of what will be deleted
    const summaryResult = await getDeletionSummary(userId);

    // Get active subscriptions info
    const subscriptions = await getUserActiveSubscriptions(userId);

    return NextResponse.json({
      success: true,
      data: {
        hasPendingRequest: !!pendingResult.request,
        pendingRequest: pendingResult.request || null,
        summary: summaryResult.summary,
        activeSubscriptions: subscriptions,
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

/**
 * POST - Request or confirm account deletion
 *
 * Body:
 * - {}: Create a new deletion request (returns confirmation token)
 * - { "confirmationToken": "token" }: Confirm deletion with token
 * - { "confirmed": true }: Auto-confirm (for users who have already confirmed in UI)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    // Check if confirming with token
    if (body.confirmationToken) {
      const { confirmDeletionRequest } =
        await import('@/lib/supabase/account-deletion');

      const result = await confirmDeletionRequest(body.confirmationToken);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            details: result.details,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Account deletion initiated',
        details: result.details,
      });
    }

    // Check if auto-confirming (user already confirmed in UI)
    if (body.confirmed === true) {
      const { confirmDeletionRequest } =
        await import('@/lib/supabase/account-deletion');

      // First create a request, then confirm it
      const createResult = await createDeletionRequest(userId);

      if (!createResult.success || !createResult.confirmationToken) {
        return NextResponse.json(
          { success: false, error: createResult.error },
          { status: 500 }
        );
      }

      const result = await confirmDeletionRequest(
        createResult.confirmationToken
      );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            details: result.details,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Account deletion initiated. You will be logged out.',
        details: result.details,
      });
    }

    // Create a new deletion request
    const result = await createDeletionRequest(userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Deletion request created. Please confirm to proceed with deletion.',
      confirmationToken: result.confirmationToken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      },
      {
        status:
          error instanceof Error && error.message.includes('Unauthorized')
            ? 401
            : 500,
      }
    );
  }
}

/**
 * DELETE - Cancel pending deletion request
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const reason = body.reason;

    const result = await cancelDeletionRequest(userId, reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deletion request cancelled',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      },
      { status: 401 }
    );
  }
}

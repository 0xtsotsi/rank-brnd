/**
 * Onboarding Progress API Route
 *
 * Handles CRUD operations for user onboarding progress.
 * GET: Fetch onboarding progress for current user
 * POST: Update onboarding progress
 * DELETE: Reset onboarding progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/onboarding
 *
 * Fetch the current user's onboarding progress.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, you would fetch from the database
    // For now, we return a placeholder response
    // The actual state is managed client-side via localStorage in the onboarding store
    return NextResponse.json({
      userId,
      currentStep: 'welcome',
      completedSteps: [],
      skippedSteps: [],
      startedAt: null,
      completedAt: null,
      organizationCreated: false,
      firstArticleCreated: false,
      integrationConnected: false,
      tourCompleted: false,
    });
  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding
 *
 * Update the current user's onboarding progress.
 *
 * Body:
 * {
 *   currentStep?: string;
 *   completedSteps?: string[];
 *   skippedSteps?: string[];
 *   organizationCreated?: boolean;
 *   firstArticleCreated?: boolean;
 *   integrationConnected?: boolean;
 *   tourCompleted?: boolean;
 *   completed?: boolean; // Set to true to mark onboarding as complete
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body
    const validSteps = [
      'welcome',
      'organization-setup',
      'product-tour',
      'first-article',
      'integration-setup',
      'success',
    ];

    if (body.currentStep && !validSteps.includes(body.currentStep)) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Update the user's onboarding progress in the database
    // 2. Trigger any side effects (e.g., send analytics event)
    // 3. Return the updated state

    // For now, we return success
    // The actual state is managed client-side via localStorage in the onboarding store

    // If marking as complete, you might want to:
    // - Update the user record in the database
    // - Trigger a welcome email
    // - Send analytics event

    return NextResponse.json({
      success: true,
      message: 'Onboarding progress updated',
    });
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/onboarding
 *
 * Reset the current user's onboarding progress.
 * Useful for testing or allowing users to restart onboarding.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, you would:
    // 1. Delete or reset the user's onboarding progress in the database
    // 2. Clear any related flags on the user record

    return NextResponse.json({
      success: true,
      message: 'Onboarding progress reset',
    });
  } catch (error) {
    console.error('Error resetting onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to reset onboarding progress' },
      { status: 500 }
    );
  }
}

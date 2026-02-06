import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/lib/auth';
import { getStripeClient, formatStripeAmount } from '@/lib/stripe';
import {
  changePlan,
  previewPlanChange,
  validatePlanChange,
  getUpcomingInvoiceAfterPlanChange,
  formatPlanChangePreview,
  getCurrentPlanFromSubscription,
} from '@/lib/stripe/subscription-change';
import type Stripe from 'stripe';

/**
 * Get Current Subscription
 *
 * GET /api/stripe/subscription
 *
 * Returns the current active subscription for the organization
 *
 * Query params:
 * - subscriptionId: Optional, to get a specific subscription
 */
export async function GET(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json({
        subscription: null,
        message: 'Subscription tracking not yet implemented',
      });
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const plan = getCurrentPlanFromSubscription(subscription);

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planId: plan?.id,
        planName: plan?.name,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        trialStart: (subscription as any).trial_start
          ? new Date((subscription as any).trial_start * 1000)
          : null,
        trialEnd: (subscription as any).trial_end
          ? new Date((subscription as any).trial_end * 1000)
          : null,
        limits: plan?.limits,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * Preview Plan Change
 *
 * GET /api/stripe/subscription?preview=true&priceId=price_xxx&subscriptionId=sub_xxx
 *
 * Returns a preview of what will change when switching plans
 */
export async function HEAD(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const priceId = searchParams.get('priceId');

    if (!subscriptionId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: subscriptionId and priceId' },
        { status: 400 }
      );
    }

    const preview = await previewPlanChange(subscriptionId, priceId);
    const formatted = formatPlanChangePreview(preview);

    return NextResponse.json({
      preview: {
        ...preview,
        formatted,
      },
    });
  } catch (error) {
    console.error('Error previewing plan change:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to preview plan change', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to preview plan change' },
      { status: 500 }
    );
  }
}

/**
 * Cancel Subscription
 *
 * DELETE /api/stripe/subscription
 *
 * Cancels the subscription at the end of the current period
 *
 * Request body:
 * {
 *   "subscriptionId": "sub_xxx"
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();

    const body = await req.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required field: subscriptionId' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();

    // Cancel subscription at period end
    const subscription = (await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })) as Stripe.Subscription;

    // TODO: Update database
    // await db.update(subscriptions)
    //   .set({
    //     cancelAtPeriodEnd: true,
    //     updatedAt: new Date(),
    //   })
    //   .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
      },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to cancel subscription', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * Update Subscription (Change Plan)
 *
 * PATCH /api/stripe/subscription
 *
 * Updates the subscription by changing plans with prorated billing
 *
 * Request body:
 * {
 *   "subscriptionId": "sub_xxx",
 *   "priceId": "price_xxx",
 *   "previewOnly": false,  // Set to true to preview without executing
 *   "downgradeAtPeriodEnd": true  // For downgrades, apply at period end
 * }
 *
 * Response includes:
 * - The updated subscription details
 * - Proration information
 * - Effective date
 * - Next billing amount
 */
export async function PATCH(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();

    const body = await req.json();
    const {
      subscriptionId,
      priceId,
      previewOnly = false,
      downgradeAtPeriodEnd = true,
    } = body;

    if (!subscriptionId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required fields: subscriptionId and priceId' },
        { status: 400 }
      );
    }

    // Validate plan change is allowed
    const validation = await validatePlanChange(subscriptionId, priceId);
    if (!validation.allowed) {
      return NextResponse.json(
        { error: 'Plan change not allowed', reason: validation.reason },
        { status: 400 }
      );
    }

    // If preview only, return the preview
    if (previewOnly) {
      const preview = await previewPlanChange(subscriptionId, priceId);
      const formatted = formatPlanChangePreview(preview);

      // Get upcoming invoice details
      const upcomingInvoice = await getUpcomingInvoiceAfterPlanChange(
        subscriptionId,
        priceId
      );

      return NextResponse.json({
        preview: {
          ...preview,
          formatted,
          upcomingInvoice: {
            subtotal: formatStripeAmount(
              upcomingInvoice.subtotal,
              upcomingInvoice.currency
            ),
            total: formatStripeAmount(
              upcomingInvoice.total,
              upcomingInvoice.currency
            ),
            currency: upcomingInvoice.currency,
            lineItems: upcomingInvoice.lines,
          },
        },
      });
    }

    // Execute the plan change
    const result = await changePlan(subscriptionId, priceId, {
      downgradeAtPeriodEnd,
      upgradeImmediately: true,
      prorationBehavior: 'always_invoice',
      metadata: {
        organizationId,
        changedBy: 'api',
      },
    });

    // Get the updated subscription to return full details
    const stripe = getStripeClient();
    const updatedSubscription = await stripe.subscriptions.retrieve(
      result.subscriptionId
    );
    const plan = getCurrentPlanFromSubscription(updatedSubscription);

    return NextResponse.json({
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        planId: plan?.id,
        planName: plan?.name,
        priceId: updatedSubscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(
          (updatedSubscription as any).current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          (updatedSubscription as any).current_period_end * 1000
        ),
        cancelAtPeriodEnd: (updatedSubscription as any).cancel_at_period_end,
        limits: plan?.limits,
      },
      changeResult: {
        fromPlanId: result.fromPlanId,
        toPlanId: result.toPlanId,
        changeType: result.changeType,
        proratedAmount: result.proratedAmount
          ? formatStripeAmount(result.proratedAmount, 'USD')
          : '$0.00',
        nextBillingAmount: formatStripeAmount(result.nextBillingAmount, 'USD'),
        effectiveAt: result.effectiveAt,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('Error updating subscription:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to update subscription', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

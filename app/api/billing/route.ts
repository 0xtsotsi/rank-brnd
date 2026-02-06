/**
 * Billing API Route
 *
 * Provides endpoints for subscription management, billing history, and invoices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/lib/auth';
import { getPlan, getAllPlans, formatPrice } from '@/lib/stripe/plans';
import type {
  SubscriptionPlan,
  BillingInterval,
  SubscriptionStatus,
} from '@/types/subscription';

/**
 * Mock subscription data for demonstration
 * In production, this would come from the database
 */
function getMockSubscription(organizationId: string) {
  return {
    id: 'sub_mock_123',
    organizationId,
    status: 'active' as SubscriptionStatus,
    planId: 'pro',
    currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialStart: null,
    trialEnd: null,
    stripeCustomerId: 'cus_mock_123',
    stripeSubscriptionId: 'sub_mock_123',
    interval: 'month' as BillingInterval,
  };
}

/**
 * Mock invoice data for demonstration
 */
function getMockInvoices(organizationId: string) {
  return [
    {
      id: 'inv_mock_1',
      organizationId,
      subscriptionId: 'sub_mock_123',
      stripeInvoiceId: 'in_mock_1',
      amountPaid: 4900, // $49.00
      currency: 'usd',
      status: 'paid' as const,
      invoicePdf: 'https://stripe.com/mock/pdf/invoice_1.pdf',
      hostedInvoiceUrl: 'https://stripe.com/mock/invoice/1',
      dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      description: 'Pro Plan - Monthly',
      metadata: null,
      createdAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'inv_mock_2',
      organizationId,
      subscriptionId: 'sub_mock_123',
      stripeInvoiceId: 'in_mock_2',
      amountPaid: 4900,
      currency: 'usd',
      status: 'paid' as const,
      invoicePdf: 'https://stripe.com/mock/pdf/invoice_2.pdf',
      hostedInvoiceUrl: 'https://stripe.com/mock/invoice/2',
      dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      description: 'Pro Plan - Monthly',
      metadata: null,
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    },
  ];
}

/**
 * GET /api/billing
 *
 * Returns the current subscription and billing information for the organization
 */
export async function GET(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();

    // Get mock subscription data
    const subscription = getMockSubscription(organizationId);

    // Get plan details
    const plan = getPlan(subscription.planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Calculate days until next billing
    const daysUntilBilling = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );

    // Calculate next billing amount
    const pricePerMonth =
      subscription.interval === 'year'
        ? plan.priceYearly / 12
        : plan.priceMonthly;

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          planId: subscription.planId,
          planName: plan.name,
          planDescription: plan.description,
          priceMonthly: formatPrice(plan.priceMonthly),
          priceYearly: formatPrice(plan.priceYearly),
          interval: subscription.interval,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          daysUntilBilling,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          willCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          isTrial: subscription.status === 'trialing',
          trialDaysRemaining: subscription.trialEnd
            ? Math.ceil(
                (new Date(subscription.trialEnd).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          features: plan.features,
          limits: plan.limits,
          metadata: plan.metadata,
        },
        availablePlans: getAllPlans().map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceMonthly: p.priceMonthly,
          priceYearly: p.priceYearly,
          currency: p.currency,
          metadata: p.metadata,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching billing info:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/billing
 *
 * Update subscription (change plan, billing interval, etc.)
 */
export async function PATCH(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();
    const body = await req.json();
    const { action, planId, interval } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'change_plan':
        // Handle plan change
        if (!planId) {
          return NextResponse.json(
            { error: 'Plan ID is required for plan change' },
            { status: 400 }
          );
        }

        // In production, this would call Stripe API to update the subscription
        // For now, return success
        return NextResponse.json({
          success: true,
          data: {
            message: `Plan change to ${planId} initiated`,
            // Redirect to checkout in production
            checkoutUrl: `/dashboard/checkout?plan=${planId}`,
          },
        });

      case 'change_interval':
        // Handle billing interval change
        if (!interval || !['month', 'year'].includes(interval)) {
          return NextResponse.json(
            { error: 'Valid interval (month/year) is required' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            message: `Billing interval changed to ${interval}`,
            interval,
          },
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error updating subscription:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing
 *
 * Cancel subscription at period end
 */
export async function DELETE(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();

    // In production, this would:
    // 1. Call Stripe API to cancel subscription at period end
    // 2. Update database record

    return NextResponse.json({
      success: true,
      data: {
        message:
          'Subscription will be canceled at the end of the current billing period',
        cancelAtPeriodEnd: true,
      },
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

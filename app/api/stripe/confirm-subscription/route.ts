import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOrganizationId } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';
import { getPlan } from '@/lib/stripe/plans';
import type Stripe from 'stripe';

/**
 * Confirm and Create Subscription
 *
 * This endpoint creates a subscription after a successful payment.
 * It uses the payment method from the successful payment intent.
 *
 * POST /api/stripe/confirm-subscription
 *
 * Request body:
 * {
 *   "paymentIntentId": "pi_xxx",
 *   "planId": "pro",
 *   "interval": "month" | "year"
 * }
 *
 * Response:
 * {
 *   "subscriptionId": "sub_xxx",
 *   "status": "active" | "trialing",
 *   "currentPeriodEnd": 1234567890
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Require authenticated user
    const userId = await requireUserId();
    const organizationId = await requireOrganizationId();

    // Parse request body
    const body = await req.json();
    const { paymentIntentId, planId, interval = 'month' } = body;

    // Validate required fields
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required field: paymentIntentId' },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: 'Missing required field: planId' },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Get the Stripe price ID based on plan and interval
    const priceId =
      interval === 'year'
        ? plan.stripePriceIdYearly
        : plan.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.json(
        {
          error: `No Stripe price ID configured for ${planId} plan (${interval}ly)`,
        },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();

    // Retrieve the payment intent to get the customer and payment method
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment intent has not succeeded' },
        { status: 400 }
      );
    }

    const customerId = paymentIntent.customer as string;
    const paymentMethodId = paymentIntent.payment_method as string;

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'No customer found on payment intent' },
        { status: 400 }
      );
    }

    // Create subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      default_payment_method: paymentMethodId,
      items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        organizationId,
        userId,
        planId,
        interval,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
    };

    // Add trial period if applicable
    if (plan.metadata.trialDays && plan.metadata.trialDays > 0) {
      subscriptionParams.trial_period_days = plan.metadata.trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // TODO: Save subscription to database
    // await db.insert(subscriptions).values({
    //   id: generateId(),
    //   organizationId,
    //   stripeSubscriptionId: subscription.id,
    //   stripeCustomerId: customerId,
    //   stripePriceId: priceId,
    //   stripeProductId: plan.id,
    //   status: subscription.status,
    //   planId: plan.id,
    //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
    //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    //   cancelAtPeriodEnd: subscription.cancel_at_period_end,
    //   trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    //   trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    // });

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: (subscription as any).current_period_end,
      trialEnd: (subscription as any).trial_end,
      planId,
      interval,
    });
  } catch (error) {
    console.error('Error confirming subscription:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to confirm subscription', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to confirm subscription' },
      { status: 500 }
    );
  }
}

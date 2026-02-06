import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOrganizationId } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';

/**
 * Create Stripe Payment Intent
 *
 * This endpoint creates a Stripe payment intent for use with Stripe Elements.
 * This allows for an embedded payment form rather than a redirect to Stripe Checkout.
 *
 * POST /api/stripe/create-payment-intent
 *
 * Request body:
 * {
 *   "amount": 4900, // in cents ($49.00)
 *   "currency": "usd",
 *   "planId": "pro",
 *   "interval": "month" | "year",
 *   "metadata": { "organizationId": "org_xxx" }
 * }
 *
 * Response:
 * {
 *   "clientSecret": "pi_xxx_secret_xxx",
 *   "paymentIntentId": "pi_xxx",
 *   "amount": 4900,
 *   "currency": "usd"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Require authenticated user
    const userId = await requireUserId();
    const organizationId = await requireOrganizationId();

    // Parse request body
    const body = await req.json();
    const {
      amount,
      currency = 'usd',
      planId,
      interval = 'month',
      metadata = {},
    } = body;

    // Validate required fields
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number in cents.' },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { error: 'Missing required field: planId' },
        { status: 400 }
      );
    }

    // Get Stripe client
    const stripe = getStripeClient();

    // Check if organization already has a Stripe customer
    // TODO: Query database for existing customer ID
    // const organization = await db.query.organizations.findFirst({
    //   where: eq(organizations.id, organizationId),
    // });
    // let customerId = organization?.stripeCustomerId;

    let customerId = undefined;

    // Create customer if doesn't exist
    if (!customerId) {
      // TODO: Get user details from Clerk
      // const user = await currentUser();
      // const userEmail = user.emailAddresses[0]?.emailAddress;
      // const userName = user.firstName && user.lastName
      //   ? `${user.firstName} ${user.lastName}`
      //   : user.firstName || user.username || 'User';

      const customer = await stripe.customers.create({
        metadata: {
          organizationId,
          userId,
          createdAt: new Date().toISOString(),
        },
      });

      customerId = customer.id;

      // TODO: Update organization with customer ID
      // await db.update(organizations)
      //   .set({ stripeCustomerId: customerId })
      //   .where(eq(organizations.id, organizationId));
    }

    // Create payment intent with automatic payment methods
    // For subscriptions, we'll use setup_intent or subscription schedule
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        organizationId,
        userId,
        planId,
        interval,
        ...metadata,
      },
      // Setup future usage for subscription
      setup_future_usage: 'off_session',
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to create payment intent', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

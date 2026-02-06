import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, requireOrganizationId } from '@/lib/auth';
import { getStripeClient } from '@/lib/stripe';
import { createCheckoutSessionSchema, validateRequest } from '@/lib/schemas';
import type Stripe from 'stripe';

/**
 * Create Stripe Checkout Session
 *
 * This endpoint creates a Stripe checkout session for a subscription or one-time payment.
 *
 * POST /api/stripe/create-checkout-session
 *
 * Request body:
 * {
 *   "priceId": "price_xxx",
 *   "mode": "subscription" | "payment",
 *   "successUrl": "/dashboard?checkout=success",
 *   "cancelUrl": "/dashboard?checkout=canceled",
 *   "metadata": { "organizationId": "org_xxx" }
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
      priceId,
      mode = 'subscription',
      successUrl,
      cancelUrl,
      metadata = {},
    } = body;

    // Validate required fields
    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing required field: priceId' },
        { status: 400 }
      );
    }

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: successUrl and cancelUrl' },
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

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        userId,
        ...metadata,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address
      billing_address_collection: 'required',
      // Customer updates
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to create checkout session', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

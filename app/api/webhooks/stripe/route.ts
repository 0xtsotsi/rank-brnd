// @ts-nocheck - Database types need to be regenerated with Supabase CLI

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 *
 * This endpoint receives webhook events from Stripe to sync subscription data.
 * All webhooks are signed with Stripe's webhook secret for security.
 *
 * Setup:
 * 1. Get webhook secret from Stripe Dashboard -> Developers -> Webhooks -> Add Endpoint
 * 2. Add STRIPE_WEBHOOK_SECRET to .env
 * 3. Configure webhook URL: https://your-domain.com/api/webhooks/stripe
 *
 * Events handled:
 * - checkout.session.completed: User completed checkout
 * - customer.subscription.created: New subscription created
 * - customer.subscription.updated: Subscription modified
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.paid: Payment succeeded
 * - invoice.payment_failed: Payment failed
 * - customer.created: New customer created
 */

import {
  verifyStripeWebhook,
  isEventType,
  extractCheckoutSessionCompleted,
  extractSubscriptionCreated,
  extractSubscriptionUpdated,
  extractSubscriptionDeleted,
  extractInvoicePaid,
  extractInvoicePaymentFailed,
  getOrganizationIdFromCustomer,
  getUserIdFromCustomer,
  type StripeWebhookEvent,
} from '@/lib/stripe';
import {
  createRequestLogger,
  withLoggingHeaders,
  getCorrelationId,
  type ILogger,
} from '@/lib/logger';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { upsertInvoiceFromStripe } from '@/lib/supabase/subscriptions';
import { getOrganizationByStripeCustomerId } from '@/lib/supabase/organizations';

/**
 * Handle Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const log = await createRequestLogger('StripeWebhook');
  const correlationId = await getCorrelationId();

  // Get signature header
  const headerPayload = await headers();
  const signature = headerPayload.get('stripe-signature');

  if (!signature) {
    log.warn('Missing Stripe signature header');
    return withLoggingHeaders(
      new NextResponse('Error: Missing signature', { status: 400 }),
      correlationId
    );
  }

  // Get raw body for signature verification
  const rawBody = await req.text();

  log.debug('Received Stripe webhook', { hasSignature: !!signature });

  // Verify webhook signature
  let event;
  try {
    event = await verifyStripeWebhook(rawBody, signature);
    log.info('Webhook signature verified', { eventType: event.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('Error verifying webhook', err, {
      signaturePresent: !!signature,
    });
    return withLoggingHeaders(
      new NextResponse('Error: Invalid signature', { status: 403 }),
      correlationId
    );
  }

  // Handle the webhook event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event, log);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event, log);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, log);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, log);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event, log);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event, log);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, log);
        break;

      case 'invoice.upcoming':
        await handleInvoiceUpcoming(event, log);
        break;

      case 'customer.created':
        await handleCustomerCreated(event, log);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event, log);
        break;

      default:
        log.debug('Unhandled event type', { eventType: event.type });
    }

    log.info('Webhook processed successfully', { eventType: event.type });
    return withLoggingHeaders(
      NextResponse.json({ success: true, received: true }),
      correlationId
    );
  } catch (error) {
    log.error(`Error processing webhook ${event.type}`, error, {
      eventType: event.type,
    });
    return withLoggingHeaders(
      new NextResponse('Error processing webhook', { status: 500 }),
      correlationId
    );
  }
}

/**
 * Handle checkout.session.completed
 * Called when a user completes the Stripe checkout flow
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  log: ILogger
) {
  if (!isEventType(event, 'checkout.session.completed')) return;

  const sessionData = extractCheckoutSessionCompleted(event);

  log.info('Checkout completed', {
    sessionId: sessionData.sessionId,
    customerId: sessionData.customerId,
    customerEmail: sessionData.customerEmail,
    subscriptionId: sessionData.subscriptionId,
    mode: sessionData.mode,
  });

  // TODO: Sync checkout data to database
  // - Update user/organization metadata
  // - Track conversion analytics
  // - Send welcome email
}

/**
 * Handle customer.subscription.created
 * Called when a new subscription is created
 */
async function handleSubscriptionCreated(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'customer.subscription.created')) return;

  const subscriptionData = extractSubscriptionCreated(event);

  log.info('Subscription created', {
    subscriptionId: subscriptionData.subscriptionId,
    customerId: subscriptionData.customerId,
    priceId: subscriptionData.priceId,
    productId: subscriptionData.productId,
    status: subscriptionData.status,
    trialEnd: subscriptionData.trialEnd,
  });

  // TODO: Insert subscription into database when Drizzle is set up
  // await db.insert(subscriptions).values({
  //   stripeSubscriptionId: subscriptionData.subscriptionId,
  //   stripeCustomerId: subscriptionData.customerId,
  //   stripePriceId: subscriptionData.priceId,
  //   stripeProductId: subscriptionData.productId,
  //   status: subscriptionData.status,
  //   currentPeriodStart: new Date(subscriptionData.currentPeriodStart * 1000),
  //   currentPeriodEnd: new Date(subscriptionData.currentPeriodEnd * 1000),
  //   cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
  //   trialEnd: subscriptionData.trialEnd ? new Date(subscriptionData.trialEnd * 1000) : null,
  //   metadata: subscriptionData.metadata,
  // });
}

/**
 * Handle customer.subscription.updated
 * Called when a subscription is modified (plan change, cancellation, etc.)
 */
async function handleSubscriptionUpdated(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'customer.subscription.updated')) return;

  const subscriptionData = extractSubscriptionUpdated(event);

  log.info('Subscription updated', {
    subscriptionId: subscriptionData.subscriptionId,
    status: subscriptionData.status,
    priceId: subscriptionData.priceId,
    cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
    canceledAt: subscriptionData.canceledAt,
  });

  // TODO: Update subscription in database when Drizzle is set up
  // await db.update(subscriptions)
  //   .set({
  //     status: subscriptionData.status,
  //     stripePriceId: subscriptionData.priceId,
  //     currentPeriodEnd: new Date(subscriptionData.currentPeriodEnd * 1000),
  //     cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
  //     canceledAt: subscriptionData.canceledAt ? new Date(subscriptionData.canceledAt * 1000) : null,
  //     trialEnd: subscriptionData.trialEnd ? new Date(subscriptionData.trialEnd * 1000) : null,
  //     updatedAt: new Date(),
  //   })
  //   .where(eq(subscriptions.stripeSubscriptionId, subscriptionData.subscriptionId));

  // If subscription was canceled, update organization status
  if (subscriptionData.status === 'canceled') {
    log.warn('Subscription canceled', {
      subscriptionId: subscriptionData.subscriptionId,
    });
    // TODO: Update organization to reflect cancellation
  }
}

/**
 * Handle customer.subscription.deleted
 * Called when a subscription is fully canceled and expires
 */
async function handleSubscriptionDeleted(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'customer.subscription.deleted')) return;

  const subscriptionData = extractSubscriptionDeleted(event);

  log.info('Subscription deleted', {
    subscriptionId: subscriptionData.subscriptionId,
    status: subscriptionData.status,
  });

  // TODO: Update subscription status in database
  // await db.update(subscriptions)
  //   .set({
  //     status: subscriptionData.status,
  //     canceledAt: new Date(),
  //     updatedAt: new Date(),
  //   })
  //   .where(eq(subscriptions.stripeSubscriptionId, subscriptionData.subscriptionId));
}

/**
 * Handle customer.subscription.trial_will_end
 * Sent 7 days before trial ends
 */
async function handleTrialWillEnd(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'customer.subscription.trial_will_end')) return;

  const subscription = event.data.object;

  log.info('Trial will end soon', {
    subscriptionId: subscription.id,
    trialEnd: subscription.trial_end,
  });

  // TODO: Send reminder email about trial ending
}

/**
 * Handle invoice.paid
 * Called when a payment succeeds
 */
async function handleInvoicePaid(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'invoice.paid')) return;

  const invoiceData = extractInvoicePaid(event);

  log.info('Invoice paid', {
    invoiceId: invoiceData.invoiceId,
    subscriptionId: invoiceData.subscriptionId,
    amountPaid: invoiceData.amountPaid,
    currency: invoiceData.currency,
  });

  // Record the invoice in the database
  const supabase = getSupabaseServerClient();

  // Get organization from Stripe customer ID
  const orgResult = await getOrganizationByStripeCustomerId(
    supabase,
    invoiceData.customerId
  );

  if (!orgResult.success || !orgResult.data) {
    log.error('Organization not found for invoice', undefined, {
      customerId: invoiceData.customerId,
      invoiceId: invoiceData.invoiceId,
    });
    return;
  }

  // Get subscription ID from our database if available
  let subscriptionId: string | undefined = undefined;
  if (invoiceData.subscriptionId) {
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', invoiceData.subscriptionId)
      .single();

    subscriptionId = subData?.id;
  }

  // Upsert the invoice
  const result = await upsertInvoiceFromStripe(supabase, {
    organizationId: orgResult.data.id,
    subscriptionId,
    stripeInvoiceId: invoiceData.invoiceId,
    amountPaid: invoiceData.amountPaid,
    currency: invoiceData.currency,
    status: invoiceData.status,
    invoicePdf: invoiceData.invoicePdf,
    hostedInvoiceUrl: invoiceData.hostedInvoiceUrl,
    dueDate: invoiceData.dueDate
      ? new Date(invoiceData.dueDate * 1000)
      : undefined,
    paidAt: invoiceData.paidAt
      ? new Date(invoiceData.paidAt * 1000)
      : new Date(),
    metadata: invoiceData.metadata,
  });

  if (result.success) {
    log.info('Invoice recorded successfully', {
      invoiceId: invoiceData.invoiceId,
      organizationId: orgResult.data.id,
    });
  } else {
    log.error('Failed to record invoice', undefined, {
      invoiceId: invoiceData.invoiceId,
      error: result.error,
    });
  }
}

/**
 * Handle invoice.payment_failed
 * Called when a payment fails
 */
async function handleInvoicePaymentFailed(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'invoice.payment_failed')) return;

  const invoiceData = extractInvoicePaymentFailed(event);

  log.warn('Invoice payment failed', {
    invoiceId: invoiceData.invoiceId,
    subscriptionId: invoiceData.subscriptionId,
    amountDue: invoiceData.amountDue,
    attemptCount: invoiceData.attemptCount,
  });

  // Record the failed invoice in the database
  const supabase = getSupabaseServerClient();

  // Get organization from Stripe customer ID
  const orgResult = await getOrganizationByStripeCustomerId(
    supabase,
    invoiceData.customerId
  );

  if (!orgResult.success || !orgResult.data) {
    log.error('Organization not found for invoice', undefined, {
      customerId: invoiceData.customerId,
      invoiceId: invoiceData.invoiceId,
    });
    return;
  }

  // Get subscription ID from our database if available
  let subscriptionId: string | undefined = undefined;
  if (invoiceData.subscriptionId) {
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', invoiceData.subscriptionId)
      .single();

    subscriptionId = subData?.id;
  }

  // Upsert the invoice with 'open' status (failed payment, still owes)
  const result = await upsertInvoiceFromStripe(supabase, {
    organizationId: orgResult.data.id,
    subscriptionId,
    stripeInvoiceId: invoiceData.invoiceId,
    amountPaid: 0, // No payment yet
    currency: invoiceData.currency,
    status: 'open',
    invoicePdf: invoiceData.invoicePdf,
    hostedInvoiceUrl: invoiceData.hostedInvoiceUrl,
    dueDate: invoiceData.dueDate
      ? new Date(invoiceData.dueDate * 1000)
      : undefined,
    paidAt: undefined,
    metadata: invoiceData.metadata,
  });

  if (result.success) {
    log.info('Failed invoice recorded successfully', {
      invoiceId: invoiceData.invoiceId,
      organizationId: orgResult.data.id,
    });
  } else {
    log.error('Failed to record invoice', undefined, {
      invoiceId: invoiceData.invoiceId,
      error: result.error,
    });
  }

  // Handle payment failure
  // - Send payment failed notification
  // - Update subscription status if retry limit reached
  // - Grace period handling

  if (invoiceData.attemptCount >= 3) {
    log.critical('Payment failed 3 times', {
      invoiceId: invoiceData.invoiceId,
      subscriptionId: invoiceData.subscriptionId,
    });
    // TODO: Downgrade or suspend access
  }
}

/**
 * Handle invoice.upcoming
 * Sent ~1 week before invoice is created
 */
async function handleInvoiceUpcoming(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'invoice.upcoming')) return;

  const invoice = event.data.object;

  log.debug('Upcoming invoice', {
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    amountDue: invoice.amount_due,
  });

  // TODO: Send upcoming payment notification
}

/**
 * Handle customer.created
 * Called when a new Stripe customer is created
 */
async function handleCustomerCreated(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'customer.created')) return;

  const customer = event.data.object;
  const organizationId = getOrganizationIdFromCustomer(customer);
  const userId = getUserIdFromCustomer(customer);

  log.info('Customer created', {
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
    organizationId,
    userId,
  });

  // TODO: Link Stripe customer to organization/user in database
  // await db.update(organizations)
  //   .set({
  //     stripeCustomerId: customer.id,
  //     updatedAt: new Date(),
  //   })
  //   .where(eq(organizations.id, organizationId));
}

/**
 * Handle customer.updated
 * Called when customer details are updated
 */
async function handleCustomerUpdated(event: Stripe.Event, log: ILogger) {
  if (!isEventType(event, 'customer.updated')) return;

  const customer = event.data.object;

  log.info('Customer updated', {
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
  });

  // TODO: Update customer metadata in database if needed
}

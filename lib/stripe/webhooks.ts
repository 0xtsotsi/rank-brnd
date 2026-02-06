/**
 * Stripe Webhook Types and Handlers
 *
 * This module provides type-safe webhook event handling for Stripe.
 * All webhook signatures are verified before processing.
 */

import type Stripe from 'stripe';
import { getStripeClient, getStripeWebhookSecret } from './client';

/**
 * Supported Stripe webhook events for subscription management
 */
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.upcoming'
  | 'payment_method.attached'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted';

/**
 * Webhook event payload with typed data
 */
export interface TypedWebhookEvent {
  id: string;
  type: StripeWebhookEvent;
  data: {
    object: any;
    previous_attributes?: any;
  };
  livemode: boolean;
  created: number;
}

/**
 * Parsed webhook data for specific events
 */

export interface SubscriptionCreatedData {
  customerId: string;
  subscriptionId: string;
  status: Stripe.Subscription.Status;
  priceId: string;
  productId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialStart?: number;
  trialEnd?: number;
  metadata: Record<string, string>;
}

export interface SubscriptionUpdatedData {
  customerId: string;
  subscriptionId: string;
  status: Stripe.Subscription.Status;
  priceId: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  cancelAt?: number;
  canceledAt?: number;
  trialEnd?: number;
  metadata: Record<string, string>;
}

export interface SubscriptionDeletedData {
  customerId: string;
  subscriptionId: string;
  status: Stripe.Subscription.Status;
}

export interface InvoicePaidData {
  customerId: string;
  subscriptionId: string | null;
  invoiceId: string;
  amountPaid: number;
  currency: string;
  status: 'paid' | 'void' | 'uncollectible';
  invoicePdf?: string | null;
  hostedInvoiceUrl?: string | null;
  dueDate?: number | null;
  paidAt?: number | null;
  metadata?: Record<string, string>;
}

export interface InvoicePaymentFailedData {
  customerId: string;
  subscriptionId: string | null;
  invoiceId: string;
  amountDue: number;
  currency: string;
  attemptCount: number;
  nextPaymentAttempt: number | null;
  invoicePdf?: string | null;
  hostedInvoiceUrl?: string | null;
  dueDate?: number | null;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionCompletedData {
  sessionId: string;
  customerId: string;
  customerEmail: string;
  subscriptionId: string | null;
  mode: 'subscription' | 'payment' | 'setup';
  metadata: Record<string, string>;
}

/**
 * Extract subscription data from subscription.created event
 */
export function extractSubscriptionCreated(
  event: Stripe.CustomerSubscriptionCreatedEvent
): SubscriptionCreatedData {
  const subscription = event.data.object;
  const priceId = subscription.items.data[0]?.price.id;
  const productId = subscription.items.data[0]?.price.product as string;

  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId,
    productId,
    currentPeriodStart: (subscription as any).current_period_start,
    currentPeriodEnd: (subscription as any).current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart: subscription.trial_start ?? undefined,
    trialEnd: subscription.trial_end ?? undefined,
    metadata: subscription.metadata,
  };
}

/**
 * Extract subscription data from subscription.updated event
 */
export function extractSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent
): SubscriptionUpdatedData {
  const subscription = event.data.object;
  const priceId = subscription.items.data[0]?.price.id;

  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId,
    currentPeriodEnd: (subscription as any).current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at ?? undefined,
    canceledAt: subscription.canceled_at ?? undefined,
    trialEnd: subscription.trial_end ?? undefined,
    metadata: subscription.metadata,
  };
}

/**
 * Extract subscription data from subscription.deleted event
 */
export function extractSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent
): SubscriptionDeletedData {
  const subscription = event.data.object;

  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: subscription.status,
  };
}

/**
 * Extract invoice data from invoice.paid event
 */
export function extractInvoicePaid(
  event: Stripe.InvoicePaidEvent
): InvoicePaidData {
  const invoice = event.data.object;

  return {
    customerId: invoice.customer as string,
    subscriptionId: (invoice as any).subscription as string | null,
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    status: (invoice.status as 'paid' | 'void' | 'uncollectible') ?? 'paid',
    invoicePdf: invoice.invoice_pdf ?? null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    dueDate: invoice.due_date ?? null,
    paidAt: invoice.status_transitions.paid_at ?? null,
    metadata: invoice.metadata ?? {},
  };
}

/**
 * Extract invoice data from invoice.payment_failed event
 */
export function extractInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent
): InvoicePaymentFailedData {
  const invoice = event.data.object;

  return {
    customerId: invoice.customer as string,
    subscriptionId: (invoice as any).subscription as string | null,
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt,
    invoicePdf: invoice.invoice_pdf ?? null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    dueDate: invoice.due_date ?? null,
    metadata: invoice.metadata ?? {},
  };
}

/**
 * Extract checkout session data from checkout.session.completed event
 */
export function extractCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent
): CheckoutSessionCompletedData {
  const session = event.data.object;

  return {
    sessionId: session.id,
    customerId: session.customer as string,
    customerEmail: session.customer_details?.email || '',
    subscriptionId: session.subscription as string | null,
    mode: session.mode,
    metadata: session.metadata ?? {},
  };
}

/**
 * Webhook signature verification
 *
 * This function verifies that the webhook payload actually came from Stripe
 * by checking the signature using the webhook secret.
 *
 * @param payload - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @returns Parsed webhook event
 * @throws {Error} If signature is invalid
 */
export async function verifyStripeWebhook(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
    throw new Error('Webhook signature verification failed');
  }
}

/**
 * Type guard to check if event is of a specific type
 */
export function isEventType<T extends Stripe.Event['type']>(
  event: Stripe.Event,
  eventType: T
): event is Stripe.Event & { type: T } {
  return event.type === eventType;
}

/**
 * Get organization ID from Stripe customer metadata
 */
export function getOrganizationIdFromCustomer(
  customer: Stripe.Customer
): string | null {
  return customer.metadata?.organizationId || null;
}

/**
 * Get user ID from Stripe customer metadata
 */
export function getUserIdFromCustomer(
  customer: Stripe.Customer
): string | null {
  return customer.metadata?.userId || null;
}

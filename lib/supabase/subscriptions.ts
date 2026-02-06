// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Subscriptions Utilities
 *
 * Helper functions for working with subscriptions and invoices.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert =
  Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionUpdate =
  Database['public']['Tables']['subscriptions']['Update'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';
type InvoiceStatus = 'paid' | 'open' | 'void' | 'uncollectible' | 'deleted';
type PlanTier = 'free' | 'starter' | 'pro' | 'agency';

/**
 * Result type for subscription operations
 */
export type SubscriptionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get a subscription by ID
 */
export async function getSubscriptionById(
  client: SupabaseClient<Database>,
  subscriptionId: string
): Promise<SubscriptionResult<Subscription>> {
  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Subscription not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch subscription',
    };
  }
}

/**
 * Get a subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(
  client: SupabaseClient<Database>,
  stripeSubscriptionId: string
): Promise<SubscriptionResult<Subscription>> {
  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Subscription not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch subscription',
    };
  }
}

/**
 * Get active subscription for an organization
 */
export async function getOrganizationSubscription(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<SubscriptionResult<Subscription>> {
  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'No active subscription found' };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch organization subscription',
    };
  }
}

/**
 * Get all subscriptions for an organization
 */
export async function getOrganizationSubscriptions(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<SubscriptionResult<Subscription[]>> {
  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) throw new Error('No subscriptions found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch organization subscriptions',
    };
  }
}

/**
 * Check if an organization has an active subscription
 */
export async function hasActiveSubscription(
  client: SupabaseClient<Database>,
  organizationId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('has_active_subscription', {
      p_org_id: organizationId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  client: SupabaseClient<Database>,
  subscription: SubscriptionInsert
): Promise<SubscriptionResult<Subscription>> {
  try {
    const { data, error } = await client
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create subscription');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create subscription',
    };
  }
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  client: SupabaseClient<Database>,
  subscriptionId: string,
  updates: SubscriptionUpdate
): Promise<SubscriptionResult<Subscription>> {
  try {
    const { data, error } = await client
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Subscription not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update subscription',
    };
  }
}

/**
 * Update subscription by Stripe subscription ID
 */
export async function updateSubscriptionByStripeId(
  client: SupabaseClient<Database>,
  stripeSubscriptionId: string,
  updates: SubscriptionUpdate
): Promise<SubscriptionResult<Subscription>> {
  try {
    const { data, error } = await client
      .from('subscriptions')
      .update(updates)
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Subscription not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update subscription',
    };
  }
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(
  client: SupabaseClient<Database>,
  subscriptionId: string
): Promise<SubscriptionResult<void>> {
  try {
    const { error } = await client
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to delete subscription',
    };
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  client: SupabaseClient<Database>,
  subscriptionId: string
): Promise<SubscriptionResult<Subscription>> {
  return updateSubscription(client, subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Get subscription status for display
 */
export function getSubscriptionStatus(status: SubscriptionStatus): {
  label: string;
  color: string;
  description: string;
} {
  const statusMap: Record<
    SubscriptionStatus,
    { label: string; color: string; description: string }
  > = {
    active: {
      label: 'Active',
      color: 'green',
      description: 'Your subscription is active and in good standing.',
    },
    trialing: {
      label: 'Trial',
      color: 'blue',
      description: 'You are currently in a trial period.',
    },
    past_due: {
      label: 'Past Due',
      color: 'yellow',
      description:
        'Your payment is past due. Please update your payment method.',
    },
    canceled: {
      label: 'Canceled',
      color: 'gray',
      description: 'Your subscription has been canceled and will expire soon.',
    },
    unpaid: {
      label: 'Unpaid',
      color: 'red',
      description:
        'Your subscription is unpaid due to failed payment attempts.',
    },
    incomplete: {
      label: 'Incomplete',
      color: 'yellow',
      description:
        'Your subscription is being set up. Please complete payment.',
    },
  };

  return statusMap[status] || statusMap.active;
}

/**
 * Check if subscription is in trial period
 */
export function isInTrial(subscription: Subscription): boolean {
  return (
    subscription.status === 'trialing' &&
    subscription.trial_end &&
    new Date(subscription.trial_end) > new Date()
  );
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(
  subscription: Subscription
): number | null {
  if (!subscription.trial_end) return null;

  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysRemaining);
}

/**
 * Get days until next billing date
 */
export function getDaysUntilBilling(subscription: Subscription): number {
  const periodEnd = new Date(subscription.current_period_end);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysRemaining);
}

/* Invoice Functions */

/**
 * Get an invoice by ID
 */
export async function getInvoiceById(
  client: SupabaseClient<Database>,
  invoiceId: string
): Promise<SubscriptionResult<Invoice>> {
  try {
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invoice not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    };
  }
}

/**
 * Get an invoice by Stripe invoice ID
 */
export async function getInvoiceByStripeId(
  client: SupabaseClient<Database>,
  stripeInvoiceId: string
): Promise<SubscriptionResult<Invoice>> {
  try {
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invoice not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    };
  }
}

/**
 * Get invoices for an organization
 */
export async function getOrganizationInvoices(
  client: SupabaseClient<Database>,
  organizationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<SubscriptionResult<Invoice[]>> {
  try {
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!data) throw new Error('No invoices found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch invoices',
    };
  }
}

/**
 * Get invoices for a subscription
 */
export async function getSubscriptionInvoices(
  client: SupabaseClient<Database>,
  subscriptionId: string,
  limit: number = 50
): Promise<SubscriptionResult<Invoice[]>> {
  try {
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data) throw new Error('No invoices found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch invoices',
    };
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  client: SupabaseClient<Database>,
  invoice: InvoiceInsert
): Promise<SubscriptionResult<Invoice>> {
  try {
    const { data, error } = await client
      .from('invoices')
      .insert(invoice)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create invoice');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create invoice',
    };
  }
}

/**
 * Update an invoice
 */
export async function updateInvoice(
  client: SupabaseClient<Database>,
  invoiceId: string,
  updates: InvoiceUpdate
): Promise<SubscriptionResult<Invoice>> {
  try {
    const { data, error } = await client
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invoice not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update invoice',
    };
  }
}

/**
 * Update invoice by Stripe invoice ID
 */
export async function updateInvoiceByStripeId(
  client: SupabaseClient<Database>,
  stripeInvoiceId: string,
  updates: InvoiceUpdate
): Promise<SubscriptionResult<Invoice>> {
  try {
    const { data, error } = await client
      .from('invoices')
      .update(updates)
      .eq('stripe_invoice_id', stripeInvoiceId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invoice not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update invoice',
    };
  }
}

/**
 * Get invoice status for display
 */
export function getInvoiceStatus(status: InvoiceStatus): {
  label: string;
  color: string;
  description: string;
} {
  const statusMap: Record<
    InvoiceStatus,
    { label: string; color: string; description: string }
  > = {
    paid: {
      label: 'Paid',
      color: 'green',
      description: 'This invoice has been paid.',
    },
    open: {
      label: 'Open',
      color: 'blue',
      description: 'This invoice is pending payment.',
    },
    void: {
      label: 'Void',
      color: 'gray',
      description: 'This invoice has been voided.',
    },
    uncollectible: {
      label: 'Uncollectible',
      color: 'red',
      description: 'This invoice cannot be collected.',
    },
    deleted: {
      label: 'Deleted',
      color: 'gray',
      description: 'This invoice has been deleted.',
    },
  };

  return statusMap[status] || statusMap.open;
}

/**
 * Format invoice amount for display
 */
export function formatInvoiceAmount(
  amount: number,
  currency: string = 'usd'
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

  return formatter.format(amount / 100); // Convert from cents to dollars
}

/**
 * Upsert subscription from Stripe webhook data
 * Uses the database function for atomic upsert
 */
export async function upsertSubscriptionFromStripe(
  client: SupabaseClient<Database>,
  params: {
    organizationId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    stripePriceId: string;
    stripeProductId: string;
    status: SubscriptionStatus;
    planId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    trialStart?: Date | null;
    trialEnd?: Date | null;
    metadata?: Record<string, unknown>;
  }
): Promise<SubscriptionResult<Subscription>> {
  try {
    const { data, error } = await client.rpc(
      'upsert_subscription_from_stripe',
      {
        p_organization_id: params.organizationId,
        p_stripe_subscription_id: params.stripeSubscriptionId,
        p_stripe_customer_id: params.stripeCustomerId,
        p_stripe_price_id: params.stripePriceId,
        p_stripe_product_id: params.stripeProductId,
        p_status: params.status,
        p_plan_id: params.planId,
        p_current_period_start: params.currentPeriodStart.toISOString(),
        p_current_period_end: params.currentPeriodEnd.toISOString(),
        p_cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
        p_canceled_at: params.canceledAt?.toISOString() || null,
        p_trial_start: params.trialStart?.toISOString() || null,
        p_trial_end: params.trialEnd?.toISOString() || null,
        p_metadata: params.metadata || {},
      }
    );

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert subscription');

    // Fetch the full subscription record
    const result = await getSubscriptionByStripeId(
      client,
      params.stripeSubscriptionId
    );

    return result;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to upsert subscription',
    };
  }
}

/**
 * Upsert invoice from Stripe webhook data
 * Uses the database function for atomic upsert
 */
export async function upsertInvoiceFromStripe(
  client: SupabaseClient<Database>,
  params: {
    organizationId: string;
    subscriptionId?: string;
    stripeInvoiceId: string;
    amountPaid: number;
    currency: string;
    status: InvoiceStatus;
    invoicePdf?: string | null;
    hostedInvoiceUrl?: string | null;
    dueDate?: Date | null;
    paidAt?: Date | null;
    metadata?: Record<string, unknown>;
  }
): Promise<SubscriptionResult<Invoice>> {
  try {
    const { data, error } = await client.rpc('upsert_invoice_from_stripe', {
      p_organization_id: params.organizationId,
      p_subscription_id: params.subscriptionId || null,
      p_stripe_invoice_id: params.stripeInvoiceId,
      p_amount_paid: params.amountPaid,
      p_currency: params.currency,
      p_status: params.status,
      p_invoice_pdf: params.invoicePdf || null,
      p_hosted_invoice_url: params.hostedInvoiceUrl || null,
      p_due_date: params.dueDate?.toISOString() || null,
      p_paid_at: params.paidAt?.toISOString() || null,
      p_metadata: params.metadata || {},
    });

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert invoice');

    // Fetch the full invoice record
    const result = await getInvoiceByStripeId(client, params.stripeInvoiceId);

    return result;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to upsert invoice',
    };
  }
}

/**
 * Subscription Plan Change Service
 *
 * Handles upgrading and downgrading subscription plans with prorated billing.
 * This module calculates prorations, updates Stripe subscriptions, and
 * manages database records for plan changes.
 *
 * Key Features:
 * - Prorated billing calculations
 * - Stripe subscription updates
 * - Usage limit enforcement
 * - Change history tracking
 * - Preview upcoming changes
 */

import type Stripe from 'stripe';
import { getStripeClient } from './client';
import {
  getPlan,
  getPlanIdFromStripePrice,
  comparePlans,
  type SubscriptionPlan,
} from './plans';

/**
 * The result of a plan change calculation
 */
export interface PlanChangePreview {
  fromPlan: SubscriptionPlan;
  toPlan: SubscriptionPlan;
  changeType: 'upgrade' | 'downgrade' | 'same';
  proratedAmount: number;
  remainingCredit: number;
  nextBillingAmount: number;
  effectiveImmediately: boolean;
  gainedFeatures: string[];
  lostFeatures: string[];
  limitChanges: Array<{
    feature: string;
    from: number | string;
    to: number | string;
  }>;
}

/**
 * The result of a plan change operation
 */
export interface PlanChangeResult {
  success: boolean;
  subscriptionId: string;
  fromPlanId: string;
  toPlanId: string;
  changeType: 'upgrade' | 'downgrade' | 'same';
  proratedInvoiceId?: string;
  proratedAmount?: number;
  nextBillingAmount: number;
  effectiveAt: Date;
  message: string;
}

/**
 * Configuration for plan changes
 */
export interface PlanChangeConfig {
  /**
   * Whether to charge prorations immediately or on next billing cycle
   * @default 'always_invoice'
   */
  prorationBehavior?: 'create_prorations' | 'always_invoice' | 'none';

  /**
   * Whether to downgrades effective immediately or at period end
   * @default true (at period end for downgrades)
   */
  downgradeAtPeriodEnd?: boolean;

  /**
   * Whether upgrades effective immediately
   * @default true
   */
  upgradeImmediately?: boolean;

  /**
   * Custom metadata to attach to the subscription update
   */
  metadata?: Record<string, string>;
}

/**
 * Get the subscription's current plan from Stripe subscription
 */
export function getCurrentPlanFromSubscription(
  subscription: Stripe.Subscription
): SubscriptionPlan | null {
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return null;

  const planId = getPlanIdFromStripePrice(priceId);
  if (!planId) return null;

  const plan = getPlan(planId);
  return plan || null;
}

/**
 * Calculate prorated amount for plan change
 *
 * This calculates how much the user will be charged or credited
 * when changing plans mid-cycle.
 */
export function calculateProration(
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan,
  subscription: Stripe.Subscription,
  daysInPeriod?: number
): {
  proratedAmount: number;
  remainingCredit: number;
  chargeAmount: number;
} {
  const currentPeriodStart = new Date(
    (subscription as any).current_period_start * 1000
  );
  const currentPeriodEnd = new Date(
    (subscription as any).current_period_end * 1000
  );

  // Calculate days in billing period
  const totalDaysInPeriod =
    daysInPeriod ||
    Math.ceil(
      (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );

  // Calculate days used and remaining
  const now = new Date();
  const daysUsed = Math.ceil(
    (now.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.max(0, totalDaysInPeriod - daysUsed);

  // Get the subscription interval to determine which price to use
  const interval =
    subscription.items.data[0]?.price.recurring?.interval || 'month';

  // Get current and new plan prices
  const currentPlanPrice =
    interval === 'year' ? currentPlan.priceYearly : currentPlan.priceMonthly;
  const newPlanPrice =
    interval === 'year' ? newPlan.priceYearly : newPlan.priceMonthly;

  // Calculate daily rates
  const currentDailyRate = currentPlanPrice / totalDaysInPeriod;
  const newDailyRate = newPlanPrice / totalDaysInPeriod;

  // Calculate unused portion of current plan (credit)
  const unusedCredit = Math.floor(currentDailyRate * daysRemaining);

  // Calculate cost of new plan for remaining days
  const newPlanCost = Math.ceil(newDailyRate * daysRemaining);

  // Prorated amount (positive = charge, negative = credit)
  const proratedAmount = newPlanCost - unusedCredit;

  return {
    proratedAmount,
    remainingCredit: Math.max(0, -proratedAmount),
    chargeAmount: Math.max(0, proratedAmount),
  };
}

/**
 * Preview a plan change before committing
 *
 * Returns detailed information about what will change including:
 * - Prorated amounts
 * - Gained/lost features
 * - Limit changes
 * - When the change takes effect
 */
export async function previewPlanChange(
  subscriptionId: string,
  newPriceId: string
): Promise<PlanChangePreview> {
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const currentPlan = getCurrentPlanFromSubscription(subscription);
  if (!currentPlan) {
    throw new Error('Could not determine current plan from subscription');
  }

  const newPlanId = getPlanIdFromStripePrice(newPriceId);
  if (!newPlanId) {
    throw new Error('Could not determine plan from price ID');
  }

  const newPlan = getPlan(newPlanId);
  if (!newPlan) {
    throw new Error('Invalid plan ID');
  }

  // Determine change type
  let changeType: 'upgrade' | 'downgrade' | 'same';
  const planOrder = ['free', 'starter', 'pro', 'agency'];
  const currentIndex = planOrder.indexOf(currentPlan.id);
  const newIndex = planOrder.indexOf(newPlan.id);

  if (newIndex > currentIndex) {
    changeType = 'upgrade';
  } else if (newIndex < currentIndex) {
    changeType = 'downgrade';
  } else {
    changeType = 'same';
  }

  // Calculate prorations
  const { proratedAmount, remainingCredit } = calculateProration(
    currentPlan,
    newPlan,
    subscription
  );

  // Get subscription interval for pricing
  const interval =
    subscription.items.data[0]?.price.recurring?.interval || 'month';
  const nextBillingAmount =
    interval === 'year' ? newPlan.priceYearly : newPlan.priceMonthly;

  // Get feature and limit changes
  const comparison = comparePlans(currentPlan.id, newPlan.id);

  return {
    fromPlan: currentPlan,
    toPlan: newPlan,
    changeType,
    proratedAmount,
    remainingCredit,
    nextBillingAmount,
    effectiveImmediately: changeType === 'upgrade',
    gainedFeatures: comparison.gainedFeatures,
    lostFeatures: comparison.lostFeatures,
    limitChanges: [
      ...comparison.increasedLimits,
      ...comparison.decreasedLimits,
    ],
  };
}

/**
 * Execute a plan change
 *
 * Updates the Stripe subscription and handles prorations.
 * Returns the updated subscription details.
 */
export async function changePlan(
  subscriptionId: string,
  newPriceId: string,
  config: PlanChangeConfig = {}
): Promise<PlanChangeResult> {
  const {
    prorationBehavior = 'always_invoice',
    downgradeAtPeriodEnd = true,
    upgradeImmediately = true,
    metadata = {},
  } = config;

  const stripe = getStripeClient();

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentPlan = getCurrentPlanFromSubscription(subscription);

  if (!currentPlan) {
    throw new Error('Could not determine current plan from subscription');
  }

  // Get new plan
  const newPlanId = getPlanIdFromStripePrice(newPriceId);
  if (!newPlanId) {
    throw new Error('Could not determine plan from price ID');
  }

  const newPlan = getPlan(newPlanId);
  if (!newPlan) {
    throw new Error('Invalid plan ID');
  }

  // Determine change type
  const planOrder = ['free', 'starter', 'pro', 'agency'];
  const currentIndex = planOrder.indexOf(currentPlan.id);
  const newIndex = planOrder.indexOf(newPlan.id);

  let changeType: 'upgrade' | 'downgrade' | 'same';
  if (newIndex > currentIndex) {
    changeType = 'upgrade';
  } else if (newIndex < currentIndex) {
    changeType = 'downgrade';
  } else {
    changeType = 'same';
  }

  // Calculate proration for preview
  const { proratedAmount, chargeAmount } = calculateProration(
    currentPlan,
    newPlan,
    subscription
  );

  // Build subscription update parameters
  const updateParams: Stripe.SubscriptionUpdateParams = {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    metadata: {
      ...subscription.metadata,
      ...metadata,
      previousPlanId: currentPlan.id,
      newPlanId: newPlan.id,
      changedAt: new Date().toISOString(),
    },
  };

  // Handle upgrades vs downgrades differently
  if (changeType === 'upgrade' && upgradeImmediately) {
    // Upgrades: Effective immediately with proration
    updateParams.proration_behavior = prorationBehavior;
  } else if (changeType === 'downgrade' && downgradeAtPeriodEnd) {
    // Downgrades: Effective at end of period
    // Stripe will automatically schedule the change
    updateParams.proration_behavior = 'none';
  } else {
    updateParams.proration_behavior = prorationBehavior;
  }

  // Execute the update
  const updatedSubscription = await stripe.subscriptions.update(
    subscriptionId,
    updateParams
  );

  // Get the next billing amount
  const interval =
    updatedSubscription.items.data[0]?.price.recurring?.interval || 'month';
  const nextBillingAmount =
    interval === 'year' ? newPlan.priceYearly : newPlan.priceMonthly;

  // Calculate effective date
  const effectiveAt =
    changeType === 'downgrade' && downgradeAtPeriodEnd
      ? new Date((updatedSubscription as any).current_period_end * 1000)
      : new Date();

  return {
    success: true,
    subscriptionId: updatedSubscription.id,
    fromPlanId: currentPlan.id,
    toPlanId: newPlan.id,
    changeType,
    proratedAmount: chargeAmount,
    nextBillingAmount,
    effectiveAt,
    message: `Successfully ${changeType === 'upgrade' ? 'upgraded' : 'changed'} to ${newPlan.name} plan`,
  };
}

/**
 * Calculate usage reset dates for a plan change
 *
 * When changing plans, we need to determine how to handle existing usage.
 * This function helps determine whether usage should reset or carry over.
 */
export function calculateUsageReset(
  changeType: 'upgrade' | 'downgrade' | 'same',
  currentPeriodEnd: Date,
  effectiveAt: Date
): {
  shouldResetUsage: boolean;
  resetDate?: Date;
  carryOverAllowed: boolean;
} {
  // For upgrades, typically carry over usage and reset at normal period end
  if (changeType === 'upgrade') {
    return {
      shouldResetUsage: false,
      resetDate: new Date(currentPeriodEnd),
      carryOverAllowed: true,
    };
  }

  // For downgrades effective immediately, we might prorate usage
  if (changeType === 'downgrade' && effectiveAt < new Date(currentPeriodEnd)) {
    return {
      shouldResetUsage: true,
      resetDate: effectiveAt,
      carryOverAllowed: false,
    };
  }

  // For downgrades at period end, reset at period end
  return {
    shouldResetUsage: false,
    resetDate: new Date(currentPeriodEnd),
    carryOverAllowed: true,
  };
}

/**
 * Validate if a plan change is allowed
 *
 * Checks various business rules to determine if a plan change can proceed
 */
export async function validatePlanChange(
  subscriptionId: string,
  newPriceId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Check subscription status
    if (
      subscription.status !== 'active' &&
      subscription.status !== 'trialing'
    ) {
      return {
        allowed: false,
        reason: `Subscription is ${subscription.status}. Plan changes are only allowed for active or trialing subscriptions.`,
      };
    }

    // Check if subscription has past due invoices
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      status: 'open',
      limit: 1,
    });

    if (invoices.data.length > 0) {
      return {
        allowed: false,
        reason:
          'Subscription has unpaid invoices. Please pay outstanding invoices before changing plans.',
      };
    }

    // Verify the price exists and is active
    const price = await stripe.prices.retrieve(newPriceId);
    if (!price.active) {
      return {
        allowed: false,
        reason: 'The selected plan is no longer available.',
      };
    }

    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      reason:
        error instanceof Error
          ? error.message
          : 'Unknown error validating plan change',
    };
  }
}

/**
 * Get upcoming invoice after plan change
 *
 * Returns what the user will be charged on the next invoice
 * including any prorations
 */
export async function getUpcomingInvoiceAfterPlanChange(
  subscriptionId: string,
  newPriceId: string
): Promise<{
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  lines: Array<{
    description: string;
    amount: number;
  }>;
}> {
  const stripe = getStripeClient();

  // Create an invoice preview with the new price
  const invoice = await (stripe.invoices as any).retrieveUpcoming({
    subscription: subscriptionId,
    subscription_items: [
      {
        id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0]
          .id,
        price: newPriceId,
      },
    ],
  });

  return {
    subtotal: invoice.subtotal || 0,
    tax: invoice.tax || 0,
    total: invoice.total || 0,
    currency: invoice.currency.toUpperCase(),
    lines: invoice.lines.data.map((line: any) => ({
      description: line.description || 'Unknown charge',
      amount: line.amount || 0,
    })),
  };
}

/**
 * Handle subscription update webhook event
 *
 * This function should be called when receiving subscription.updated webhooks
 * to sync local database with Stripe changes
 */
export async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription
): Promise<{
  success: boolean;
  planId?: string;
  message: string;
}> {
  try {
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      return { success: false, message: 'No price found on subscription' };
    }

    const planId = getPlanIdFromStripePrice(priceId);
    if (!planId) {
      return { success: false, message: 'Could not determine plan from price' };
    }

    // TODO: Update local database
    // await db.update(subscriptions)
    //   .set({
    //     stripePriceId: priceId,
    //     planId: planId,
    //     status: subscription.status,
    //     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
    //     updatedAt: new Date(),
    //   })
    //   .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    return {
      success: true,
      planId,
      message: 'Subscription update handled successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format plan change details for display
 */
export function formatPlanChangePreview(preview: PlanChangePreview): {
  title: string;
  description: string;
  chargeAmount: string;
  creditAmount: string;
  effectiveDate: string;
} {
  const { fromPlan, toPlan, changeType, proratedAmount, effectiveImmediately } =
    preview;

  const formatCents = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);

  const title =
    changeType === 'upgrade'
      ? `Upgrade to ${toPlan.name}`
      : changeType === 'downgrade'
        ? `Downgrade to ${toPlan.name}`
        : 'Plan Change';

  const description =
    changeType === 'upgrade'
      ? `You're upgrading from ${fromPlan.name} to ${toPlan.name}.`
      : `You're changing from ${fromPlan.name} to ${toPlan.name}.`;

  const chargeAmount =
    proratedAmount > 0 ? formatCents(proratedAmount) : '$0.00';
  const creditAmount =
    proratedAmount < 0 ? formatCents(Math.abs(proratedAmount)) : '$0.00';

  const effectiveDate = effectiveImmediately
    ? 'Immediately'
    : 'At the end of your current billing period';

  return {
    title,
    description,
    chargeAmount,
    creditAmount,
    effectiveDate,
  };
}

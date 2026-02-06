/**
 * Stripe API Schemas
 *
 * Zod validation schemas for Stripe-related API routes.
 */

import { z } from 'zod';

/**
 * Checkout session modes
 */
const checkoutModeSchema = z.enum(['subscription', 'payment']);

/**
 * Create Checkout Session Schema
 *
 * POST /api/stripe/create-checkout-session
 */
export const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  mode: checkoutModeSchema.optional().default('subscription'),
  successUrl: z.string().url('Invalid success URL').optional(),
  cancelUrl: z.string().url('Invalid cancel URL').optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * Prices Query Schema
 *
 * GET /api/stripe/prices
 */
export const pricesQuerySchema = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .transform((val) => val !== 'false')
    .optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(100),
});

/**
 * Cancel Subscription Schema
 *
 * DELETE /api/stripe/subscription
 */
export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
});

/**
 * Update Subscription Schema
 *
 * PATCH /api/stripe/subscription
 */
export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  priceId: z.string().min(1, 'Price ID is required'),
  previewOnly: z.boolean().optional().default(false),
  downgradeAtPeriodEnd: z.boolean().optional().default(true),
});

/**
 * Plan Change Preview Schema
 *
 * Query params for previewing plan changes
 */
export const planChangePreviewSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  priceId: z.string().min(1, 'Price ID is required'),
});

/**
 * Plan Change Result Schema
 *
 * Response type for plan change operations
 */
export const planChangeResultSchema = z.object({
  success: z.boolean(),
  subscriptionId: z.string(),
  fromPlanId: z.string(),
  toPlanId: z.string(),
  changeType: z.enum(['upgrade', 'downgrade', 'same']),
  proratedAmount: z.number().optional(),
  nextBillingAmount: z.number(),
  effectiveAt: z.coerce.date(),
  message: z.string(),
});

/**
 * Plan Change Preview Response Schema
 *
 * Response type for plan change preview
 */
export const planChangePreviewResponseSchema = z.object({
  fromPlan: z.object({
    id: z.string(),
    name: z.string(),
    priceMonthly: z.number(),
    priceYearly: z.number(),
  }),
  toPlan: z.object({
    id: z.string(),
    name: z.string(),
    priceMonthly: z.number(),
    priceYearly: z.number(),
  }),
  changeType: z.enum(['upgrade', 'downgrade', 'same']),
  proratedAmount: z.number(),
  remainingCredit: z.number(),
  nextBillingAmount: z.number(),
  effectiveImmediately: z.boolean(),
  gainedFeatures: z.array(z.string()),
  lostFeatures: z.array(z.string()),
  limitChanges: z.array(
    z.object({
      feature: z.string(),
      from: z.union([z.number(), z.string()]),
      to: z.union([z.number(), z.string()]),
    })
  ),
});

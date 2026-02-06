/**
 * Stripe Client Configuration
 *
 * This file provides secure Stripe client instances for various operations.
 * All API operations are performed server-side to protect the secret key.
 *
 * Security Features:
 * - Secret key never exposed to client
 * - All Stripe operations on server-side
 * - Webhook signature verification
 * - httpOnly cookies for authentication (via Clerk)
 */

import Stripe from 'stripe';

// Environment variable validation
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/**
 * Validates that required Stripe environment variables are set
 */
function validateStripeEnv() {
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  if (!stripePublishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable'
    );
  }
}

/**
 * Get Stripe publishable key for client-side usage
 * This key is safe to expose to the browser
 */
export function getStripePublishableKey(): string {
  if (!stripePublishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable'
    );
  }
  return stripePublishableKey;
}

/**
 * Get Stripe webhook secret
 * Used for verifying webhook signatures
 */
export function getStripeWebhookSecret(): string {
  if (!stripeWebhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }
  return stripeWebhookSecret;
}

/**
 * Server-side Stripe Client
 *
 * Use this client for all server-side Stripe operations.
 *
 * WARNING: Never expose this client or the secret key to the browser.
 * Only use this in:
 * - API routes
 * - Server components
 * - Server actions
 *
 * Security: The secret key is stored in environment variables and
 * never exposed to the client, protecting against XSS attacks.
 */
let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  // Validate environment on first access
  validateStripeEnv();

  // Return cached instance if available
  if (stripeInstance) {
    return stripeInstance;
  }

  // Create new Stripe instance
  // Note: Using the latest stable API version supported by the Stripe SDK
  stripeInstance = new Stripe(stripeSecretKey!, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
    // Use Telemetry to help Stripe improve their API
    telemetry: true,
  });

  return stripeInstance;
}

/**
 * Stripe Configuration Types
 */

export interface StripePrice {
  id: string;
  productId: string;
  unitAmount: number;
  currency: string;
  interval?: 'month' | 'year';
  intervalCount?: number;
  trialPeriodDays?: number | null;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  prices: StripePrice[];
  metadata: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  status: Stripe.Subscription.Status;
  priceId: string;
  productId: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialEnd: number | null;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name: string | null;
  metadata: Record<string, string>;
}

/**
 * Helper function to format amount for display
 */
export function formatStripeAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  return formatted;
}

/**
 * Helper function to calculate prorated amount
 */
export function calculateProratedAmount(
  amount: number,
  daysUsed: number,
  daysInPeriod: number
): number {
  return Math.floor((amount * daysUsed) / daysInPeriod);
}

/**
 * Convert Stripe timestamp to JavaScript Date
 */
export function stripeTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Convert JavaScript Date to Stripe timestamp
 */
export function dateToStripeTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

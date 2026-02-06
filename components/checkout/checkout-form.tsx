'use client';

/**
 * Checkout Form Component
 *
 * Renders the Stripe Payment Element for embedded checkout.
 * Handles payment confirmation and subscription creation.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Lock, AlertCircle, Check } from 'lucide-react';
import type { BillingInterval } from '@/types/subscription';

interface CheckoutFormProps {
  planId: string;
  interval: BillingInterval;
  paymentIntentId: string | null;
  formattedPrice: string;
  onCancel: () => void;
}

export function CheckoutForm({
  planId,
  interval,
  paymentIntentId,
  formattedPrice,
  onCancel,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || isProcessing || isComplete) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Confirm the payment
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/checkout/success?plan=${planId}&interval=${interval}`,
        receipt_email: email || undefined,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setIsProcessing(false);
      return;
    }

    // If no redirect needed, payment succeeded
    // Now create the subscription
    try {
      const response = await fetch('/api/stripe/confirm-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          planId,
          interval,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create subscription');
      }

      setIsComplete(true);

      // Redirect to success page
      setTimeout(() => {
        router.push(
          `/dashboard/checkout/success?plan=${planId}&interval=${interval}`
        );
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create subscription'
      );
      setIsProcessing(false);
    }
  };

  // Complete state
  if (isComplete) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Payment Successful!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your subscription...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email (optional - for receipt) */}
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email for receipt (optional)
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      {/* Payment Element */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Card Information
        </label>
        <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-400">
              Payment Error
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Terms */}
      <p className="text-xs text-gray-600 dark:text-gray-400">
        By completing your purchase, you agree to our{' '}
        <a
          href="/terms"
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Privacy Policy
        </a>
        . Subscription auto-renews at the end of each billing period.
      </p>

      {/* Submit Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-5 w-5" />
              Pay {formattedPrice}
            </>
          )}
        </button>
      </div>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Lock className="h-3 w-3" />
        <span>Your payment information is encrypted and secure</span>
      </div>
    </form>
  );
}

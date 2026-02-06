'use client';

/**
 * Checkout Page
 *
 * Displays an embedded Stripe payment form for plan checkout.
 * Uses Stripe Elements for a seamless payment experience.
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { Lock, Check, AlertCircle, CreditCard, Calendar } from 'lucide-react';
import { getPlan } from '@/lib/stripe/plans';
import { getStripePublishableKey } from '@/lib/stripe/client';
import type { BillingInterval } from '@/types/subscription';

// Load Stripe outside component render to avoid recreating on each render
const stripePromise = loadStripe(getStripePublishableKey());

interface CheckoutState {
  clientSecret: string | null;
  paymentIntentId: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planId = searchParams.get('plan') || 'starter';
  const interval = (searchParams.get('interval') as BillingInterval) || 'month';

  const [state, setState] = useState<CheckoutState>({
    clientSecret: null,
    paymentIntentId: null,
    isLoading: true,
    error: null,
  });

  // Get plan details
  const plan = useMemo(() => getPlan(planId), [planId]);

  // Calculate price
  const price = interval === 'year' ? plan?.priceYearly : plan?.priceMonthly;
  const formattedPrice = price ? `$${(price / 100).toFixed(2)}` : 'N/A';
  const period = interval === 'year' ? 'year' : 'month';

  // Calculate savings for yearly
  const savings = useMemo(() => {
    if (interval === 'year' && plan) {
      const monthlyTotal = plan.priceMonthly * 12;
      const savingsAmount = monthlyTotal - plan.priceYearly;
      if (savingsAmount > 0) {
        return {
          amount: `$${(savingsAmount / 100).toFixed(2)}`,
          percentage: Math.round((savingsAmount / monthlyTotal) * 100),
        };
      }
    }
    return null;
  }, [plan, interval]);

  // Trial days
  const trialDays = plan?.metadata.trialDays || 0;

  // Create payment intent on mount
  useEffect(() => {
    if (!plan || price === 0) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Invalid plan selected',
      }));
      return;
    }

    let isMounted = true;

    async function createPaymentIntent() {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: price,
            currency: 'usd',
            planId,
            interval,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create payment intent');
        }

        const { clientSecret, paymentIntentId } = await response.json();

        if (!isMounted) return;

        setState((prev) => ({
          ...prev,
          clientSecret,
          paymentIntentId,
          isLoading: false,
        }));
      } catch (err) {
        if (!isMounted) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to initialize checkout',
        }));
      }
    }

    createPaymentIntent();

    return () => {
      isMounted = false;
    };
  }, [planId, interval, plan, price]);

  const handleCancel = () => {
    router.push('/dashboard/pricing');
  };

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400" />
          <p className="text-gray-600 dark:text-gray-400">
            Setting up checkout...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error && !state.clientSecret) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Checkout Error
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">{state.error}</p>
          <button
            onClick={handleCancel}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  // No client secret
  if (!state.clientSecret) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Unable to initialize checkout
          </h2>
          <button
            onClick={handleCancel}
            className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#6366f1',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
    },
  };

  const options = {
    clientSecret: state.clientSecret,
    appearance,
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center text-sm text-gray-600 dark:text-gray-400">
        <button
          onClick={handleCancel}
          className="hover:text-gray-900 dark:hover:text-white"
        >
          Pricing
        </button>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white">Checkout</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Order Summary
            </h2>

            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">
                  {plan?.name} Plan
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formattedPrice}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Billed {period === 'year' ? 'annually' : 'monthly'}
              </p>
            </div>

            {savings && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-sm font-medium text-green-800 dark:text-green-400">
                  You&apos;re saving {savings.amount} ({savings.percentage}%)
                </p>
              </div>
            )}

            {trialDays > 0 && (
              <div className="mb-4 rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/20">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm font-medium text-indigo-800 dark:text-indigo-400">
                    {trialDays}-day free trial
                  </p>
                </div>
                <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                  Cancel anytime before trial ends
                </p>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formattedPrice}
                </span>
              </div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Calculated at next step
                </span>
              </div>
              <div className="mt-4 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {formattedPrice}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                What&apos;s included:
              </h3>
              <ul className="space-y-2 text-sm">
                {plan && plan.limits.articlesPerMonth !== -1 && (
                  <li className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Articles/month
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {plan.limits.articlesPerMonth.toLocaleString()}
                    </span>
                  </li>
                )}
                {plan && plan.limits.aiWordsPerMonth !== -1 && (
                  <li className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      AI words/month
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {plan.limits.aiWordsPerMonth.toLocaleString()}
                    </span>
                  </li>
                )}
                {plan && plan.limits.keywordResearchPerMonth !== -1 && (
                  <li className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Keywords/month
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {plan.limits.keywordResearchPerMonth.toLocaleString()}
                    </span>
                  </li>
                )}
                {plan &&
                  plan.limits.teamMembers &&
                  plan.limits.teamMembers > 0 && (
                    <li className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Team members
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {plan.limits.teamMembers}
                      </span>
                    </li>
                  )}
              </ul>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Payment Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Secure payment powered by Stripe
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-sm text-gray-500">
                <Lock className="h-4 w-4" />
                <span>Secure</span>
              </div>
            </div>

            {stripePromise && state.clientSecret && (
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm
                  planId={planId}
                  interval={interval}
                  paymentIntentId={state.paymentIntentId}
                  formattedPrice={formattedPrice}
                  onCancel={handleCancel}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

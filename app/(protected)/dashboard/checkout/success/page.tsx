'use client';

/**
 * Checkout Success Page
 *
 * Displays after successful payment and subscription creation.
 * Shows confirmation of the new subscription and next steps.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Check,
  X,
  ArrowRight,
  Calendar,
  Settings,
  FileText,
} from 'lucide-react';
import { getPlan } from '@/lib/stripe/plans';
import type { BillingInterval } from '@/types/subscription';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planId = searchParams.get('plan') || 'starter';
  const interval = (searchParams.get('interval') as BillingInterval) || 'month';
  const paymentIntent = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const [plan, setPlan] = useState(getPlan(planId));
  const [isRedirecting, setIsRedirecting] = useState(false);

  const price = interval === 'year' ? plan?.priceYearly : plan?.priceMonthly;
  const formattedPrice = price ? `$${(price / 100).toFixed(2)}` : 'N/A';
  const period = interval === 'year' ? 'year' : 'month';

  // Countdown for redirect
  const [countdown, setCountdown] = useState(10);

  const handleGoToDashboard = useCallback(() => {
    setIsRedirecting(true);
    router.push('/dashboard');
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) {
      handleGoToDashboard();
      return;
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, handleGoToDashboard]);

  const success = !paymentIntent || redirectStatus === 'succeeded';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card overflow-hidden p-8">
        {/* Success Icon */}
        <div className="mb-6 text-center">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
              success
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }`}
          >
            {success ? (
              <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
            ) : (
              <X className="h-10 w-10 text-red-600 dark:text-red-400" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {success ? 'Payment Successful!' : 'Payment Failed'}
          </h1>

          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {success
              ? `You are now subscribed to the ${plan?.name} plan`
              : 'There was an issue processing your payment'}
          </p>
        </div>

        {success && (
          <>
            {/* Order Details */}
            <div className="mb-8 rounded-lg bg-gray-50 p-6 dark:bg-gray-800/50">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Subscription Details
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Plan</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {plan?.name}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Billing
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formattedPrice}/{period}
                  </span>
                </div>

                {plan?.metadata.trialDays && plan.metadata.trialDays > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Trial period
                    </span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">
                      {plan.metadata.trialDays} days free
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Status
                  </span>
                  <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                What&apos;s Next?
              </h2>

              <div className="space-y-3">
                <NextStep
                  icon={<FileText className="h-5 w-5" />}
                  title="Create Your First Article"
                  description="Start generating SEO-optimized content with AI"
                  href="/dashboard/articles/new"
                />

                <NextStep
                  icon={<Calendar className="h-5 w-5" />}
                  title="Plan Your Content Calendar"
                  description="Schedule and organize your content strategy"
                  href="/dashboard/planner"
                />

                <NextStep
                  icon={<Settings className="h-5 w-5" />}
                  title="Configure Your Brand Voice"
                  description="Teach the AI your unique brand style"
                  href="/dashboard/settings/brand"
                />
              </div>
            </div>

            {/* Redirect Timer */}
            <div className="mb-6 rounded-lg bg-indigo-50 p-4 text-center dark:bg-indigo-900/20">
              <p className="text-sm text-indigo-800 dark:text-indigo-400">
                Redirecting to dashboard in{' '}
                <span className="font-bold">{countdown}</span> seconds...
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                onClick={() => router.push('/dashboard/pricing')}
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                View All Plans
              </button>

              <button
                onClick={handleGoToDashboard}
                disabled={isRedirecting}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}

        {!success && (
          <div className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-400">
              Please try again or contact support if the problem persists.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                onClick={() => router.push('/dashboard/pricing')}
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Back to Pricing
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/dashboard/checkout?plan=${planId}&interval=${interval}`
                  )
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Try Again
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Support Note */}
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Need help? Contact us at{' '}
        <a
          href="mailto:support@rank.brnd"
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          support@rank.brnd
        </a>
      </p>
    </div>
  );
}

interface NextStepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

function NextStep({ icon, title, description, href }: NextStepProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
    </button>
  );
}

'use client';

/**
 * Current Plan Card Component
 *
 * Displays the user's current subscription plan with details and actions.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  Calendar,
  CreditCard,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FEATURES } from '@/lib/stripe/plans';
import { cn } from '@/lib/utils';

interface CurrentPlanCardProps {
  subscription: {
    id: string;
    status: string;
    planId: string;
    planName: string;
    planDescription: string;
    priceMonthly: string;
    priceYearly: string;
    interval: 'month' | 'year';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    daysUntilBilling: number;
    cancelAtPeriodEnd: boolean;
    willCancelAtPeriodEnd: boolean;
    isTrial: boolean;
    trialDaysRemaining: number | null;
    stripeSubscriptionId: string;
  };
  plan: {
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    currency: string;
    features: string[];
    limits: Record<string, number>;
    metadata: {
      tier: string;
      popularity?: string;
      trialDays?: number;
    };
  };
  onCancelSubscription?: () => void;
  onChangePlan?: () => void;
  isLoading?: boolean;
}

export function CurrentPlanCard({
  subscription,
  plan,
  onCancelSubscription,
  onChangePlan,
  isLoading = false,
}: CurrentPlanCardProps) {
  const [showDetails, setShowDetails] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const statusColors: Record<
    string,
    { bg: string; text: string; icon: string }
  > = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-400',
      icon: 'text-green-600 dark:text-green-400',
    },
    trialing: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-400',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    past_due: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-400',
      icon: 'text-yellow-600 dark:text-yellow-400',
    },
    canceled: {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-800 dark:text-gray-400',
      icon: 'text-gray-600 dark:text-gray-400',
    },
  };

  const statusInfo = statusColors[subscription.status] || statusColors.active;

  const formattedPrice =
    subscription.interval === 'year'
      ? subscription.priceYearly
      : subscription.priceMonthly;

  // Get features for this plan
  const planFeatures = plan.features.map(
    (key) => FEATURES[key as keyof typeof FEATURES]
  );

  // Group features by category
  const featuresByCategory = planFeatures.reduce(
    (acc, feature) => {
      if (!feature) return acc;
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    },
    {} as Record<string, typeof planFeatures>
  );

  const categoryOrder: Array<
    'content' | 'seo' | 'publishing' | 'api' | 'team' | 'analytics' | 'support'
  > = ['content', 'seo', 'publishing', 'api', 'team', 'analytics', 'support'];

  const handleCancel = async () => {
    if (onCancelSubscription) {
      await onCancelSubscription();
      setShowCancelConfirm(false);
    }
  };

  return (
    <div className="card overflow-hidden" data-testid="current-plan-card">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 dark:bg-indigo-900/30 p-3">
              <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Current Plan
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your subscription and billing
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Plan Status */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {subscription.planName}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                        statusInfo.bg,
                        statusInfo.text
                      )}
                    >
                      {subscription.status === 'active' &&
                      !subscription.willCancelAtPeriodEnd
                        ? 'Active'
                        : subscription.willCancelAtPeriodEnd
                          ? 'Canceling'
                          : subscription.status.charAt(0).toUpperCase() +
                            subscription.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subscription.planDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {subscription.isTrial &&
                  subscription.trialDaysRemaining !== null && (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          {subscription.trialDaysRemaining} days left in trial
                        </span>
                      </div>
                    </div>
                  )}

                {!subscription.isTrial && (
                  <div className="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {subscription.daysUntilBilling} days until renewal
                      </span>
                    </div>
                  </div>
                )}

                <Link
                  href="/dashboard/pricing"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {plan.priceMonthly === 0 ? 'Upgrade Plan' : 'Change Plan'}
                </Link>
              </div>
            </div>
          </div>

          {/* Cancelation Warning */}
          {subscription.willCancelAtPeriodEnd && (
            <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 px-6 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-300">
                    Subscription Canceling
                  </h4>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                    Your subscription will be canceled on{' '}
                    {new Date(
                      subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                    . You will continue to have access until then.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formattedPrice}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                /{subscription.interval === 'year' ? 'year' : 'month'}
              </span>
              {plan.priceMonthly > 0 && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Billed{' '}
                  {subscription.interval === 'year' ? 'annually' : 'monthly'}
                </span>
              )}
            </div>
            {plan.priceYearly > 0 && subscription.interval === 'year' && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                You&apos;re saving 20% with annual billing
              </p>
            )}
          </div>

          {/* Features */}
          <div className="px-6 py-4">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Plan Features
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryOrder.map((category) => {
                const categoryFeatures = featuresByCategory[category];
                if (!categoryFeatures || categoryFeatures.length === 0)
                  return null;

                const categoryTitles: Record<string, string> = {
                  content: 'Content',
                  seo: 'SEO Tools',
                  publishing: 'Publishing',
                  api: 'API & Automation',
                  team: 'Team',
                  analytics: 'Analytics',
                  support: 'Support',
                };

                return (
                  <div key={category} className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {categoryTitles[category]}
                    </h5>
                    <ul className="space-y-1.5">
                      {categoryFeatures.map((feature) => (
                        <li
                          key={feature.key}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Usage Limits */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-6 py-4">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Usage Limits
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <LimitItem
                label="Articles/month"
                value={plan.limits.articlesPerMonth}
              />
              <LimitItem
                label="AI words/month"
                value={plan.limits.aiWordsPerMonth}
              />
              <LimitItem
                label="Keywords/month"
                value={plan.limits.keywordResearchPerMonth}
              />
              <LimitItem label="Team members" value={plan.limits.teamMembers} />
            </div>
          </div>

          {/* Actions */}
          {plan.priceMonthly > 0 && !subscription.willCancelAtPeriodEnd && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Need to make changes to your subscription?
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/pricing"
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {plan.priceMonthly > 0
                      ? 'Upgrade or Downgrade'
                      : 'View Plans'}
                  </Link>
                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel Subscription
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-2 dark:border-red-900 dark:bg-red-900/20">
                      <span className="text-sm text-red-900 dark:text-red-300">
                        Are you sure?
                      </span>
                      <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Yes, Cancel
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="rounded-lg px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/30"
                      >
                        Keep Plan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Undo Cancellation */}
          {subscription.willCancelAtPeriodEnd && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Want to keep your subscription?
                  </h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    You can undo the cancellation and continue enjoying your
                    plan benefits.
                  </p>
                </div>
                <button
                  onClick={onChangePlan}
                  disabled={isLoading}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Undo Cancellation
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface LimitItemProps {
  label: string;
  value: number;
}

function LimitItem({ label, value }: LimitItemProps) {
  const displayValue = value === -1 ? 'Unlimited' : value.toLocaleString();

  return (
    <div className="flex justify-between rounded-lg bg-white dark:bg-gray-800 px-3 py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {displayValue}
      </span>
    </div>
  );
}

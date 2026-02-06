'use client';

/**
 * Pricing Card Component
 *
 * Displays a subscription plan with features, pricing, and CTA button.
 * Supports both monthly and yearly billing intervals.
 */

import { Check, X } from 'lucide-react';
import { FEATURES, type SubscriptionPlan } from '@/lib/stripe/plans';
import type { BillingInterval } from '@/types/subscription';

interface PricingCardProps {
  plan: SubscriptionPlan;
  currentPlanId?: string;
  interval: BillingInterval;
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
}

export function PricingCard({
  plan,
  currentPlanId,
  interval,
  onSelectPlan,
  isLoading,
}: PricingCardProps) {
  const isCurrentPlan = currentPlanId === plan.id;
  const price = interval === 'year' ? plan.priceYearly : plan.priceMonthly;
  const formattedPrice = price === 0 ? 'Free' : `$${price / 100}`;

  // Calculate yearly savings for display
  const savings =
    interval === 'year' && plan.priceYearly > 0
      ? Math.round(
          ((plan.priceMonthly * 12 - plan.priceYearly) /
            (plan.priceMonthly * 12)) *
            100
        )
      : 0;

  const isPopular = plan.metadata.popularity === 'most-popular';
  const isBestValue = plan.metadata.popularity === 'best-value';

  // Get features for this plan
  const planFeatures = plan.features.map((key) => FEATURES[key]);

  // Group features by category
  const featuresByCategory = planFeatures.reduce(
    (acc, feature) => {
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

  return (
    <div
      className={`card relative flex flex-col p-6 transition-all duration-300 ${
        isCurrentPlan
          ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500 dark:ring-indigo-400'
          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'
      }`}
    >
      {/* Popular Badge */}
      {(isPopular || isBestValue) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-1 text-xs font-semibold text-white shadow-lg">
            {isPopular ? 'Most Popular' : 'Best Value'}
          </span>
        </div>
      )}

      {/* Plan Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {plan.name}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {plan.description}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            {formattedPrice}
          </span>
          {price > 0 && (
            <span className="text-gray-600 dark:text-gray-400">
              /{interval === 'year' ? 'year' : 'month'}
            </span>
          )}
        </div>
        {interval === 'year' && price > 0 && savings > 0 && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            Save {savings}% compared to monthly
          </p>
        )}
        {plan.metadata.trialDays && !isCurrentPlan && (
          <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
            {plan.metadata.trialDays}-day free trial
          </p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onSelectPlan(plan.id)}
        disabled={isCurrentPlan || isLoading}
        className={`
          mb-6 w-full rounded-lg px-4 py-3 font-semibold transition-all duration-200
          ${
            isCurrentPlan
              ? 'cursor-default bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              : isPopular || isBestValue
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isLoading
          ? 'Loading...'
          : isCurrentPlan
            ? 'Current Plan'
            : price === 0
              ? 'Get Started'
              : 'Upgrade'}
      </button>

      {/* Features List */}
      <div className="flex-1 space-y-4">
        {categoryOrder.map((category) => {
          const categoryFeatures = featuresByCategory[category];
          if (!categoryFeatures || categoryFeatures.length === 0) return null;

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
            <div key={category}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {categoryTitles[category]}
              </h4>
              <ul className="space-y-2">
                {categoryFeatures.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Limits */}
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Usage Limits
        </h4>
        <ul className="space-y-1 text-sm">
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
        </ul>
      </div>
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
    <li className="flex justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">
        {displayValue}
      </span>
    </li>
  );
}

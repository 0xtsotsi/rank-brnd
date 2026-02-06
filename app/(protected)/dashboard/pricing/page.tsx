'use client';

/**
 * Pricing Page
 *
 * Displays subscription plans with a comparison table and upgrade options.
 * Users can switch between monthly and yearly billing intervals.
 */

import { useState } from 'react';
import { Zap, Calendar } from 'lucide-react';
import { PricingCard } from '@/components/pricing/pricing-card';
import { PricingComparisonTable } from '@/components/pricing/pricing-comparison-table';
import { getAllPlans } from '@/lib/stripe/plans';
import type { BillingInterval } from '@/types/subscription';

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [isLoading, setIsLoading] = useState(false);

  const plans = getAllPlans();

  const handleSelectPlan = async (planId: string) => {
    setIsLoading(true);

    try {
      // Redirect to checkout page with Stripe embedded payment form
      window.location.href = `/dashboard/checkout?plan=${planId}&interval=${interval}`;
    } catch (error) {
      console.error('Error selecting plan:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          Choose Your Plan
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Scale your content marketing with the right plan for your needs
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span
          className={`text-sm font-medium ${
            interval === 'month'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Monthly
        </span>
        <button
          onClick={() => setInterval(interval === 'month' ? 'year' : 'month')}
          className={`
            relative inline-flex h-7 w-14 items-center rounded-full
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            ${interval === 'year' ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}
          `}
          aria-pressed={interval === 'year'}
          aria-label="Toggle billing interval"
        >
          <span
            className={`
              inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out
              ${interval === 'year' ? 'translate-x-8' : 'translate-x-1'}
            `}
          />
        </button>
        <span
          className={`text-sm font-medium ${
            interval === 'year'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Yearly
        </span>
        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <Calendar className="mr-1 h-3 w-3" />
          Save 20%
        </span>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            interval={interval}
            onSelectPlan={handleSelectPlan}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* FAQ Section */}
      <div className="card p-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Frequently Asked Questions
        </h2>
        <dl className="space-y-6">
          <FAQItem
            question="Can I change plans later?"
            answer="Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, you'll receive a credit towards future billing."
          />
          <FAQItem
            question="What happens when I hit my usage limits?"
            answer="You'll receive notifications when you approach your limits. You can either upgrade your plan or purchase additional quota. Your content will continue to work, but AI generation will pause until your limits reset."
          />
          <FAQItem
            question="Is there a free trial for paid plans?"
            answer="Yes! Starter and Pro plans come with a 14-day free trial. The Agency plan includes a 30-day trial. No credit card required to start."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. For Enterprise plans, we also offer invoicing and wire transfer options."
          />
          <FAQItem
            question="Can I cancel anytime?"
            answer="Absolutely! You can cancel your subscription at any time. You'll continue to have access to your plan until the end of your billing period, with no additional charges."
          />
        </dl>
      </div>

      {/* Comparison Table */}
      <div>
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Compare All Plans
        </h2>
        <PricingComparisonTable />
      </div>

      {/* Enterprise CTA */}
      <div className="card overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
        <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left">
          <div className="mb-6 md:mb-0 md:mr-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Zap className="h-8 w-8" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold">Need an Enterprise Solution?</h3>
            <p className="mt-2 text-indigo-100">
              Custom integrations, dedicated support, SLA guarantees, and
              flexible pricing for large teams. Let&apos;s build something great
              together.
            </p>
            <button
              onClick={() =>
                (window.location.href = 'mailto:enterprise@rank.brnd')
              }
              className="mt-6 inline-flex items-center rounded-lg bg-white px-6 py-3 font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <div>
      <dt className="text-lg font-semibold text-gray-900 dark:text-white">
        {question}
      </dt>
      <dd className="mt-2 text-gray-600 dark:text-gray-400">{answer}</dd>
    </div>
  );
}

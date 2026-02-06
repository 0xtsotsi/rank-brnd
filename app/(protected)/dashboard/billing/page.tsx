'use client';

/**
 * Subscription Management Page
 *
 * Comprehensive page showing:
 * - Current plan details with upgrade/downgrade options
 * - Usage statistics and quotas
 * - Billing history with invoice download
 * - Cancel subscription option
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CurrentPlanCard,
  UsageOverviewCard,
  BillingHistoryCard,
} from '@/components/subscription';
import { Shell } from '@/components/layout/shell';
import { UsageQuotaInfo } from '@/types/usage';

interface SubscriptionData {
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
}

interface InvoiceData {
  invoices: Array<{
    id: string;
    date: Date;
    amount: number;
    currency: string;
    status: 'paid' | 'open' | 'void' | 'uncollectible';
    description: string;
    pdfUrl: string | null;
    hostedUrl: string | null;
  }>;
  summary: {
    totalPaid: number;
    currency: string;
    invoiceCount: number;
    totalCount: number;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function BillingPage() {
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [usageQuotas, setUsageQuotas] = useState<UsageQuotaInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchBillingData(), fetchInvoices(), fetchUsageData()]);
  }, []);

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/billing');
      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }
      const result = await response.json();
      if (result.success) {
        setSubscriptionData(result.data);
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load billing data'
      );
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/billing/invoices');
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const result = await response.json();
      if (result.success) {
        setInvoiceData(result.data);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const fetchUsageData = async () => {
    try {
      // Mock usage data - in production this would come from the usage API
      const mockQuotas: UsageQuotaInfo[] = [
        {
          metric: 'articles_created',
          featureKey: 'ai_content_generation',
          featureName: 'Articles Created',
          current: 24,
          limit: 50,
          remaining: 26,
          percentage: 48,
          resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          isUnlimited: false,
          warningLevel: 'ok',
        },
        {
          metric: 'ai_words_generated',
          featureKey: 'ai_content_generation',
          featureName: 'AI Words Generated',
          current: 78500,
          limit: 100000,
          remaining: 21500,
          percentage: 78.5,
          resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          isUnlimited: false,
          warningLevel: 'ok',
        },
        {
          metric: 'keyword_research_queries',
          featureKey: 'keyword_research',
          featureName: 'Keyword Research Queries',
          current: 450,
          limit: 500,
          remaining: 50,
          percentage: 90,
          resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          isUnlimited: false,
          warningLevel: 'warning',
        },
        {
          metric: 'articles_published',
          featureKey: 'cms_publishing',
          featureName: 'Articles Published',
          current: 18,
          limit: 30,
          remaining: 12,
          percentage: 60,
          resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          isUnlimited: false,
          warningLevel: 'ok',
        },
      ];
      setUsageQuotas(mockQuotas);
    } catch (err) {
      console.error('Error fetching usage data:', err);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch('/api/billing', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      // Refresh billing data
      await fetchBillingData();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to cancel subscription'
      );
    }
  };

  const handleUndoCancellation = async () => {
    try {
      const response = await fetch('/api/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo_cancellation' }),
      });
      if (!response.ok) {
        throw new Error('Failed to undo cancellation');
      }
      // Refresh billing data
      await fetchBillingData();
    } catch (err) {
      console.error('Error undoing cancellation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to undo cancellation'
      );
    }
  };

  // Show loading state
  if (isLoading && !subscriptionData) {
    return (
      <Shell title="Billing">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading billing information...
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  // Show error state
  if (error && !subscriptionData) {
    return (
      <Shell title="Billing">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">
            Unable to load billing information
          </h2>
          <p className="mt-2 text-sm text-red-800 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <div className="space-y-6" data-testid="billing-page">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Billing & Subscription
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your subscription, track usage, and view billing history
        </p>
      </div>

      {/* Error Alert (non-blocking) */}
      {error && subscriptionData && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-400">{error}</p>
        </div>
      )}

      {/* Current Plan Card */}
      {subscriptionData && (
        <CurrentPlanCard
          subscription={subscriptionData.subscription}
          plan={subscriptionData.plan}
          onCancelSubscription={handleCancelSubscription}
          onChangePlan={handleUndoCancellation}
        />
      )}

      {/* Usage Overview Card */}
      {subscriptionData && usageQuotas.length > 0 && (
        <UsageOverviewCard
          quotas={usageQuotas}
          periodStart={
            new Date(subscriptionData.subscription.currentPeriodStart)
          }
          periodEnd={new Date(subscriptionData.subscription.currentPeriodEnd)}
          daysRemaining={subscriptionData.subscription.daysUntilBilling}
        />
      )}

      {/* Billing History Card */}
      {invoiceData && (
        <BillingHistoryCard
          invoices={invoiceData.invoices}
          totalCount={invoiceData.summary.totalCount}
        />
      )}

      {/* Help Section */}
      <div className="card bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Need help with your subscription?
            </h3>
            <p className="mt-1 text-sm text-indigo-100">
              Our support team is here to help with billing questions, plan
              changes, and more.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="mailto:support@rank.brnd"
              className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              Contact Support
            </a>
            <a
              href="/docs/billing"
              className="inline-flex items-center rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

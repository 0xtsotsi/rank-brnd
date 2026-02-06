'use client';

/**
 * Usage Overview Card Component
 *
 * Displays current usage statistics across all tracked metrics.
 */

import { UsageProgressBar } from '@/components/usage/usage-progress-bar';
import { UsageQuotaInfo } from '@/types/usage';
import { TrendingUp, BarChart3, FileText, Search } from 'lucide-react';

interface UsageOverviewCardProps {
  quotas: UsageQuotaInfo[];
  periodStart: Date;
  periodEnd: Date;
  daysRemaining: number;
}

export function UsageOverviewCard({
  quotas,
  periodStart,
  periodEnd,
  daysRemaining,
}: UsageOverviewCardProps) {
  // Group quotas by category for better organization
  const contentQuotas = quotas.filter((q) =>
    ['articles_created', 'ai_words_generated', 'images_generated'].includes(
      q.metric
    )
  );
  const seoQuotas = quotas.filter((q) =>
    ['keyword_research_queries', 'serp_analyses', 'backlink_requests'].includes(
      q.metric
    )
  );
  const publishingQuotas = quotas.filter((q) =>
    ['articles_published', 'scheduled_articles'].includes(q.metric)
  );
  const apiQuotas = quotas.filter((q) =>
    ['api_requests', 'webhook_events'].includes(q.metric)
  );

  // Check if any quota is at warning level or exceeded
  const hasWarnings = quotas.some((q) =>
    ['warning', 'critical', 'exceeded'].includes(q.warningLevel)
  );
  const hasExceeded = quotas.some((q) => q.warningLevel === 'exceeded');

  return (
    <div className="card" data-testid="usage-overview-card">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-3">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Usage Overview
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track your resource consumption
              </p>
            </div>
          </div>
          {hasExceeded && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
              Limits Exceeded
            </span>
          )}
        </div>
      </div>

      {/* Period Info */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Current period:{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {new Date(periodStart).toLocaleDateString()} -{' '}
              {new Date(periodEnd).toLocaleDateString()}
            </span>
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">
              {daysRemaining}
            </span>{' '}
            days remaining
          </span>
        </div>
      </div>

      {/* Warning Banner */}
      {hasWarnings && !hasExceeded && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-900 dark:text-amber-300">
              Approaching limits
            </span>
            <span className="text-amber-800 dark:text-amber-400">
              - Consider upgrading your plan to avoid interruptions
            </span>
          </div>
        </div>
      )}

      {/* Usage Metrics */}
      <div className="px-6 py-4">
        {contentQuotas.length > 0 && (
          <UsageSection
            title="Content"
            icon={<FileText className="h-5 w-5" />}
            quotas={contentQuotas}
          />
        )}

        {seoQuotas.length > 0 && (
          <UsageSection
            title="SEO & Research"
            icon={<Search className="h-5 w-5" />}
            quotas={seoQuotas}
            className="mt-6"
          />
        )}

        {publishingQuotas.length > 0 && (
          <UsageSection
            title="Publishing"
            icon={<TrendingUp className="h-5 w-5" />}
            quotas={publishingQuotas}
            className="mt-6"
          />
        )}

        {apiQuotas.length > 0 && (
          <UsageSection
            title="API & Integrations"
            icon={<BarChart3 className="h-5 w-5" />}
            quotas={apiQuotas}
            className="mt-6"
          />
        )}

        {quotas.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No usage data available for this billing period.
            </p>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      {hasWarnings && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <a
            href="/dashboard/pricing"
            className="block rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-center text-white transition-all hover:from-indigo-600 hover:to-purple-600"
          >
            <p className="font-semibold">Upgrade Your Plan</p>
            <p className="mt-1 text-sm text-indigo-100">
              Get higher limits and unlock more features
            </p>
          </a>
        </div>
      )}
    </div>
  );
}

interface UsageSectionProps {
  title: string;
  icon: React.ReactNode;
  quotas: UsageQuotaInfo[];
  className?: string;
}

function UsageSection({ title, icon, quotas, className }: UsageSectionProps) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-md bg-indigo-100 p-1.5 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          {icon}
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {quotas.map((quota) => (
          <div
            key={quota.metric}
            className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <UsageProgressBar quota={quota} size="md" showLabel showRemaining />
          </div>
        ))}
      </div>
    </div>
  );
}

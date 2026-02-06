'use client';

/**
 * Publishing Stats Cards Component
 *
 * Displays publishing statistics in a card-based layout
 */

import type { PublishingQueueStats } from '@/types/publishing-queue';
import { cn } from '@/lib/utils';
import {
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { InlineErrorBoundary } from '@/components/error-boundaries';

interface PublishingStatsCardsProps {
  stats: PublishingQueueStats;
  className?: string;
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function PublishingStatsCards({
  stats,
  className,
}: PublishingStatsCardsProps) {
  const cards: StatCard[] = [
    {
      label: 'Total Queued',
      value: stats.total,
      icon: Send,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
    },
    {
      label: 'Publishing Now',
      value: stats.publishingCount,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      label: 'Published',
      value: stats.byStatus?.published || 0,
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      label: 'Failed',
      value: stats.failedCount,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
  ];

  // Calculate success rate
  const totalCompleted = stats.byStatus?.published || 0 + stats.failedCount;
  const successRate =
    totalCompleted > 0
      ? Math.round(((stats.byStatus?.published || 0) / totalCompleted) * 100)
      : 0;

  return (
    <InlineErrorBoundary>
      <div
        className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                'relative overflow-hidden rounded-xl border p-4',
                card.bgColor,
                card.borderColor
              )}
              data-testid={`stat-card-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <div className={cn('rounded-lg p-2', card.bgColor)}>
                  <Icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Success Rate Card */}
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border p-4',
            'bg-purple-50 dark:bg-purple-900/20',
            'border-purple-200 dark:border-purple-800'
          )}
          data-testid="stat-card-success-rate"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Success Rate
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {successRate}%
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg p-2',
                'bg-purple-100 dark:bg-purple-900/30'
              )}
            >
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          {totalCompleted > 0 && (
            <div className="mt-3">
              <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                <div
                  className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </InlineErrorBoundary>
  );
}

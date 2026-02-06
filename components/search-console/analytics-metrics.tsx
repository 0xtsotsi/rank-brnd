'use client';

/**
 * Analytics Metrics Component
 * Displays key GSC metrics in card format
 */

import { cn } from '@/lib/utils';
import type { SearchConsoleMetrics } from '@/types/google-search-console';

interface MetricsCardsProps {
  metrics: SearchConsoleMetrics;
  isLoading?: boolean;
}

export function AnalyticsMetrics({
  metrics,
  isLoading = false,
}: MetricsCardsProps) {
  const cards = [
    {
      id: 'impressions',
      label: 'Total Impressions',
      value: metrics.total_impressions,
      icon: Eye,
      color: 'indigo' as const,
      format: 'number' as const,
    },
    {
      id: 'clicks',
      label: 'Total Clicks',
      value: metrics.total_clicks,
      icon: MousePointer,
      color: 'blue' as const,
      format: 'number' as const,
    },
    {
      id: 'ctr',
      label: 'Avg CTR',
      value: metrics.avg_ctr,
      icon: TrendingUp,
      color: 'green' as const,
      format: 'percent' as const,
    },
    {
      id: 'position',
      label: 'Avg Position',
      value: metrics.avg_position,
      icon: BarChart,
      color: 'emerald' as const,
      format: 'position' as const,
    },
    {
      id: 'keywords',
      label: 'Unique Keywords',
      value: metrics.unique_keywords,
      icon: Search,
      color: 'purple' as const,
      format: 'number' as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <MetricCard
          key={card.id}
          label={card.label}
          value={card.value}
          icon={card.icon}
          color={card.color}
          format={card.format}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'blue' | 'green' | 'emerald' | 'purple';
  format: 'number' | 'percent' | 'position';
  isLoading?: boolean;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  format,
  isLoading,
}: MetricCardProps) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      iconText: 'text-indigo-600 dark:text-indigo-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      iconText: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      iconText: 'text-green-600 dark:text-green-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconText: 'text-emerald-600 dark:text-emerald-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      iconText: 'text-purple-600 dark:text-purple-400',
    },
  };

  const classes = colorClasses[color];

  const formatValue = (val: number): string => {
    if (format === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    if (format === 'position') {
      return val.toFixed(1);
    }
    return val.toLocaleString();
  };

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all',
        classes.bg,
        'border-gray-200 dark:border-gray-700',
        isLoading && 'opacity-50 animate-pulse'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', classes.iconBg)}>
          <Icon className={cn('h-5 w-5', classes.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xl font-bold truncate', classes.text)}>
            {isLoading ? '—' : formatValue(value)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

// Icon components
function Eye({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MousePointer({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="m13 13 6 6" />
    </svg>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function BarChart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

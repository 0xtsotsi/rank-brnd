'use client';

/**
 * Usage Progress Bar Component
 *
 * Displays a visual progress bar for usage metrics.
 */

import React from 'react';
import { UsageQuotaInfo } from '@/types/usage';

interface UsageProgressBarProps {
  quota: UsageQuotaInfo;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showRemaining?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

const colorClasses: Record<string, string> = {
  ok: 'bg-green-500 dark:bg-green-400',
  warning: 'bg-yellow-500 dark:bg-yellow-400',
  critical: 'bg-orange-500 dark:bg-orange-400',
  exceeded: 'bg-red-500 dark:bg-red-400',
};

export function UsageProgressBar({
  quota,
  size = 'md',
  showLabel = true,
  showRemaining = false,
  className = '',
}: UsageProgressBarProps) {
  if (quota.isUnlimited) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {quota.featureName}
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Unlimited
        </span>
      </div>
    );
  }

  const percentage = Math.min(quota.percentage, 100);
  const colorClass = colorClasses[quota.warningLevel];

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {(showLabel || showRemaining) && (
        <div className="flex items-center justify-between text-sm">
          {showLabel && (
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {quota.featureName}
            </span>
          )}
          {showRemaining && (
            <span className="text-gray-500 dark:text-gray-400">
              {formatNumber(quota.remaining)} remaining
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <div
          className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${sizeClasses[size]}`}
        >
          <div
            className={`h-full rounded-full ${colorClass} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {quota.warningLevel === 'exceeded' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`h-full rounded-full bg-red-200 dark:bg-red-900 ${sizeClasses[size]}`}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {formatNumber(quota.current)} / {formatNumber(quota.limit)}
        </span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}

/**
 * Usage Stats Grid Component
 *
 * Displays multiple usage progress bars in a grid layout.
 */
interface UsageStatsGridProps {
  quotas: UsageQuotaInfo[];
  columns?: 1 | 2 | 3;
  className?: string;
}

export function UsageStatsGrid({
  quotas,
  columns = 2,
  className = '',
}: UsageStatsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]} ${className}`}>
      {quotas.map((quota) => (
        <div
          key={quota.metric}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <UsageProgressBar quota={quota} size="md" showLabel showRemaining />
        </div>
      ))}
    </div>
  );
}

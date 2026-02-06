'use client';

/**
 * Usage Quota Banner Component
 *
 * Displays warning banners when usage limits are approaching or exceeded.
 */

import React from 'react';
import { UsageQuotaInfo, UsageWarningLevel } from '@/types/usage';

// Simple button component for now
function Button({ children, className, onClick, ...props }: any) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

interface UsageQuotaBannerProps {
  quota: UsageQuotaInfo;
  onDismiss?: () => void;
  onUpgrade?: () => void;
  className?: string;
}

const warningLevelConfig: Record<
  UsageWarningLevel,
  {
    variant: 'default' | 'destructive' | 'warning';
    bgColor: string;
    textColor: string;
    borderColor: string;
    iconName: 'zap' | 'alert-circle';
    message: string;
  }
> = {
  ok: {
    variant: 'default',
    bgColor: 'bg-green-50 dark:bg-green-950',
    textColor: 'text-green-800 dark:text-green-200',
    borderColor: 'border-green-200 dark:border-green-800',
    iconName: 'zap',
    message: 'Your usage is within limits.',
  },
  warning: {
    variant: 'warning',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    iconName: 'alert-circle',
    message: 'You are approaching your usage limit.',
  },
  critical: {
    variant: 'destructive',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    textColor: 'text-orange-800 dark:text-orange-200',
    borderColor: 'border-orange-200 dark:border-orange-800',
    iconName: 'alert-circle',
    message: 'You have almost reached your usage limit.',
  },
  exceeded: {
    variant: 'destructive',
    bgColor: 'bg-red-50 dark:bg-red-950',
    textColor: 'text-red-800 dark:text-red-200',
    borderColor: 'border-red-200 dark:border-red-800',
    iconName: 'alert-circle',
    message: 'You have exceeded your usage limit.',
  },
};

export function UsageQuotaBanner({
  quota,
  onDismiss,
  onUpgrade,
  className = '',
}: UsageQuotaBannerProps) {
  // Don't show if unlimited or status is ok
  if (quota.isUnlimited || quota.warningLevel === 'ok') {
    return null;
  }

  const config = warningLevelConfig[quota.warningLevel];

  const renderIcon = () => {
    // Use emoji to avoid lucide-react type issues
    if (config.iconName === 'zap') {
      return <span className="text-lg">⚡</span>;
    }
    return <span className="text-lg">⚠️</span>;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const diff = quota.resetDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div
      className={`relative flex items-center justify-between rounded-lg border-2 p-4 ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{renderIcon()}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Usage Limit Warning</h4>
            {quota.warningLevel === 'exceeded' && (
              <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-800 dark:text-red-200">
                Action Required
              </span>
            )}
          </div>
          <p className="mt-1 text-sm opacity-90">
            {config.message} You have used{' '}
            <span className="font-semibold">{formatNumber(quota.current)}</span>{' '}
            of{' '}
            <span className="font-semibold">{formatNumber(quota.limit)}</span>{' '}
            {quota.featureName.toLowerCase()} for this month.{' '}
            {daysRemaining > 0 && (
              <span>
                Resets in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
              </span>
            )}
          </p>
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/20 dark:bg-white/20">
              <div
                className="h-full rounded-full bg-current transition-all duration-500"
                style={{ width: `${Math.min(quota.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onUpgrade && (
          <Button
            variant={quota.warningLevel === 'exceeded' ? 'default' : 'outline'}
            size="sm"
            onClick={onUpgrade}
            className="gap-1"
          >
            ⬆️ Upgrade Plan
          </Button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded p-1 opacity-70 transition-opacity hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Multiple Usage Banners Component
 *
 * Displays banners for multiple quotas
 */
interface MultipleUsageBannersProps {
  quotas: UsageQuotaInfo[];
  onDismiss?: (metric: string) => void;
  onUpgrade?: () => void;
  className?: string;
}

export function MultipleUsageBanners({
  quotas,
  onDismiss,
  onUpgrade,
  className = '',
}: MultipleUsageBannersProps) {
  // Filter to only show warnings and above
  const warningQuotas = quotas.filter(
    (q) => !q.isUnlimited && q.warningLevel !== 'ok'
  );

  if (warningQuotas.length === 0) {
    return null;
  }

  // Sort by severity (exceeded > critical > warning)
  const sortedQuotas = [...warningQuotas].sort((a, b) => {
    const severity = { exceeded: 3, critical: 2, warning: 1, ok: 0 };
    return severity[b.warningLevel] - severity[a.warningLevel];
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {sortedQuotas.map((quota) => (
        <UsageQuotaBanner
          key={quota.metric}
          quota={quota}
          onDismiss={onDismiss ? () => onDismiss(quota.metric) : undefined}
          onUpgrade={onUpgrade}
        />
      ))}
    </div>
  );
}

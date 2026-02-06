'use client';

/**
 * Integration Card Component
 * Displays a CMS integration with actions for edit, disconnect, and test connection
 */

import { useState } from 'react';
import type { Integration, Platform, Status } from '@/types/integration';
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/types/integration';
import { cn } from '@/lib/utils';

interface IntegrationCardProps {
  integration: Integration;
  onEdit: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
  onTest?: (integration: Integration) => Promise<boolean>;
}

export function IntegrationCard({
  integration,
  onEdit,
  onDisconnect,
  onTest,
}: IntegrationCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(
    null
  );

  const platformClasses = PLATFORM_COLORS[integration.platform as Platform];
  const statusClasses = STATUS_COLORS[integration.status as Status];

  const handleDisconnect = () => {
    if (
      confirm(
        `Are you sure you want to disconnect from "${PLATFORM_LABELS[integration.platform as Platform]} - ${integration.name}"? This action cannot be undone.`
      )
    ) {
      onDisconnect(integration);
    }
  };

  const handleTestConnection = async () => {
    if (!onTest) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTest(integration);
      setTestResult(result ? 'success' : 'error');
      setTimeout(() => setTestResult(null), 3000);
    } catch {
      setTestResult('error');
      setTimeout(() => setTestResult(null), 3000);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border p-5 hover:shadow-lg transition-shadow',
        platformClasses.border
      )}
      data-testid={`integration-card-${integration.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Platform indicator */}
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-sm',
              platformClasses.bg,
              platformClasses.text
            )}
            data-testid={`integration-platform-${integration.id}`}
          >
            {getPlatformIcon(integration.platform)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {integration.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {PLATFORM_LABELS[integration.platform as Platform]}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium border',
            statusClasses.bg,
            statusClasses.text,
            statusClasses.border
          )}
          data-testid={`integration-status-${integration.id}`}
        >
          {STATUS_LABELS[integration.status as Status]}
        </span>
      </div>

      {/* Description */}
      {integration.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {integration.description}
        </p>
      )}

      {/* Config info */}
      <div className="space-y-2 mb-4 text-xs">
        {integration.config.siteUrl && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Site URL:</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">
              {integration.config.siteUrl}
            </span>
          </div>
        )}
        {integration.config.shopDomain && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">
              Shop Domain:
            </span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">
              {integration.config.shopDomain}
            </span>
          </div>
        )}
        {integration.config.adminUrl && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Admin URL:</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">
              {integration.config.adminUrl}
            </span>
          </div>
        )}
        {integration.config.siteId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">Site ID:</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">
              {integration.config.siteId}
            </span>
          </div>
        )}
        {integration.last_synced_at && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">
              Last synced:
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatDate(integration.last_synced_at)}
            </span>
          </div>
        )}
        {integration.last_error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <span className="font-medium">Error:</span>
            <span className="line-clamp-1">{integration.last_error}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        {onTest && integration.status === 'active' && (
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
              'text-sm font-medium transition-colors',
              testing
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-wait'
                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
            )}
            data-testid={`test-integration-${integration.id}`}
          >
            {testResult === 'success' ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Connected
              </>
            ) : testResult === 'error' ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Failed
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {testing ? 'Testing...' : 'Test'}
              </>
            )}
          </button>
        )}
        <button
          onClick={() => onEdit(integration)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'text-sm font-medium transition-colors',
            'bg-gray-100 dark:bg-gray-700',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
          data-testid={`edit-integration-${integration.id}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Configure
        </button>
        <button
          onClick={handleDisconnect}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
            'text-sm font-medium transition-colors',
            'bg-red-50 dark:bg-red-900/20',
            'text-red-600 dark:text-red-400',
            'hover:bg-red-100 dark:hover:bg-red-900/30'
          )}
          data-testid={`disconnect-integration-${integration.id}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          Disconnect
        </button>
      </div>
    </div>
  );
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    wordpress: 'W',
    webflow: 'Wf',
    shopify: 'S',
    ghost: 'Gh',
    notion: 'N',
    squarespace: 'SQ',
    wix: 'Wi',
    contentful: 'Cf',
    strapi: 'St',
    custom: 'API',
    google: 'G',
    'google-search-console': 'GSC',
  };
  return icons[platform] || platform.charAt(0).toUpperCase();
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

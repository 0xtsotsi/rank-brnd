'use client';

/**
 * Publishing Dashboard Page
 *
 * Shows article publishing status per CMS, publish buttons,
 * schedule publishing UI, history view, and retry failed publishes.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  PublishingQueue,
  PublishingQueueStats,
  PublishingPlatform,
  PublishingQueueStatus,
} from '@/types/publishing-queue';
import {
  PUBLISHING_PLATFORM_LABELS,
  PUBLISHING_QUEUE_STATUS_LABELS,
} from '@/types/publishing-queue';
import { PublishingQueueTable } from '@/components/articles/publishing-queue-table';
import { PublishingStatsCards } from '@/components/publishing/publishing-stats-cards';
import { SchedulePublishDialog } from '@/components/publishing/schedule-publish-dialog';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Filter,
  Plus,
  RefreshCw,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface PageProps {
  searchParams: {
    status?: string;
    platform?: string;
  };
}

export default function PublishingDashboardPage({ searchParams }: PageProps) {
  const router = useRouter();
  const [queueItems, setQueueItems] = useState<PublishingQueue[]>([]);
  const [stats, setStats] = useState<PublishingQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    PublishingQueueStatus | 'all'
  >((searchParams.status as PublishingQueueStatus | 'all') || 'all');
  const [platformFilter, setPlatformFilter] = useState<
    PublishingPlatform | 'all'
  >((searchParams.platform as PublishingPlatform | 'all') || 'all');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Fetch queue items and stats
  const fetchData = useCallback(async () => {
    try {
      const organizationId = 'default-org-id'; // TODO: Get from actual user data

      // Fetch queue items
      const queueParams = new URLSearchParams();
      queueParams.append('organization_id', organizationId);
      if (statusFilter !== 'all') queueParams.append('status', statusFilter);
      if (platformFilter !== 'all')
        queueParams.append('platform', platformFilter);

      const [queueResponse, statsResponse] = await Promise.all([
        fetch(`/api/publishing-queue?${queueParams.toString()}`),
        fetch(`/api/publishing-queue/stats?organization_id=${organizationId}`),
      ]);

      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setQueueItems(queueData.items || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching publishing data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, platformFilter]);

  useEffect(() => {
    fetchData();
  }, [statusFilter, platformFilter, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCancelItem = async (id: string) => {
    try {
      const response = await fetch('/api/publishing-queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setQueueItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, status: 'cancelled' as PublishingQueueStatus }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Error cancelling item:', error);
    }
  };

  const handleRetryItem = async (id: string) => {
    try {
      const response = await fetch('/api/publishing-queue/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setQueueItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'pending' as PublishingQueueStatus,
                  retry_count: 0,
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Error retrying item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/publishing-queue?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setQueueItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const updateFilters = (
    status: PublishingQueueStatus | 'all',
    platform: PublishingPlatform | 'all'
  ) => {
    setStatusFilter(status);
    setPlatformFilter(platform);
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (platform !== 'all') params.set('platform', platform);
    router.push(`/dashboard/publishing?${params.toString()}`);
  };

  const platforms: PublishingPlatform[] = [
    'wordpress',
    'webflow',
    'shopify',
    'ghost',
    'notion',
    'squarespace',
    'wix',
    'contentful',
    'strapi',
  ];

  return (
    <div className="space-y-6" data-testid="publishing-dashboard-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Publishing Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage article publishing across all your CMS platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'text-sm font-medium transition-colors',
              'bg-white dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'border border-gray-300 dark:border-gray-600',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            data-testid="refresh-button"
          >
            <RefreshCw
              className={cn('h-4 w-4', refreshing && 'animate-spin')}
            />
            Refresh
          </button>
          <button
            onClick={() => setScheduleDialogOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'text-sm font-medium transition-colors',
              'bg-indigo-600 text-white',
              'hover:bg-indigo-700',
              'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            )}
            data-testid="schedule-publish-button"
          >
            <Plus className="h-4 w-4" />
            Schedule Publish
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && <PublishingStatsCards stats={stats} />}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateFilters('all', platformFilter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === 'all'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              data-testid="filter-status-all"
            >
              All
            </button>
            <button
              onClick={() => updateFilters('pending', platformFilter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === 'pending'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              data-testid="filter-status-pending"
            >
              Pending
            </button>
            <button
              onClick={() => updateFilters('publishing', platformFilter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === 'publishing'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              data-testid="filter-status-publishing"
            >
              Publishing
            </button>
            <button
              onClick={() => updateFilters('published', platformFilter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === 'published'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              data-testid="filter-status-published"
            >
              Published
            </button>
            <button
              onClick={() => updateFilters('failed', platformFilter)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === 'failed'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
              data-testid="filter-status-failed"
            >
              Failed
            </button>
          </div>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) =>
              updateFilters(
                statusFilter,
                e.target.value as PublishingPlatform | 'all'
              )
            }
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              'bg-white dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'border border-gray-300 dark:border-gray-600',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
            )}
            data-testid="filter-platform"
          >
            <option value="all">All Platforms</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {PUBLISHING_PLATFORM_LABELS[platform]}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <button
          onClick={() => router.push('/dashboard/integrations')}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'text-sm font-medium transition-colors',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <Settings className="h-4 w-4" />
          Manage Integrations
        </button>
      </div>

      {/* Publishing Queue Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <PublishingQueueTable
          items={queueItems}
          onCancelItem={handleCancelItem}
          onRetryItem={handleRetryItem}
          onDeleteItem={handleDeleteItem}
          isLoading={loading}
        />
      )}

      {/* Schedule Publish Dialog */}
      <SchedulePublishDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        onSuccess={() => {
          setScheduleDialogOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}

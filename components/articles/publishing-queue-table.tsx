// @ts-nocheck - Database types need to be regenerated with Supabase CLI

'use client';

/**
 * Publishing Queue Table Component
 * Displays publishing queue items in a sortable, filterable table
 */

import { useState, useMemo } from 'react';
import type {
  PublishingQueue,
  PublishingQueueStatus,
  PublishingPlatform,
  SortDirection,
} from '@/types/publishing-queue';
import {
  PUBLISHING_QUEUE_STATUS_LABELS,
  PUBLISHING_QUEUE_STATUS_COLORS,
  PUBLISHING_PLATFORM_LABELS,
  PUBLISHING_PLATFORM_COLORS,
} from '@/types/publishing-queue';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  X,
  Check,
  ExternalLink,
  Trash2,
  Calendar,
  Clock,
} from 'lucide-react';

interface PublishingQueueTableProps {
  items: PublishingQueue[];
  onItemClick?: (item: PublishingQueue) => void;
  onCancelItem?: (id: string) => void;
  onRetryItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

type SortField =
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'platform'
  | 'priority'
  | 'scheduled_for'
  | 'completed_at';

export function PublishingQueueTable({
  items,
  onItemClick,
  onCancelItem,
  onRetryItem,
  onDeleteItem,
  isLoading = false,
  className,
}: PublishingQueueTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    PublishingQueueStatus | 'all'
  >('all');

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    return result;
  }, [items, statusFilter]);

  const sortedItems = useMemo(() => {
    const result = [...filteredItems];

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'created_at':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          comparison =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'platform':
          comparison = a.platform.localeCompare(b.platform);
          break;
        case 'priority':
          comparison = (a as any).priority - (b as any).priority;
          break;
        case 'scheduled_for':
          const aScheduled = (a as any).scheduled_for
            ? new Date((a as any).scheduled_for).getTime()
            : 0;
          const bScheduled = (b as any).scheduled_for
            ? new Date((b as any).scheduled_for).getTime()
            : 0;
          comparison = aScheduled - bScheduled;
          break;
        case 'completed_at':
          const aCompleted = (a as any).completed_at
            ? new Date((a as any).completed_at).getTime()
            : 0;
          const bCompleted = (b as any).completed_at
            ? new Date((b as any).completed_at).getTime()
            : 0;
          comparison = aCompleted - bCompleted;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [filteredItems, sortField, sortDirection]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Handle item actions
  const handleAction = async (id: string, action: string) => {
    switch (action) {
      case 'cancel':
        onCancelItem?.(id);
        break;
      case 'retry':
        onRetryItem?.(id);
        break;
      case 'delete':
        onDeleteItem?.(id);
        break;
    }
    setActionMenu(null);
  };

  // Format date relative
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<PublishingQueueStatus | 'all', number> = {
      all: items.length,
      pending: 0,
      queued: 0,
      publishing: 0,
      published: 0,
      failed: 0,
      cancelled: 0,
    };
    items.forEach((item) => {
      counts[item.status]++;
    });
    return counts;
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div
      className={cn('publishing-queue-table w-full', className)}
      data-testid="publishing-queue-table"
    >
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            statusFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          All ({statusCounts.all})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            statusFilter === 'pending'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          Pending ({statusCounts.pending})
        </button>
        <button
          onClick={() => setStatusFilter('queued')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            statusFilter === 'queued'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          Queued ({statusCounts.queued})
        </button>
        <button
          onClick={() => setStatusFilter('publishing')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            statusFilter === 'publishing'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          Publishing ({statusCounts.publishing})
        </button>
        <button
          onClick={() => setStatusFilter('published')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            statusFilter === 'published'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          Published ({statusCounts.published})
        </button>
        <button
          onClick={() => setStatusFilter('failed')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            statusFilter === 'failed'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          Failed ({statusCounts.failed})
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleSort('platform')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Platform <SortIndicator field="platform" />
          </button>
          <button
            onClick={() => handleSort('status')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Status <SortIndicator field="status" />
          </button>
          <div className="col-span-3">Article</div>
          <button
            onClick={() => handleSort('priority')}
            className="col-span-1 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Priority <SortIndicator field="priority" />
          </button>
          <button
            onClick={() => handleSort('scheduled_for')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Scheduled <SortIndicator field="scheduled_for" />
          </button>
          <div className="col-span-2" />
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedItems.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12 opacity-20 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="font-medium">No items in the queue</p>
              <p className="text-sm">
                Articles queued for publishing will appear here
              </p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const statusColors = PUBLISHING_QUEUE_STATUS_COLORS[item.status];
              const platformColors = PUBLISHING_PLATFORM_COLORS[item.platform];
              const isExpanded = expandedRow === item.id;
              const showActionMenu = actionMenu === item.id;

              return (
                <div key={item.id} className="group">
                  {/* Main Row */}
                  <div
                    className={cn(
                      'grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                    )}
                    onClick={() => toggleRow(item.id)}
                    data-queue-item-id={item.id}
                    data-testid="queue-item-row"
                  >
                    {/* Platform */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          platformColors.bg,
                          platformColors.text
                        )}
                      >
                        {platformColors.icon}
                        {PUBLISHING_PLATFORM_LABELS[item.platform]}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border',
                          statusColors.bg,
                          statusColors.text,
                          statusColors.border
                        )}
                      >
                        {item.status === 'publishing' && (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        )}
                        {item.status === 'published' && (
                          <Check className="h-3 w-3" />
                        )}
                        {item.status === 'failed' && <X className="h-3 w-3" />}
                        {item.status === 'cancelled' && (
                          <X className="h-3 w-3" />
                        )}
                        {PUBLISHING_QUEUE_STATUS_LABELS[item.status]}
                      </span>
                    </div>

                    {/* Article */}
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.articleTitle || 'Unnamed Article'}
                      </p>
                      {item.articleSlug && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          /{item.articleSlug}
                        </p>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            (item as any).priority >= 10
                              ? 'bg-amber-500'
                              : (item as any).priority >= 5
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                          )}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {(item as any).priority}
                        </span>
                      </div>
                    </div>

                    {/* Scheduled/Time */}
                    <div className="col-span-2">
                      {(item as any).completed_at ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Check className="h-3 w-3 text-green-500" />
                          {formatRelativeTime((item as any).completed_at)}
                        </div>
                      ) : (item as any).scheduled_for ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {new Date(
                            (item as any).scheduled_for
                          ).toLocaleDateString()}{' '}
                          {new Date(
                            (item as any).scheduled_for
                          ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      ) : (item as any).started_at ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          Started {formatRelativeTime((item as any).started_at)}
                        </div>
                      ) : (item as any).queued_at ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          Queued {formatRelativeTime((item as any).queued_at)}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenu(showActionMenu ? null : item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>

                        {/* Action Menu Dropdown */}
                        {showActionMenu && (
                          <div
                            className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.status === 'failed' && (
                              <button
                                onClick={() => handleAction(item.id, 'retry')}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <RefreshCw className="h-4 w-4" /> Retry
                              </button>
                            )}
                            {(item.status === 'pending' ||
                              item.status === 'queued') && (
                              <button
                                onClick={() => handleAction(item.id, 'cancel')}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <X className="h-4 w-4" /> Cancel
                              </button>
                            )}
                            {(item as any).published_url && (
                              <a
                                href={(item as any).published_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" /> View
                                Published
                              </a>
                            )}
                            <div className="border-t border-gray-200 dark:border-gray-600" />
                            <button
                              onClick={() => handleAction(item.id, 'delete')}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Row Details */}
                  {isExpanded && (
                    <div
                      className={cn(
                        'px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700',
                        'animate-fade-in'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {/* Timestamps */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Timeline
                          </h4>
                          <dl className="space-y-1">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">
                                Created
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-white">
                                {formatRelativeTime(item.created_at)}
                              </dd>
                            </div>
                            {(item as any).queued_at && (
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">
                                  Queued
                                </dt>
                                <dd className="font-medium text-gray-900 dark:text-white">
                                  {formatRelativeTime((item as any).queued_at)}
                                </dd>
                              </div>
                            )}
                            {(item as any).started_at && (
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">
                                  Started
                                </dt>
                                <dd className="font-medium text-gray-900 dark:text-white">
                                  {formatRelativeTime((item as any).started_at)}
                                </dd>
                              </div>
                            )}
                            {(item as any).completed_at && (
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">
                                  Completed
                                </dt>
                                <dd className="font-medium text-gray-900 dark:text-white">
                                  {formatRelativeTime(
                                    (item as any).completed_at
                                  )}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {/* Retry Information */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Retry Information
                          </h4>
                          <dl className="space-y-1">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">
                                Retries
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-white">
                                {item.retry_count} / {(item as any).max_retries}
                              </dd>
                            </div>
                            {(item as any).last_error && (
                              <div className="mt-2">
                                <dt className="text-gray-500 dark:text-gray-400 mb-1">
                                  Last Error
                                </dt>
                                <dd className="text-red-600 dark:text-red-400 text-xs break-words">
                                  {(item as any).last_error}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {/* Published Details */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Published Details
                          </h4>
                          {(item as any).published_url ? (
                            <a
                              href={(item as any).published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all text-sm"
                            >
                              {(item as any).published_url}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 italic">
                              Not yet published
                            </p>
                          )}
                          {(item as any).published_post_id && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Post ID: {(item as any).published_post_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <p>
          Showing <span className="font-medium">{sortedItems.length}</span> of{' '}
          <span className="font-medium">{items.length}</span> items
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Queued</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Publishing</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Published</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Failed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

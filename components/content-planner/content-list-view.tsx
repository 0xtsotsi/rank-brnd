'use client';

/**
 * Content List View Component
 * Alternative list view for content planner with sortable columns
 */

import { useState, useMemo } from 'react';
import type { ContentItem, ContentFilters } from '@/types/content-planner';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/calendar';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  CONTENT_TYPE_ICONS,
} from '@/types/content-planner';
import { formatDate } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';
import {
  FileText,
  PenTool,
  Share2,
  Mail,
  Video,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface ContentListViewProps {
  items: ContentItem[];
  filters: ContentFilters;
  onItemClick?: (item: ContentItem) => void;
  onStatusChange?: (itemId: string, newStatus: ContentItem['status']) => void;
  className?: string;
}

type SortField = 'scheduledDate' | 'title' | 'status' | 'contentType';
type SortDirection = 'asc' | 'desc';

export function ContentListView({
  items,
  filters,
  onItemClick,
  onStatusChange,
  className,
}: ContentListViewProps) {
  const [sortField, setSortField] = useState<SortField>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Get icon component by name
  const IconComponent = ({
    iconName,
    className,
  }: {
    iconName: string;
    className?: string;
  }) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className={className} /> : null;
  };

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
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter((item) => item.status === filters.status);
    }

    // Apply content type filter
    if (filters.contentType !== 'all') {
      result = result.filter(
        (item) => item.contentType === filters.contentType
      );
    }

    // Apply keyword filter
    if (filters.keyword) {
      result = result.filter((item) =>
        item.keywords.some((k) =>
          k.toLowerCase().includes(filters.keyword!.toLowerCase())
        )
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'scheduledDate':
          comparison = a.scheduledDate.getTime() - b.scheduledDate.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          const statusOrder = [
            'overdue',
            'in-progress',
            'pending',
            'completed',
            'cancelled',
          ];
          comparison =
            statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
        case 'contentType':
          comparison = a.contentType.localeCompare(b.contentType);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, filters, sortField, sortDirection]);

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  return (
    <div
      className={cn('content-list-view w-full', className)}
      data-testid="content-list-view"
    >
      {/* List Header */}
      <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {/* Sortable headers */}
          <button
            onClick={() => handleSort('scheduledDate')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Date <SortIndicator field="scheduledDate" />
          </button>
          <button
            onClick={() => handleSort('title')}
            className="col-span-3 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Title <SortIndicator field="title" />
          </button>
          <button
            onClick={() => handleSort('contentType')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Type <SortIndicator field="contentType" />
          </button>
          <button
            onClick={() => handleSort('status')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Status <SortIndicator field="status" />
          </button>
          <div className="col-span-2 text-left">Keywords</div>
          <div className="col-span-1" />
        </div>

        {/* List Items */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredAndSortedItems.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">No content items found</p>
              <p className="text-sm">
                Try adjusting your filters or create new content
              </p>
            </div>
          ) : (
            filteredAndSortedItems.map((item) => {
              const statusColors =
                STATUS_COLORS[item.status] || STATUS_COLORS.pending;
              const contentTypeColors = CONTENT_TYPE_COLORS[item.contentType];
              const icon = CONTENT_TYPE_ICONS[item.contentType];

              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className={cn(
                    'grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer',
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    'group'
                  )}
                  data-content-id={item.id}
                  data-testid="content-list-item"
                >
                  {/* Date */}
                  <div className="col-span-2 text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatDate(item.scheduledDate, 'short')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.scheduledDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="col-span-3">
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Type */}
                  <div className="col-span-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        contentTypeColors.bg,
                        contentTypeColors.text,
                        contentTypeColors.border,
                        'border'
                      )}
                    >
                      <IconComponent iconName={icon} className="h-3 w-3" />
                      {CONTENT_TYPE_LABELS[item.contentType]}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Cycle through statuses on click
                        const statusCycle: ContentItem['status'][] = [
                          'pending',
                          'in-progress',
                          'completed',
                          'cancelled',
                        ];
                        const currentIndex = statusCycle.indexOf(item.status);
                        const nextStatus =
                          statusCycle[(currentIndex + 1) % statusCycle.length];
                        onStatusChange?.(item.id, nextStatus);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80',
                        statusColors.bg,
                        statusColors.text,
                        statusColors.border,
                        'border'
                      )}
                      title="Click to change status"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {STATUS_LABELS[item.status]}
                    </button>
                  </div>

                  {/* Keywords */}
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {item.keywords.slice(0, 2).map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300"
                        >
                          {keyword}
                        </span>
                      ))}
                      {item.keywords.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{item.keywords.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick?.(item);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Summary footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <p>
          Showing{' '}
          <span className="font-medium">{filteredAndSortedItems.length}</span>{' '}
          of <span className="font-medium">{items.length}</span> items
        </p>
      </div>
    </div>
  );
}

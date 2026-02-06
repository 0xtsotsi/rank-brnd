'use client';

/**
 * GSC Analytics Table Component
 * Displays search console data in a sortable table
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type {
  SearchConsoleData,
  GscSortField,
  GscSortOrder,
} from '@/types/google-search-console';

interface AnalyticsTableProps {
  data: SearchConsoleData[];
  isLoading?: boolean;
}

export function AnalyticsTable({
  data,
  isLoading = false,
}: AnalyticsTableProps) {
  const [sortField, setSortField] = useState<GscSortField>('impressions');
  const [sortOrder, setSortOrder] = useState<GscSortOrder>('desc');

  // Sort and group data by keyword
  const groupedData = useMemo(() => {
    // Group by keyword and aggregate metrics
    const keywordMap = new Map<
      string,
      {
        keyword: string;
        impressions: number;
        clicks: number;
        ctr: number;
        avg_position: number;
        dates: string[];
        latest_date: string;
      }
    >();

    for (const row of data) {
      const existing = keywordMap.get(row.keyword);
      if (existing) {
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.ctr =
          existing.impressions > 0
            ? ((existing.clicks + row.clicks) /
                (existing.impressions + row.impressions)) *
              100
            : 0;
        // Weighted average for position
        const totalImpressions = existing.impressions + row.impressions;
        existing.avg_position =
          (existing.avg_position * existing.impressions +
            row.avg_position * row.impressions) /
          totalImpressions;
        existing.dates.push(row.date);
        if (row.date > existing.latest_date) {
          existing.latest_date = row.date;
        }
      } else {
        keywordMap.set(row.keyword, {
          keyword: row.keyword,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          avg_position: row.avg_position,
          dates: [row.date],
          latest_date: row.date,
        });
      }
    }

    let sorted = Array.from(keywordMap.values());

    // Sort by selected field
    sorted.sort((a, b) => {
      // Map 'date' sort field to 'latest_date' property
      const fieldToUse = sortField === 'date' ? 'latest_date' : sortField;
      const aVal = a[fieldToUse as keyof typeof a];
      const bVal = b[fieldToUse as keyof typeof b];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortField, sortOrder]);

  const handleSort = (field: GscSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const columns: {
    id: GscSortField;
    label: string;
    align: 'left' | 'right';
  }[] = [
    { id: 'keyword', label: 'Keyword', align: 'left' },
    { id: 'impressions', label: 'Impressions', align: 'right' },
    { id: 'clicks', label: 'Clicks', align: 'right' },
    { id: 'ctr', label: 'CTR', align: 'right' },
    { id: 'avg_position', label: 'Avg Position', align: 'right' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="gsc-analytics-table">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.id)}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none',
                    col.align === 'right' ? 'text-right' : 'text-left',
                    sortField === col.id
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      col.align === 'right' && 'justify-end'
                    )}
                  >
                    {col.label}
                    <SortIcon
                      field={col.id}
                      currentField={sortField}
                      order={sortOrder}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : groupedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 opacity-50" />
                    <p>No search console data found</p>
                    <p className="text-sm">
                      Import data from Google Search Console to see analytics
                      here
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              groupedData.map((row) => (
                <tr
                  key={row.keyword}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {row.keyword}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                    {row.impressions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                    {row.clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        row.ctr >= 5
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : row.ctr >= 2
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      )}
                    >
                      {row.ctr.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PositionBadge position={row.avg_position} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      {!isLoading && groupedData.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          Showing {groupedData.length} unique keywords
        </div>
      )}
    </div>
  );
}

interface SortIconProps {
  field: GscSortField;
  currentField: GscSortField;
  order: GscSortOrder;
}

function SortIcon({ field, currentField, order }: SortIconProps) {
  if (field !== currentField) {
    return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  }
  return order === 'asc' ? (
    <ChevronUp className="h-3 w-3" />
  ) : (
    <ChevronDown className="h-3 w-3" />
  );
}

interface PositionBadgeProps {
  position: number;
}

function PositionBadge({ position }: PositionBadgeProps) {
  const config =
    position <= 3
      ? {
          className:
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          label: 'Top 3',
        }
      : position <= 10
        ? {
            className:
              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            label: '4-10',
          }
        : position <= 20
          ? {
              className:
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
              label: '11-20',
            }
          : {
              className:
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
              label: '20+',
            };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        config.className
      )}
    >
      {position.toFixed(1)}
    </span>
  );
}

// Icon components
function ChevronsUpDown({ className }: { className?: string }) {
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
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function ChevronUp({ className }: { className?: string }) {
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
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
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

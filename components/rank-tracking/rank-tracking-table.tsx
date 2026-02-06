'use client';

/**
 * Rank Tracking Table Component
 * Displays rank tracking data with position changes, trends, and metrics
 */

import { useState, useMemo } from 'react';
import type { RankTracking, RankDevice } from '@/types/rank-tracking';
import {
  DEVICE_LABELS,
  DEVICE_COLORS,
  LOCATION_LABELS,
  getRankColor,
  getRankBadgeColor,
  getPositionChange,
  formatPositionChange,
  getPositionChangeColor,
  formatCTR,
  formatLargeNumber,
} from '@/types/rank-tracking';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Calendar,
  BarChart2,
  Eye,
  MousePointerClick,
  Monitor,
  Smartphone,
  Tablet,
  MoreHorizontal,
} from 'lucide-react';

export interface RankTrackingTableRow {
  id: string;
  keyword: string;
  keyword_id: string;
  position: number;
  previous_position: number | null;
  position_change: number | null;
  device: RankDevice;
  location: string;
  url?: string;
  date: Date;
  search_volume?: number;
  ctr?: number;
  impressions?: number;
  clicks?: number;
}

interface RankTrackingTableProps {
  rankData: RankTrackingTableRow[];
  onRowClick?: (row: RankTrackingTableRow) => void;
  isLoading?: boolean;
  className?: string;
}

type SortField =
  | 'keyword'
  | 'position'
  | 'position_change'
  | 'device'
  | 'location'
  | 'date'
  | 'search_volume'
  | 'ctr';

export function RankTrackingTable({
  rankData,
  onRowClick,
  isLoading = false,
  className,
}: RankTrackingTableProps) {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort and memoize rank data
  const sortedRankData = useMemo(() => {
    const result = [...rankData];

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'keyword':
          comparison = a.keyword.localeCompare(b.keyword);
          break;
        case 'position':
          comparison = a.position - b.position;
          break;
        case 'position_change':
          const aChange = a.position_change ?? 0;
          const bChange = b.position_change ?? 0;
          comparison = aChange - bChange;
          break;
        case 'device':
          comparison = a.device.localeCompare(b.device);
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'search_volume':
          comparison = (a.search_volume || 0) - (b.search_volume || 0);
          break;
        case 'ctr':
          comparison = (a.ctr || 0) - (b.ctr || 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [rankData, sortField, sortDirection]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Position change indicator component
  const PositionChangeIndicator = ({
    position,
    previousPosition,
  }: {
    position: number;
    previousPosition: number | null;
  }) => {
    const change = getPositionChange(position, previousPosition);

    if (change.direction === 'unknown' || change.change === null) {
      return <span className="text-gray-400 text-xs">No data</span>;
    }

    if (change.direction === 'same') {
      return (
        <span className="flex items-center gap-1 text-gray-500">
          <Minus className="h-3 w-3" />
          <span className="text-xs">No change</span>
        </span>
      );
    }

    const colorClass = getPositionChangeColor(change.change);

    return (
      <span
        className={cn(
          'flex items-center gap-1 text-xs font-medium',
          colorClass
        )}
      >
        {change.direction === 'up' ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {formatPositionChange(change.change)}
      </span>
    );
  };

  // Device icon component
  const DeviceIcon = ({ device }: { device: RankDevice }) => {
    const iconProps = { className: 'h-4 w-4' };

    switch (device) {
      case 'desktop':
        return <Monitor {...iconProps} />;
      case 'mobile':
        return <Smartphone {...iconProps} />;
      case 'tablet':
        return <Tablet {...iconProps} />;
    }
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
    if (expandedRow !== id && onRowClick) {
      const row = rankData.find((r) => r.id === id);
      if (row) onRowClick(row);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div
      className={cn('rank-tracking-table w-full', className)}
      data-testid="rank-tracking-table"
    >
      {/* Table Container */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleSort('keyword')}
            className="col-span-3 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Keyword <SortIndicator field="keyword" />
          </button>
          <button
            onClick={() => handleSort('position')}
            className="col-span-1 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Rank <SortIndicator field="position" />
          </button>
          <button
            onClick={() => handleSort('position_change')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Change <SortIndicator field="position_change" />
          </button>
          <button
            onClick={() => handleSort('device')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Device <SortIndicator field="device" />
          </button>
          <button
            onClick={() => handleSort('search_volume')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Volume <SortIndicator field="search_volume" />
          </button>
          <div className="col-span-2" />
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedRankData.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              <BarChart2 className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">No rank tracking data found</p>
              <p className="text-sm">
                Try adjusting your filters or add keywords to track
              </p>
            </div>
          ) : (
            sortedRankData.map((row) => {
              const deviceColors = DEVICE_COLORS[row.device];
              const rankBadgeColors = getRankBadgeColor(row.position);
              const isExpanded = expandedRow === row.id;

              return (
                <div key={row.id} className="group">
                  {/* Main Row */}
                  <div
                    className={cn(
                      'grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                    )}
                    onClick={() => toggleRow(row.id)}
                    data-keyword-id={row.id}
                    data-testid="rank-tracking-row"
                  >
                    {/* Keyword */}
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {row.keyword}
                      </p>
                      {row.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {LOCATION_LABELS[row.location] || row.location}
                        </p>
                      )}
                    </div>

                    {/* Rank */}
                    <div className="col-span-1">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold',
                          rankBadgeColors.bg,
                          rankBadgeColors.text,
                          rankBadgeColors.border,
                          'border'
                        )}
                      >
                        #{row.position}
                      </span>
                    </div>

                    {/* Position Change */}
                    <div className="col-span-2">
                      <PositionChangeIndicator
                        position={row.position}
                        previousPosition={row.previous_position}
                      />
                    </div>

                    {/* Device */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          deviceColors.bg,
                          deviceColors.text,
                          deviceColors.border,
                          'border'
                        )}
                      >
                        <DeviceIcon device={row.device} />
                        {DEVICE_LABELS[row.device]}
                      </span>
                    </div>

                    {/* Volume */}
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {row.search_volume
                          ? formatLargeNumber(row.search_volume)
                          : 'N/A'}
                      </p>
                      {row.ctr !== undefined && row.ctr !== null && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCTR(row.ctr)} CTR
                        </p>
                      )}
                    </div>

                    {/* Expand Indicator */}
                    <div className="col-span-2 flex justify-end">
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-gray-400 transition-transform',
                          isExpanded && 'transform rotate-180'
                        )}
                      />
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        {/* Performance Metrics */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                            <BarChart2 className="h-4 w-4" />
                            Performance
                          </h4>
                          <dl className="space-y-1.5">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">
                                Current Position
                              </dt>
                              <dd
                                className={cn(
                                  'font-bold',
                                  getRankColor(row.position)
                                )}
                              >
                                #{row.position}
                              </dd>
                            </div>
                            {row.previous_position && (
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">
                                  Previous Position
                                </dt>
                                <dd className="font-medium text-gray-900 dark:text-white">
                                  #{row.previous_position}
                                </dd>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">
                                Date Tracked
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-white">
                                {new Date(row.date).toLocaleDateString()}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Engagement Metrics */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                            <Eye className="h-4 w-4" />
                            Engagement
                          </h4>
                          <dl className="space-y-1.5">
                            {row.search_volume !== undefined && (
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">
                                  Search Volume
                                </dt>
                                <dd className="font-medium text-gray-900 dark:text-white">
                                  {formatLargeNumber(row.search_volume)}
                                </dd>
                              </div>
                            )}
                            {row.impressions !== undefined &&
                              row.impressions !== null && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-500 dark:text-gray-400">
                                    Impressions
                                  </dt>
                                  <dd className="font-medium text-gray-900 dark:text-white">
                                    {formatLargeNumber(row.impressions)}
                                  </dd>
                                </div>
                              )}
                            {row.clicks !== undefined &&
                              row.clicks !== null && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-500 dark:text-gray-400">
                                    Clicks
                                  </dt>
                                  <dd className="font-medium text-gray-900 dark:text-white">
                                    {formatLargeNumber(row.clicks)}
                                  </dd>
                                </div>
                              )}
                            {row.ctr !== undefined && row.ctr !== null && (
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">
                                  CTR
                                </dt>
                                <dd className="font-medium text-gray-900 dark:text-white">
                                  {formatCTR(row.ctr)}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {/* Target URL */}
                        <div className="md:col-span-2">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                            <ExternalLink className="h-4 w-4" />
                            Ranking URL
                          </h4>
                          {row.url ? (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all text-sm"
                            >
                              {row.url}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 italic">
                              No URL data available
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
          Showing <span className="font-medium">{sortedRankData.length}</span>{' '}
          rankings
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Top 3</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Top 10</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Top 20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Top 50</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

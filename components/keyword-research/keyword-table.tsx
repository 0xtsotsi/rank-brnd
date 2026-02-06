'use client';

/**
 * Keyword Table Component
 * Displays keyword research data in a sortable, filterable table
 */

import { useState, useMemo } from 'react';
import type {
  Keyword,
  KeywordSort,
  SortDirection,
} from '@/types/keyword-research';
import {
  formatSearchVolume,
  formatCPC,
  getRankColor,
  INTENT_LABELS,
  INTENT_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/types/keyword-research';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Trash2,
  Edit,
  Pause,
  Play,
} from 'lucide-react';

interface KeywordTableProps {
  keywords: Keyword[];
  onKeywordClick?: (keyword: Keyword) => void;
  onKeywordUpdate?: (id: string, updates: Partial<Keyword>) => void;
  onKeywordDelete?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

type SortField =
  | 'keyword'
  | 'searchVolume'
  | 'difficulty'
  | 'intent'
  | 'status'
  | 'currentRank'
  | 'createdAt';

export function KeywordTable({
  keywords,
  onKeywordClick,
  onKeywordUpdate,
  onKeywordDelete,
  isLoading = false,
  className,
}: KeywordTableProps) {
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort and memoize keywords
  const sortedKeywords = useMemo(() => {
    const result = [...keywords];

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'keyword':
          comparison = a.keyword.localeCompare(b.keyword);
          break;
        case 'searchVolume':
          comparison = (a.searchVolume || 0) - (b.searchVolume || 0);
          break;
        case 'difficulty':
          const difficultyOrder = [
            'very-easy',
            'easy',
            'medium',
            'hard',
            'very-hard',
          ];
          comparison =
            difficultyOrder.indexOf(a.difficulty) -
            difficultyOrder.indexOf(b.difficulty);
          break;
        case 'intent':
          comparison = a.intent.localeCompare(b.intent);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'currentRank':
          comparison = (a.currentRank || 999) - (b.currentRank || 999);
          break;
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [keywords, sortField, sortDirection]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Rank trend indicator
  const RankTrend = ({ rank }: { rank?: number }) => {
    if (!rank) return <Minus className="h-3 w-3 text-gray-400" />;
    if (rank <= 3) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (rank <= 10) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (rank <= 20) return <Minus className="h-3 w-3 text-yellow-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Handle keyword actions
  const handleAction = async (id: string, action: string) => {
    switch (action) {
      case 'delete':
        onKeywordDelete?.(id);
        break;
      case 'toggle-status':
        const keyword = keywords.find((k) => k.id === id);
        if (keyword) {
          const newStatus =
            keyword.status === 'tracking' ? 'paused' : 'tracking';
          onKeywordUpdate?.(id, { status: newStatus });
        }
        break;
    }
    setActionMenu(null);
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
      className={cn('keyword-table w-full', className)}
      data-testid="keyword-table"
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
            onClick={() => handleSort('searchVolume')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Volume <SortIndicator field="searchVolume" />
          </button>
          <button
            onClick={() => handleSort('difficulty')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Difficulty <SortIndicator field="difficulty" />
          </button>
          <button
            onClick={() => handleSort('intent')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Intent <SortIndicator field="intent" />
          </button>
          <button
            onClick={() => handleSort('currentRank')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Rank <SortIndicator field="currentRank" />
          </button>
          <div className="col-span-1" />
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedKeywords.length === 0 ? (
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="font-medium">No keywords found</p>
              <p className="text-sm">
                Try adjusting your filters or add new keywords
              </p>
            </div>
          ) : (
            sortedKeywords.map((keyword) => {
              const intentColors = INTENT_COLORS[keyword.intent];
              const difficultyColors = DIFFICULTY_COLORS[keyword.difficulty];
              const statusColors = STATUS_COLORS[keyword.status];
              const isExpanded = expandedRow === keyword.id;
              const showActionMenu = actionMenu === keyword.id;

              return (
                <div key={keyword.id} className="group">
                  {/* Main Row */}
                  <div
                    className={cn(
                      'grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                    )}
                    onClick={() => toggleRow(keyword.id)}
                    data-keyword-id={keyword.id}
                    data-testid="keyword-row"
                  >
                    {/* Keyword */}
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {keyword.keyword}
                      </p>
                      {keyword.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {keyword.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-300"
                            >
                              {tag}
                            </span>
                          ))}
                          {keyword.tags.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{keyword.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Volume */}
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatSearchVolume(keyword.searchVolume)}
                      </p>
                      {keyword.cpc !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCPC(keyword.cpc)} CPC
                        </p>
                      )}
                    </div>

                    {/* Difficulty */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          difficultyColors.bg,
                          difficultyColors.text,
                          difficultyColors.border,
                          'border'
                        )}
                      >
                        {DIFFICULTY_LABELS[keyword.difficulty]}
                      </span>
                    </div>

                    {/* Intent */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          intentColors.bg,
                          intentColors.text,
                          intentColors.border,
                          'border'
                        )}
                      >
                        {INTENT_LABELS[keyword.intent]}
                      </span>
                    </div>

                    {/* Rank */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <RankTrend rank={keyword.currentRank} />
                        {keyword.currentRank ? (
                          <span
                            className={cn(
                              'text-sm font-medium',
                              getRankColor(keyword.currentRank)
                            )}
                          >
                            #{keyword.currentRank}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium mt-1',
                          statusColors.bg,
                          statusColors.text
                        )}
                      >
                        {STATUS_LABELS[keyword.status]}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenu(showActionMenu ? null : keyword.id);
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
                            <button
                              onClick={() =>
                                handleAction(keyword.id, 'toggle-status')
                              }
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              {keyword.status === 'tracking' ? (
                                <>
                                  <Pause className="h-4 w-4" /> Pause Tracking
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4" /> Resume Tracking
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleAction(keyword.id, 'edit')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" /> Edit
                            </button>
                            {keyword.targetUrl && (
                              <a
                                href={keyword.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" /> View URL
                              </a>
                            )}
                            <div className="border-t border-gray-200 dark:border-gray-600" />
                            <button
                              onClick={() => handleAction(keyword.id, 'delete')}
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
                        {/* Metrics */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Metrics
                          </h4>
                          <dl className="space-y-1">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">
                                Search Volume
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-white">
                                {formatSearchVolume(keyword.searchVolume)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">
                                CPC
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-white">
                                {formatCPC(keyword.cpc)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">
                                Competition
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-white">
                                {keyword.competition !== undefined
                                  ? `${(keyword.competition * 100).toFixed(0)}%`
                                  : 'N/A'}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Target */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Target
                          </h4>
                          {keyword.targetUrl ? (
                            <a
                              href={keyword.targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all"
                            >
                              {keyword.targetUrl}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400">
                              No target URL set
                            </p>
                          )}
                          {keyword.lastChecked && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Last checked:{' '}
                              {new Date(
                                keyword.lastChecked
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Notes */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Notes
                          </h4>
                          {keyword.notes ? (
                            <p className="text-gray-600 dark:text-gray-300">
                              {keyword.notes}
                            </p>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 italic">
                              No notes
                            </p>
                          )}
                        </div>
                      </div>

                      {/* All Tags */}
                      {keyword.tags.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
                            Tags
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {keyword.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded bg-gray-200 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
          Showing <span className="font-medium">{sortedKeywords.length}</span>{' '}
          keywords
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
          </div>
        </div>
      </div>
    </div>
  );
}

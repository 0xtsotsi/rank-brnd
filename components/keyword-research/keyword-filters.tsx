'use client';

/**
 * Keyword Filters Component
 * Filters for keyword research including search, intent, difficulty, and status
 */

import { useState } from 'react';
import type {
  KeywordFilters,
  SearchIntent,
  DifficultyLevel,
  KeywordStatus,
} from '@/types/keyword-research';
import {
  INTENT_LABELS,
  DIFFICULTY_LABELS,
  STATUS_LABELS,
} from '@/types/keyword-research';
import { cn } from '@/lib/utils';
import { Search, X, Filter, ChevronDown } from 'lucide-react';

interface KeywordFiltersProps {
  filters: KeywordFilters;
  onFiltersChange: (filters: KeywordFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

export function KeywordFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
}: KeywordFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof KeywordFilters>(
    key: K,
    value: KeywordFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search ||
    filters.intent !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.status !== 'all' ||
    filters.tags.length > 0;

  return (
    <div
      className={cn('keyword-filters space-y-4', className)}
      data-testid="keyword-filters"
    >
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'transition-colors'
            )}
            data-testid="keyword-search-input"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Toggle Advanced Filters */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors',
            'border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-800',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-50 dark:hover:bg-gray-700',
            showAdvanced && 'ring-2 ring-indigo-500'
          )}
          data-testid="toggle-advanced-filters"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
              {[
                filters.intent !== 'all' ? 1 : 0,
                filters.difficulty !== 'all' ? 1 : 0,
                filters.status !== 'all' ? 1 : 0,
                filters.tags.length > 0 ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              showAdvanced && 'rotate-180'
            )}
          />
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            data-testid="clear-filters-button"
          >
            Clear
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border',
            'border-gray-200 dark:border-gray-700',
            'bg-gray-50 dark:bg-gray-900/50',
            'animate-fade-in'
          )}
          data-testid="advanced-filters"
        >
          {/* Intent Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Search Intent
            </label>
            <select
              value={filters.intent}
              onChange={(e) =>
                updateFilter('intent', e.target.value as SearchIntent | 'all')
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              data-testid="intent-filter"
            >
              <option value="all">All Intents</option>
              <option value="informational">Informational</option>
              <option value="navigational">Navigational</option>
              <option value="transactional">Transactional</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Difficulty
            </label>
            <select
              value={filters.difficulty}
              onChange={(e) =>
                updateFilter(
                  'difficulty',
                  e.target.value as DifficultyLevel | 'all'
                )
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              data-testid="difficulty-filter"
            >
              <option value="all">All Difficulties</option>
              <option value="very-easy">Very Easy</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="very-hard">Very Hard</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                updateFilter('status', e.target.value as KeywordStatus | 'all')
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              data-testid="status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="tracking">Tracking</option>
              <option value="paused">Paused</option>
              <option value="opportunity">Opportunity</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>

          {/* Volume Range */}
          <div className="sm:col-span-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Min Search Volume
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={filters.minSearchVolume || ''}
                onChange={(e) =>
                  updateFilter(
                    'minSearchVolume',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className={cn(
                  'w-full px-3 py-2 rounded-lg border',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  'transition-colors'
                )}
                data-testid="min-volume-filter"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Max Search Volume
              </label>
              <input
                type="number"
                placeholder="Any"
                min="0"
                value={filters.maxSearchVolume || ''}
                onChange={(e) =>
                  updateFilter(
                    'maxSearchVolume',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className={cn(
                  'w-full px-3 py-2 rounded-lg border',
                  'border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  'transition-colors'
                )}
                data-testid="max-volume-filter"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.intent !== 'all' && (
            <FilterTag
              label={`Intent: ${INTENT_LABELS[filters.intent as SearchIntent]}`}
              onRemove={() => updateFilter('intent', 'all')}
            />
          )}
          {filters.difficulty !== 'all' && (
            <FilterTag
              label={`Difficulty: ${DIFFICULTY_LABELS[filters.difficulty as DifficultyLevel]}`}
              onRemove={() => updateFilter('difficulty', 'all')}
            />
          )}
          {filters.status !== 'all' && (
            <FilterTag
              label={`Status: ${STATUS_LABELS[filters.status as KeywordStatus]}`}
              onRemove={() => updateFilter('status', 'all')}
            />
          )}
          {filters.minSearchVolume && (
            <FilterTag
              label={`Min Volume: ${filters.minSearchVolume}`}
              onRemove={() => updateFilter('minSearchVolume', undefined)}
            />
          )}
          {filters.maxSearchVolume && (
            <FilterTag
              label={`Max Volume: ${filters.maxSearchVolume}`}
              onRemove={() => updateFilter('maxSearchVolume', undefined)}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

function FilterTag({ label, onRemove }: FilterTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-indigo-100 dark:bg-indigo-900/30',
        'text-indigo-700 dark:text-indigo-300',
        'border border-indigo-200 dark:border-indigo-800'
      )}
    >
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

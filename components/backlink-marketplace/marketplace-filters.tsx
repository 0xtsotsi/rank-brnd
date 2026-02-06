'use client';

/**
 * Marketplace Filters Component
 * Filters for the backlink marketplace including DA, PA, niche, etc.
 */

import { useState } from 'react';
import type {
  MarketplaceFilters,
  MarketplaceSort,
} from '@/types/backlink-marketplace';
import {
  COMMON_NICHES,
  COMMON_LANGUAGES,
  COMMON_REGIONS,
} from '@/types/backlink-marketplace';
import { cn } from '@/lib/utils';
import { Search, X, Filter, ChevronDown, Globe } from 'lucide-react';

interface MarketplaceFiltersProps {
  filters: MarketplaceFilters;
  onFiltersChange: (filters: MarketplaceFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

const defaultNiches = [
  'Technology',
  'Business',
  'Health',
  'Finance',
  'Marketing',
  'SEO',
  'SaaS',
];

export function MarketplaceFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
}: MarketplaceFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof MarketplaceFilters>(
    key: K,
    value: MarketplaceFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleNiche = (niche: string) => {
    const newNiches = filters.niches.includes(niche)
      ? filters.niches.filter((n) => n !== niche)
      : [...filters.niches, niche];
    updateFilter('niches', newNiches);
  };

  const hasActiveFilters =
    filters.search ||
    filters.min_da !== undefined ||
    filters.max_da !== undefined ||
    filters.min_pa !== undefined ||
    filters.max_pa !== undefined ||
    filters.max_spam_score !== undefined ||
    filters.min_quality_score !== undefined ||
    filters.niches.length > 0 ||
    filters.language !== 'en' ||
    filters.region !== '';

  const activeFilterCount = [
    filters.min_da !== undefined,
    filters.max_da !== undefined,
    filters.min_pa !== undefined,
    filters.max_pa !== undefined,
    filters.max_spam_score !== undefined,
    filters.min_quality_score !== undefined,
    filters.niches.length > 0,
    filters.language !== 'en',
    filters.region !== '',
  ].filter(Boolean).length;

  return (
    <div
      className={cn('marketplace-filters space-y-4', className)}
      data-testid="marketplace-filters"
    >
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sites by domain or title..."
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
            data-testid="marketplace-search-input"
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

        {/* Sort Select */}
        <select
          value={filters.sort}
          onChange={(e) =>
            updateFilter('sort', e.target.value as MarketplaceSort)
          }
          className={cn(
            'px-4 py-2 rounded-lg border',
            'border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'transition-colors'
          )}
          data-testid="sort-select"
        >
          <option value="quality_score">Sort: Quality</option>
          <option value="domain_authority">Sort: Domain Authority</option>
          <option value="page_authority">Sort: Page Authority</option>
          <option value="credits_required">Sort: Credits (Low to High)</option>
          <option value="traffic">Sort: Traffic</option>
          <option value="success_rate">Sort: Success Rate</option>
          <option value="response_time">Sort: Response Time</option>
        </select>

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
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
              {activeFilterCount}
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
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg border',
            'border-gray-200 dark:border-gray-700',
            'bg-gray-50 dark:bg-gray-900/50',
            'animate-fade-in'
          )}
          data-testid="advanced-filters"
        >
          {/* Min DA */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Min Domain Authority
            </label>
            <input
              type="number"
              placeholder="0"
              min="0"
              max="100"
              value={filters.min_da ?? ''}
              onChange={(e) =>
                updateFilter(
                  'min_da',
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
              data-testid="min-da-filter"
            />
          </div>

          {/* Max DA */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Max Domain Authority
            </label>
            <input
              type="number"
              placeholder="100"
              min="0"
              max="100"
              value={filters.max_da ?? ''}
              onChange={(e) =>
                updateFilter(
                  'max_da',
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
              data-testid="max-da-filter"
            />
          </div>

          {/* Max Spam Score */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Max Spam Score
            </label>
            <input
              type="number"
              placeholder="30"
              min="0"
              max="100"
              value={filters.max_spam_score ?? ''}
              onChange={(e) =>
                updateFilter(
                  'max_spam_score',
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
              data-testid="max-spam-filter"
            />
          </div>

          {/* Min Quality Score */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Min Quality Score
            </label>
            <input
              type="number"
              placeholder="60"
              min="0"
              max="100"
              value={filters.min_quality_score ?? ''}
              onChange={(e) =>
                updateFilter(
                  'min_quality_score',
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
              data-testid="min-quality-filter"
            />
          </div>

          {/* Max Credits */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Max Credits Required
            </label>
            <input
              type="number"
              placeholder="Any"
              min="1"
              value={filters.max_credits ?? ''}
              onChange={(e) =>
                updateFilter(
                  'max_credits',
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
              data-testid="max-credits-filter"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => updateFilter('language', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              data-testid="language-filter"
            >
              {COMMON_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Region
            </label>
            <select
              value={filters.region}
              onChange={(e) => updateFilter('region', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border',
                'border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500',
                'transition-colors'
              )}
              data-testid="region-filter"
            >
              {COMMON_REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          {/* Min Traffic */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Min Monthly Traffic
            </label>
            <select
              value={
                filters.min_traffic === undefined
                  ? ''
                  : filters.min_traffic.toString()
              }
              onChange={(e) =>
                updateFilter(
                  'min_traffic',
                  e.target.value ? parseInt(e.target.value) : undefined
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
              data-testid="min-traffic-filter"
            >
              <option value="">Any Traffic</option>
              <option value="1000">1K+</option>
              <option value="10000">10K+</option>
              <option value="50000">50K+</option>
              <option value="100000">100K+</option>
              <option value="500000">500K+</option>
            </select>
          </div>

          {/* Niches */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Niches
            </label>
            <div className="flex flex-wrap gap-2">
              {defaultNiches.map((niche) => (
                <button
                  key={niche}
                  onClick={() => toggleNiche(niche)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filters.niches.includes(niche)
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  )}
                  data-testid={`niche-filter-${niche.toLowerCase().replace(' ', '-')}`}
                >
                  {niche}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.min_da !== undefined && (
            <FilterTag
              label={`Min DA: ${filters.min_da}`}
              onRemove={() => updateFilter('min_da', undefined)}
            />
          )}
          {filters.max_da !== undefined && (
            <FilterTag
              label={`Max DA: ${filters.max_da}`}
              onRemove={() => updateFilter('max_da', undefined)}
            />
          )}
          {filters.max_spam_score !== undefined && (
            <FilterTag
              label={`Max Spam: ${filters.max_spam_score}`}
              onRemove={() => updateFilter('max_spam_score', undefined)}
            />
          )}
          {filters.min_quality_score !== undefined && (
            <FilterTag
              label={`Min Quality: ${filters.min_quality_score}`}
              onRemove={() => updateFilter('min_quality_score', undefined)}
            />
          )}
          {filters.max_credits !== undefined && (
            <FilterTag
              label={`Max Credits: ${filters.max_credits}`}
              onRemove={() => updateFilter('max_credits', undefined)}
            />
          )}
          {filters.language !== 'en' && (
            <FilterTag
              label={`Lang: ${COMMON_LANGUAGES.find((l) => l.value === filters.language)?.label || filters.language}`}
              onRemove={() => updateFilter('language', 'en')}
            />
          )}
          {filters.region !== '' && (
            <FilterTag
              label={`Region: ${COMMON_REGIONS.find((r) => r.value === filters.region)?.label || filters.region}`}
              onRemove={() => updateFilter('region', '')}
            />
          )}
          {filters.niches.map((niche) => (
            <FilterTag
              key={niche}
              label={niche}
              onRemove={() => toggleNiche(niche)}
            />
          ))}
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

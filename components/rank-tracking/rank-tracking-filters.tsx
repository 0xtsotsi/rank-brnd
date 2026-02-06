'use client';

/**
 * Rank Tracking Filters Component
 * Filters for rank tracking data by device, location, date range
 */

import { useState } from 'react';
import type { RankDevice } from '@/types/rank-tracking';
import {
  DEVICE_LABELS,
  DEVICE_COLORS,
  LOCATION_LABELS,
} from '@/types/rank-tracking';
import { cn } from '@/lib/utils';
import { Search, X, ChevronDown, Filter } from 'lucide-react';

export interface RankTrackingFilters {
  search: string;
  device: 'all' | RankDevice;
  location: string;
  dateRange: 'all' | '7d' | '30d' | '90d';
}

interface RankTrackingFiltersProps {
  filters: RankTrackingFilters;
  onFiltersChange: (filters: RankTrackingFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

const popularLocations = [
  { code: 'all', name: 'All Locations' },
  { code: 'us', name: 'United States' },
  { code: 'uk', name: 'United Kingdom' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'de', name: 'Germany' },
  { code: 'global', name: 'Global' },
];

const dateRanges = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

export function RankTrackingFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
}: RankTrackingFiltersProps) {
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const activeFilterCount =
    (filters.device !== 'all' ? 1 : 0) +
    (filters.location !== 'all' ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.search.length > 0 ? 1 : 0);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleDeviceChange = (device: 'all' | RankDevice) => {
    onFiltersChange({ ...filters, device });
    setShowDeviceDropdown(false);
  };

  const handleLocationChange = (location: string) => {
    onFiltersChange({ ...filters, location });
    setShowLocationDropdown(false);
  };

  const handleDateRangeChange = (dateRange: 'all' | '7d' | '30d' | '90d') => {
    onFiltersChange({ ...filters, dateRange });
    setShowDateDropdown(false);
  };

  return (
    <div
      className={cn('space-y-4', className)}
      data-testid="rank-tracking-filters"
    >
      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'transition-colors'
            )}
            data-testid="search-input"
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'border border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            data-testid="clear-filters-button"
          >
            <Filter className="h-4 w-4" />
            Clear Filters
            {activeFilterCount > 0 && (
              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap gap-3">
        {/* Device Filter */}
        <div className="relative">
          <button
            onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'border',
              filters.device !== 'all'
                ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            data-testid="device-filter-button"
          >
            {filters.device !== 'all' ? (
              <>
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    DEVICE_COLORS[filters.device].bg
                      .replace('bg-', 'bg-')
                      .split(' ')[0]
                  )}
                />
                {DEVICE_LABELS[filters.device]}
              </>
            ) : (
              <>Device</>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>

          {showDeviceDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDeviceDropdown(false)}
              />
              <div
                className={cn(
                  'absolute top-full mt-1 left-0 z-20',
                  'rounded-lg border border-gray-200 dark:border-gray-600',
                  'bg-white dark:bg-gray-800',
                  'shadow-lg',
                  'min-w-[160px]'
                )}
              >
                <button
                  onClick={() => handleDeviceChange('all')}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                    'flex items-center gap-2',
                    filters.device === 'all' && 'bg-gray-50 dark:bg-gray-700'
                  )}
                >
                  All Devices
                </button>
                {(Object.keys(DEVICE_LABELS) as RankDevice[]).map((device) => {
                  const colors = DEVICE_COLORS[device];
                  return (
                    <button
                      key={device}
                      onClick={() => handleDeviceChange(device)}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                        'flex items-center gap-2',
                        filters.device === device &&
                          'bg-gray-50 dark:bg-gray-700'
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', colors.bg)} />
                      {DEVICE_LABELS[device]}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Location Filter */}
        <div className="relative">
          <button
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'border',
              filters.location !== 'all'
                ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            data-testid="location-filter-button"
          >
            {filters.location !== 'all' ? (
              LOCATION_LABELS[filters.location] || filters.location
            ) : (
              <>Location</>
            )}
            <ChevronDown className="h-4 w-4" />
          </button>

          {showLocationDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLocationDropdown(false)}
              />
              <div
                className={cn(
                  'absolute top-full mt-1 left-0 z-20',
                  'rounded-lg border border-gray-200 dark:border-gray-600',
                  'bg-white dark:bg-gray-800',
                  'shadow-lg',
                  'min-w-[200px] max-h-[300px] overflow-y-auto'
                )}
              >
                {popularLocations.map((loc) => (
                  <button
                    key={loc.code}
                    onClick={() => handleLocationChange(loc.code)}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap',
                      filters.location === loc.code &&
                        'bg-gray-50 dark:bg-gray-700'
                    )}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="relative">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'border',
              filters.dateRange !== 'all'
                ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            data-testid="date-filter-button"
          >
            {dateRanges.find((r) => r.value === filters.dateRange)?.label ||
              'Date Range'}
            <ChevronDown className="h-4 w-4" />
          </button>

          {showDateDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDateDropdown(false)}
              />
              <div
                className={cn(
                  'absolute top-full mt-1 left-0 z-20',
                  'rounded-lg border border-gray-200 dark:border-gray-600',
                  'bg-white dark:bg-gray-800',
                  'shadow-lg',
                  'min-w-[160px]'
                )}
              >
                {dateRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => handleDateRangeChange(range.value as any)}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                      filters.dateRange === range.value &&
                        'bg-gray-50 dark:bg-gray-700'
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Analytics Filters Component
 * Filter controls for the GSC Analytics page
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  AnalyticsFilters,
  DateRangePreset,
} from '@/types/google-search-console';
import { Calendar, Filter } from 'lucide-react';

const dateRangePresets: DateRangePreset[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'all', label: 'All time' },
];

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  productOptions: { id: string; name: string }[];
  isLoading?: boolean;
}

export function AnalyticsFilters({
  filters,
  onFiltersChange,
  productOptions,
  isLoading = false,
}: AnalyticsFiltersProps) {
  const [showKeywordSearch, setShowKeywordSearch] = useState(false);

  const handleDateRangeChange = (value: AnalyticsFilters['dateRange']) => {
    onFiltersChange({ ...filters, dateRange: value });
  };

  const handleProductChange = (productId: string) => {
    onFiltersChange({ ...filters, productId });
  };

  const handleKeywordChange = (keyword: string) => {
    onFiltersChange({ ...filters, keyword: keyword || undefined });
  };

  const selectedProduct = productOptions.find(
    (p) => p.id === filters.productId
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
        </div>
        {(filters.dateRange !== '30d' || filters.keyword) && (
          <button
            onClick={() =>
              onFiltersChange({
                productId: filters.productId,
                dateRange: '30d',
              })
            }
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Product Selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Product
          </label>
          <select
            value={filters.productId}
            onChange={(e) => handleProductChange(e.target.value)}
            disabled={isLoading}
            className={cn(
              'w-full px-3 py-2 rounded-lg border',
              'bg-white dark:bg-gray-700',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {productOptions.length === 0 ? (
              <option value="">No products available</option>
            ) : (
              productOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) =>
              handleDateRangeChange(
                e.target.value as AnalyticsFilters['dateRange']
              )
            }
            disabled={isLoading}
            className={cn(
              'w-full px-3 py-2 rounded-lg border',
              'bg-white dark:bg-gray-700',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {dateRangePresets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Keyword Search */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Keyword
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.keyword || ''}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Filter by keyword..."
              disabled={isLoading}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg border',
                'bg-white dark:bg-gray-700',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-white placeholder-gray-400',
                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Selected product display */}
      {selectedProduct && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>
            Showing data for <strong>{selectedProduct.name}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

// Simple Search icon component
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

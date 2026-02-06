'use client';

/**
 * Google Search Console Analytics Page
 * Main analytics dashboard displaying GSC data with metrics, trends, and insights
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AnalyticsFilters,
  AnalyticsMetrics,
  AnalyticsTable,
  TopKeywords,
  OpportunityGaps,
} from '@/components/search-console';
import type {
  AnalyticsFilters as FiltersType,
  SearchConsoleData,
  SearchConsoleMetrics,
} from '@/types/google-search-console';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const defaultFilters: FiltersType = {
  productId: '',
  dateRange: '30d',
};

export default function GscAnalyticsPage() {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<FiltersType>(defaultFilters);
  const [gscData, setGscData] = useState<SearchConsoleData[]>([]);
  const [metrics, setMetrics] = useState<SearchConsoleMetrics>({
    total_impressions: 0,
    total_clicks: 0,
    avg_ctr: 0,
    avg_position: 0,
    unique_keywords: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products || []);

        // Set first product as default if available
        if (data.products && data.products.length > 0 && !filters.productId) {
          setFilters((prev) => ({ ...prev, productId: data.products[0].id }));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      }
    };

    fetchProducts();
    // Intentionally only run on mount - fetch products once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate date range from filters
  const getDateRange = useCallback(() => {
    const today = new Date();
    const ranges: Record<string, { startDate: Date; endDate: Date }> = {
      '7d': {
        startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: today,
      },
      '30d': {
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: today,
      },
      '90d': {
        startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: today,
      },
      all: {
        startDate: new Date('2020-01-01'),
        endDate: today,
      },
    };
    return ranges[filters.dateRange] || ranges['30d'];
  }, [filters.dateRange]);

  // Fetch GSC data and metrics
  useEffect(() => {
    if (!filters.productId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { startDate, endDate } = getDateRange();

        // Fetch GSC data
        const dataParams = new URLSearchParams({
          productId: filters.productId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          sort: 'impressions',
          order: 'desc',
          limit: '1000',
        });

        if (filters.keyword) {
          dataParams.append('keyword', filters.keyword);
        }

        const [dataResponse, metricsResponse] = await Promise.all([
          fetch(`/api/search-console?${dataParams.toString()}`),
          fetch(
            `/api/search-console/metrics?productId=${filters.productId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
          ),
        ]);

        if (!dataResponse.ok || !metricsResponse.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const dataResult = await dataResponse.json();
        const metricsResult = await metricsResponse.json();

        setGscData(dataResult.data || []);
        setMetrics(
          metricsResult || {
            total_impressions: 0,
            total_clicks: 0,
            avg_ctr: 0,
            avg_position: 0,
            unique_keywords: 0,
          }
        );
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load analytics data'
        );
        setGscData([]);
        setMetrics({
          total_impressions: 0,
          total_clicks: 0,
          avg_ctr: 0,
          avg_position: 0,
          unique_keywords: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters.productId, filters.dateRange, filters.keyword, getDateRange]);

  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6 fade-in" data-testid="gsc-analytics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Search Console Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor your search performance, keyword rankings, and discover
            opportunities
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-300">
              Error loading analytics
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <AnalyticsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        productOptions={products}
        isLoading={isLoading}
      />

      {/* Metrics Cards */}
      <AnalyticsMetrics metrics={metrics} isLoading={isLoading} />

      {/* Top Keywords and Opportunities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TopKeywords
            data={gscData}
            metric="impressions"
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-1">
          <TopKeywords data={gscData} metric="ctr" isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <OpportunityGaps data={gscData} isLoading={isLoading} />
        </div>
      </div>

      {/* Full Data Table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            All Keywords
          </h2>
        </div>
        <AnalyticsTable data={gscData} isLoading={isLoading} />
      </div>
    </div>
  );
}

// Icon component for local use
function TrendingUp({ className }: { className?: string }) {
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
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

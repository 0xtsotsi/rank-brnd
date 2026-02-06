'use client';

/**
 * Rank Tracking Page
 * Main page for tracking keyword rankings with position changes, trends, and filters
 */

import { useState, useEffect, useCallback } from 'react';
import type { RankDevice } from '@/types/rank-tracking';
import type { RankTrackingTableRow } from '@/components/rank-tracking/rank-tracking-table';
import {
  RankTrackingFilters,
  type RankTrackingFilters as FiltersType,
} from '@/components/rank-tracking/rank-tracking-filters';
import { RankTrackingTable } from '@/components/rank-tracking/rank-tracking-table';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  LineChart,
} from 'lucide-react';

const defaultFilters: FiltersType = {
  search: '',
  device: 'all',
  location: 'all',
  dateRange: 'all',
};

export default function RankTrackingPage() {
  const [rankData, setRankData] = useState<RankTrackingTableRow[]>([]);
  const [filteredRankData, setFilteredRankData] = useState<
    RankTrackingTableRow[]
  >([]);
  const [filters, setFilters] = useState<FiltersType>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rank tracking data from API
  const fetchRankData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.device !== 'all') params.append('device', filters.device);
      if (filters.location !== 'all')
        params.append('location', filters.location);
      if (filters.dateRange !== 'all') {
        const days =
          filters.dateRange === '7d'
            ? 7
            : filters.dateRange === '30d'
              ? 30
              : 90;
        params.append('days', days.toString());
      }

      const response = await fetch(`/api/rank-tracking?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch rank tracking data');
      }

      const data = await response.json();
      setRankData(data.rankings || []);
      setFilteredRankData(data.rankings || []);
    } catch (err) {
      console.error('Error fetching rank data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load rank tracking data'
      );
      setRankData([]);
      setFilteredRankData([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchRankData();
  }, [fetchRankData]);

  // Handle filters change
  const handleFiltersChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  // Handle row click
  const handleRowClick = (row: RankTrackingTableRow) => {
    console.log('Clicked row:', row);
    // TODO: Show historical chart dialog for this keyword
  };

  // Calculate summary stats
  const stats = {
    total: rankData.length,
    top3: rankData.filter((r) => r.position <= 3).length,
    top10: rankData.filter((r) => r.position <= 10).length,
    improved: rankData.filter(
      (r) => r.position_change !== null && r.position_change < 0
    ).length,
    declined: rankData.filter(
      (r) => r.position_change !== null && r.position_change > 0
    ).length,
    avgPosition:
      rankData.length > 0
        ? Math.round(
            rankData.reduce((sum, r) => sum + r.position, 0) / rankData.length
          )
        : 0,
  };

  return (
    <div className="space-y-6 fade-in" data-testid="rank-tracking-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rank Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor your keyword rankings with position changes and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              /* TODO: Implement add rank tracking modal */
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-indigo-600 text-white hover:bg-indigo-700'
            )}
            data-testid="add-tracking-button"
          >
            <TrendingUp className="h-4 w-4" />
            Track Keyword
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-300">
              Error loading rank tracking data
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Tracked Keywords"
          value={stats.total}
          icon={LineChart}
          color="indigo"
        />
        <StatCard
          label="Top 3 Rankings"
          value={stats.top3}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Top 10 Rankings"
          value={stats.top10}
          icon={BarChart3}
          color="emerald"
        />
        <StatCard
          label="Improved"
          value={stats.improved}
          icon={ArrowUp}
          color="green"
          sublabel={
            stats.declined > 0 ? `${stats.declined} declined` : undefined
          }
        />
        <StatCard
          label="Avg Position"
          value={`#${stats.avgPosition}`}
          icon={Minus}
          color="amber"
        />
      </div>

      {/* Filters */}
      <RankTrackingFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Rank Tracking Table */}
      <RankTrackingTable
        rankData={filteredRankData}
        onRowClick={handleRowClick}
        isLoading={isLoading}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'green' | 'emerald' | 'amber';
  sublabel?: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sublabel,
}: StatCardProps) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      iconText: 'text-indigo-600 dark:text-indigo-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      iconText: 'text-green-600 dark:text-green-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconText: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      iconText: 'text-amber-600 dark:text-amber-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        classes.bg,
        'border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', classes.iconBg)}>
          <Icon className={cn('h-5 w-5', classes.iconText)} />
        </div>
        <div className="flex-1">
          <p className={cn('text-2xl font-bold', classes.text)}>{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          {sublabel && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Keyword Research Page
 * Main page for keyword research with search, filters, and bulk import
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Keyword,
  KeywordFilters,
  ImportResult,
} from '@/types/keyword-research';
import type {
  KeywordImportRow,
  DifficultyLevel,
} from '@/types/keyword-research';
import { KeywordFilters as KeywordFiltersComponent } from '@/components/keyword-research/keyword-filters';
import { KeywordTable } from '@/components/keyword-research/keyword-table';
import { BulkImportDialog } from '@/components/keyword-research/bulk-import-dialog';
import { KeywordSearch } from '@/components/keyword-research/keyword-search';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Upload,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';

const defaultFilters: KeywordFilters = {
  search: '',
  intent: 'all',
  difficulty: 'all',
  status: 'all',
  tags: [],
};

export default function KeywordResearchPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [filteredKeywords, setFilteredKeywords] = useState<Keyword[]>([]);
  const [filters, setFilters] = useState<KeywordFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch keywords from API
  const fetchKeywords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.intent !== 'all') params.append('intent', filters.intent);
      if (filters.difficulty !== 'all')
        params.append('difficulty', filters.difficulty);
      if (filters.status !== 'all') params.append('status', filters.status);

      const response = await fetch(`/api/keywords?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch keywords');
      }

      const data = await response.json();
      setKeywords(data.keywords || []);
      setFilteredKeywords(data.keywords || []);
    } catch (err) {
      console.error('Error fetching keywords:', err);
      setError(err instanceof Error ? err.message : 'Failed to load keywords');
      setKeywords([]);
      setFilteredKeywords([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  // Handle filters change
  const handleFiltersChange = (newFilters: KeywordFilters) => {
    setFilters(newFilters);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  // Handle keyword update
  const handleKeywordUpdate = async (id: string, updates: Partial<Keyword>) => {
    setKeywords((prev) =>
      prev.map((kw) => (kw.id === id ? { ...kw, ...updates } : kw))
    );
  };

  // Handle keyword delete
  const handleKeywordDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/keywords?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete keyword');
      }

      setKeywords((prev) => prev.filter((kw) => kw.id !== id));
    } catch (err) {
      console.error('Error deleting keyword:', err);
    }
  };

  // Handle bulk import
  const handleBulkImport = async (
    rows: KeywordImportRow[]
  ): Promise<ImportResult> => {
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          keywords: rows,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import keywords');
      }

      const result = await response.json();

      // Refresh keywords after successful import
      if (result.successful > 0) {
        await fetchKeywords();
      }

      return result;
    } catch (err) {
      console.error('Error importing keywords:', err);
      return {
        total: rows.length,
        successful: 0,
        failed: rows.length,
        errors: rows.map((row, i) => ({
          row: i + 1,
          keyword: row.keyword,
          error: err instanceof Error ? err.message : 'Unknown error',
        })),
      };
    }
  };

  // Handle add keyword from search
  const handleAddKeyword = async (
    keyword: string,
    metrics: {
      search_volume: number;
      difficulty: number;
      difficulty_level: DifficultyLevel;
      opportunity: number;
      cpc: number;
      competition: number;
    }
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: false,
          organization_id: 'default', // This would come from user context
          keyword,
          search_volume: metrics.search_volume,
          difficulty: metrics.difficulty_level,
          cpc: metrics.cpc,
          competition: metrics.competition,
          opportunity_score: metrics.opportunity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add keyword');
      }

      // Show success message
      setSuccessMessage(`Added "${keyword}" to your keyword list`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh keywords
      await fetchKeywords();

      return true;
    } catch (err) {
      console.error('Error adding keyword:', err);
      setError(err instanceof Error ? err.message : 'Failed to add keyword');
      return false;
    }
  };

  // Calculate summary stats
  const stats = {
    total: keywords.length,
    tracking: keywords.filter((k) => k.status === 'tracking').length,
    opportunities: keywords.filter((k) => k.status === 'opportunity').length,
    avgVolume:
      keywords.length > 0
        ? Math.round(
            keywords.reduce((sum, k) => sum + (k.searchVolume || 0), 0) /
              keywords.length
          )
        : 0,
    topRankings: keywords.filter((k) => k.currentRank && k.currentRank <= 10)
      .length,
  };

  return (
    <div className="space-y-6 fade-in" data-testid="keyword-research-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Keyword Research
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Research, track, and analyze keywords for your SEO strategy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'border border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              showSearch && 'ring-2 ring-indigo-500'
            )}
            data-testid="toggle-search-button"
          >
            <Search className="h-4 w-4" />
            {showSearch ? 'Hide Search' : 'Search Keywords'}
          </button>
          <button
            onClick={() => setShowImportDialog(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'border border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            data-testid="bulk-import-button"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </button>
          <button
            onClick={() => {
              /* TODO: Implement add keyword modal */
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-indigo-600 text-white hover:bg-indigo-700'
            )}
            data-testid="add-keyword-button"
          >
            <Plus className="h-4 w-4" />
            Add Keyword
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-900 dark:text-red-300">Error</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded"
          >
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-400">
            {successMessage}
          </p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded"
          >
            <X className="h-3 w-3 text-green-600 dark:text-green-400" />
          </button>
        </div>
      )}

      {/* Keyword Search Panel */}
      {showSearch && (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-fade-in">
          <KeywordSearch onAddKeyword={handleAddKeyword} />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Keywords"
          value={stats.total}
          icon={Search}
          color="indigo"
        />
        <StatCard
          label="Tracking"
          value={stats.tracking}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Top 10 Rankings"
          value={stats.topRankings}
          icon={BarChart3}
          color="emerald"
        />
        <StatCard
          label="Opportunities"
          value={stats.opportunities}
          icon={AlertCircle}
          color="amber"
        />
      </div>

      {/* Filters */}
      <KeywordFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Keywords Table */}
      <KeywordTable
        keywords={filteredKeywords}
        onKeywordUpdate={handleKeywordUpdate}
        onKeywordDelete={handleKeywordDelete}
        isLoading={isLoading}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'green' | 'emerald' | 'amber';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
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
        <div>
          <p className={cn('text-2xl font-bold', classes.text)}>{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

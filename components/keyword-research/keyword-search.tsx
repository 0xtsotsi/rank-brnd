'use client';

/**
 * Keyword Search Component
 * Search for keywords using DataForSEO API and display results
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Loader2,
  Plus,
  TrendingUp,
  BarChart3,
  DollarSign,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import type { DifficultyLevel, SearchIntent } from '@/types/keyword-research';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  INTENT_LABELS,
  INTENT_COLORS,
  formatSearchVolume,
  formatCPC,
} from '@/types/keyword-research';

interface KeywordMetrics {
  search_volume: number;
  difficulty: number;
  difficulty_level: DifficultyLevel;
  opportunity: number;
  cpc: number;
  competition: number;
  trend?: {
    positive: number;
    negative: number;
  };
}

interface KeywordSuggestion extends KeywordMetrics {
  keyword: string;
}

interface SearchResponse {
  keyword: string;
  metrics: KeywordMetrics;
  suggestions?: KeywordSuggestion[];
}

interface KeywordSearchProps {
  onAddKeyword?: (keyword: string, metrics: KeywordMetrics) => Promise<boolean>;
  className?: string;
}

export function KeywordSearch({ onAddKeyword, className }: KeywordSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState<Set<string>>(new Set());

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResults(null);

    try {
      const params = new URLSearchParams({
        keyword: searchQuery,
        include_suggestions: 'true',
        suggestion_limit: '20',
      });

      const response = await fetch(`/api/keywords/search?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search keyword');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Error searching keyword:', err);
      setError(err instanceof Error ? err.message : 'Failed to search keyword');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle add keyword
  const handleAddKeyword = useCallback(
    async (keyword: string, metrics: KeywordMetrics) => {
      if (!onAddKeyword) return;

      setIsAdding((prev) => new Set(prev).add(keyword));

      try {
        const success = await onAddKeyword(keyword, metrics);
        if (success) {
          setAddedKeywords((prev) => new Set(prev).add(keyword));
        }
      } catch (err) {
        console.error('Error adding keyword:', err);
      } finally {
        setIsAdding((prev) => {
          const next = new Set(prev);
          next.delete(keyword);
          return next;
        });
      }
    },
    [onAddKeyword]
  );

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div
      className={cn('keyword-search space-y-4', className)}
      data-testid="keyword-search"
    >
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Enter a keyword to research..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg border',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'transition-colors'
            )}
            data-testid="keyword-search-input"
            disabled={isSearching}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setError(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              data-testid="clear-search-button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          data-testid="search-button"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults && !isSearching && (
        <div className="space-y-4">
          {/* Main Result */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {searchResults.keyword}
                </h3>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Volume */}
                  <MetricCard
                    label="Search Volume"
                    value={formatSearchVolume(
                      searchResults.metrics.search_volume
                    )}
                    icon={TrendingUp}
                    color="indigo"
                  />

                  {/* Difficulty */}
                  <MetricCard
                    label="Difficulty"
                    value={
                      DIFFICULTY_LABELS[searchResults.metrics.difficulty_level]
                    }
                    icon={BarChart3}
                    color={getDifficultyColor(
                      searchResults.metrics.difficulty_level
                    )}
                  />

                  {/* CPC */}
                  <MetricCard
                    label="CPC"
                    value={formatCPC(searchResults.metrics.cpc)}
                    icon={DollarSign}
                    color="green"
                  />

                  {/* Opportunity */}
                  <MetricCard
                    label="Opportunity"
                    value={searchResults.metrics.opportunity.toFixed(0)}
                    icon={TrendingUp}
                    color="amber"
                  />
                </div>
              </div>

              {/* Add Button */}
              {onAddKeyword && (
                <button
                  onClick={() =>
                    handleAddKeyword(
                      searchResults.keyword,
                      searchResults.metrics
                    )
                  }
                  disabled={
                    isAdding.has(searchResults.keyword) ||
                    addedKeywords.has(searchResults.keyword)
                  }
                  className={cn(
                    'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                    addedKeywords.has(searchResults.keyword)
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  data-testid="add-main-keyword-button"
                >
                  {isAdding.has(searchResults.keyword) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : addedKeywords.has(searchResults.keyword) ? (
                    <>
                      <Check className="h-4 w-4" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to List
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Suggestions */}
          {searchResults.suggestions &&
            searchResults.suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Keyword Suggestions ({searchResults.suggestions.length})
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.keyword}
                      suggestion={suggestion}
                      isAdded={addedKeywords.has(suggestion.keyword)}
                      isAdding={isAdding.has(suggestion.keyword)}
                      onAdd={() =>
                        handleAddKeyword(suggestion.keyword, suggestion)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'green' | 'amber' | 'emerald' | 'red' | 'orange';
}

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
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
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      iconText: 'text-amber-600 dark:text-amber-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconText: 'text-emerald-600 dark:text-emerald-400',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      iconText: 'text-red-600 dark:text-red-400',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      iconText: 'text-orange-600 dark:text-orange-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={cn('p-3 rounded-lg', classes.bg)}>
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('p-1 rounded', classes.iconBg)}>
          <Icon className={cn('h-3.5 w-3.5', classes.iconText)} />
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      </div>
      <p className={cn('text-lg font-semibold', classes.text)}>{value}</p>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: KeywordSuggestion;
  isAdded: boolean;
  isAdding: boolean;
  onAdd: () => void;
}

function SuggestionCard({
  suggestion,
  isAdded,
  isAdding,
  onAdd,
}: SuggestionCardProps) {
  const difficultyColors = DIFFICULTY_COLORS[suggestion.difficulty_level];

  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
          {suggestion.keyword}
        </p>
        <button
          onClick={onAdd}
          disabled={isAdding || isAdded}
          className={cn(
            'flex-shrink-0 p-1.5 rounded-lg transition-colors',
            isAdded
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          data-testid={`add-suggestion-${suggestion.keyword.replace(/\s+/g, '-')}-button`}
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isAdded ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Volume */}
        <span className="text-gray-600 dark:text-gray-400">
          {formatSearchVolume(suggestion.search_volume)}
        </span>

        {/* Difficulty */}
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            difficultyColors.bg,
            difficultyColors.text,
            difficultyColors.border,
            'border'
          )}
        >
          {DIFFICULTY_LABELS[suggestion.difficulty_level]}
        </span>

        {/* CPC */}
        <span className="text-gray-600 dark:text-gray-400">
          {formatCPC(suggestion.cpc)}
        </span>
      </div>
    </div>
  );
}

function getDifficultyColor(
  difficulty: DifficultyLevel
): 'indigo' | 'green' | 'amber' | 'emerald' | 'red' | 'orange' {
  switch (difficulty) {
    case 'very-easy':
    case 'easy':
      return 'emerald';
    case 'medium':
      return 'amber';
    case 'hard':
      return 'orange';
    case 'very-hard':
      return 'red';
    default:
      return 'indigo';
  }
}

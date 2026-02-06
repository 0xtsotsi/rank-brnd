'use client';

/**
 * Competitor Comparison Table Component
 * Displays competitor ranking comparisons with gaps, opportunities, and trends
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Award,
  Target,
  Zap,
  MoreHorizontal,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type OpportunityType = 'quick-win' | 'medium-effort' | 'long-term';
export type RankTrend = 'up' | 'down' | 'stable';

export interface CompetitorComparisonTableRow {
  id: string;
  keyword_id: string;
  keyword: string;
  user_current_rank: number | null;
  user_url: string | null;
  competitor_domains: string[];
  competitor_ranks: Record<string, { rank: number; url?: string }>;
  ranking_gaps: Array<{
    domain: string;
    rank: number;
    gap_size: number;
    opportunity_type: OpportunityType;
  }>;
  gap_to_first_page: number | null;
  gap_to_top_3: number | null;
  gap_to_position_1: number | null;
  opportunity_type: OpportunityType;
  opportunity_score: number | null;
  avg_competitor_rank: number | null;
  strongest_competitor_domain: string | null;
  strongest_competitor_rank: number | null;
  rank_trend: RankTrend | null;
  previous_rank: number | null;
  device: string;
  location: string;
  last_analyzed_at: string;
  search_volume?: number;
}

interface CompetitorComparisonTableProps {
  comparisons: CompetitorComparisonTableRow[];
  onRowClick?: (row: CompetitorComparisonTableRow) => void;
  onAnalyze?: (keywordIds: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

type SortField =
  | 'keyword'
  | 'user_current_rank'
  | 'gap_to_first_page'
  | 'opportunity_score'
  | 'opportunity_type'
  | 'rank_trend'
  | 'last_analyzed_at';

// Opportunity type configuration
const OPPORTUNITY_CONFIG: Record<
  OpportunityType,
  { label: string; color: string; bgColor: string; icon: typeof Zap }
> = {
  'quick-win': {
    label: 'Quick Win',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: Zap,
  },
  'medium-effort': {
    label: 'Medium Effort',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Target,
  },
  'long-term': {
    label: 'Long Term',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Award,
  },
};

// Rank trend colors
const getTrendColor = (trend: RankTrend | null): string => {
  switch (trend) {
    case 'up':
      return 'text-green-600 dark:text-green-400';
    case 'down':
      return 'text-red-600 dark:text-red-400';
    case 'stable':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
};

// Get rank color based on position
const getRankColor = (rank: number | null): string => {
  if (rank === null) return 'text-gray-400';
  if (rank <= 3) return 'text-green-600 dark:text-green-400 font-semibold';
  if (rank <= 10) return 'text-blue-600 dark:text-blue-400';
  if (rank <= 20) return 'text-yellow-600 dark:text-yellow-400';
  if (rank <= 50) return 'text-orange-600 dark:text-orange-400';
  return 'text-gray-600 dark:text-gray-400';
};

// Format rank for display
const formatRank = (rank: number | null): string => {
  if (rank === null) return '-';
  return `#${rank}`;
};

export function CompetitorComparisonTable({
  comparisons,
  onRowClick,
  onAnalyze,
  isLoading = false,
  className,
}: CompetitorComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('opportunity_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterOpportunity, setFilterOpportunity] = useState<
    OpportunityType | 'all'
  >('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for most fields
    }
  };

  // Sort, filter, and memoize comparison data
  const filteredAndSortedComparisons = useMemo(() => {
    let result = [...comparisons];

    // Apply opportunity type filter
    if (filterOpportunity !== 'all') {
      result = result.filter((c) => c.opportunity_type === filterOpportunity);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'keyword':
          comparison = a.keyword.localeCompare(b.keyword);
          break;
        case 'user_current_rank':
          const aRank = a.user_current_rank ?? 999;
          const bRank = b.user_current_rank ?? 999;
          comparison = aRank - bRank;
          break;
        case 'gap_to_first_page':
          const aGap = a.gap_to_first_page ?? 999;
          const bGap = b.gap_to_first_page ?? 999;
          comparison = aGap - bGap;
          break;
        case 'opportunity_score':
          const aScore = a.opportunity_score ?? 0;
          const bScore = b.opportunity_score ?? 0;
          comparison = aScore - bScore;
          break;
        case 'opportunity_type':
          const order = { 'quick-win': 0, 'medium-effort': 1, 'long-term': 2 };
          comparison = order[a.opportunity_type] - order[b.opportunity_type];
          break;
        case 'rank_trend':
          const trendOrder = { up: 0, stable: 1, down: 2 };
          const aTrend = a.rank_trend ? trendOrder[a.rank_trend] : 3;
          const bTrend = b.rank_trend ? trendOrder[b.rank_trend] : 3;
          comparison = aTrend - bTrend;
          break;
        case 'last_analyzed_at':
          comparison =
            new Date(a.last_analyzed_at).getTime() -
            new Date(b.last_analyzed_at).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [comparisons, sortField, sortDirection, filterOpportunity]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Rank trend indicator component
  const RankTrendIndicator = ({
    trend,
    previousRank,
    currentRank,
  }: {
    trend: RankTrend | null;
    previousRank: number | null;
    currentRank: number | null;
  }) => {
    if (!trend || !currentRank) {
      return <span className="text-gray-400 text-xs">-</span>;
    }

    const change = previousRank ? previousRank - currentRank : 0;

    if (trend === 'stable' || change === 0) {
      return (
        <span className="flex items-center gap-1 text-gray-500">
          <Minus className="h-3 w-3" />
          <span className="text-xs">Stable</span>
        </span>
      );
    }

    const colorClass = getTrendColor(trend);

    return (
      <span
        className={cn(
          'flex items-center gap-1 text-xs font-medium',
          colorClass
        )}
      >
        {trend === 'up' ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {change > 0 ? `+${change}` : change}
      </span>
    );
  };

  // Opportunity badge component
  const OpportunityBadge = ({ type }: { type: OpportunityType }) => {
    const config = OPPORTUNITY_CONFIG[type];
    const Icon = config.icon;

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          config.bgColor,
          config.color
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  // Stats calculation
  const stats = useMemo(() => {
    const quickWins = comparisons.filter(
      (c) => c.opportunity_type === 'quick-win'
    ).length;
    const mediumEffort = comparisons.filter(
      (c) => c.opportunity_type === 'medium-effort'
    ).length;
    const longTerm = comparisons.filter(
      (c) => c.opportunity_type === 'long-term'
    ).length;
    const avgGap =
      comparisons.length > 0
        ? comparisons.reduce((sum, c) => sum + (c.gap_to_first_page || 0), 0) /
          comparisons.length
        : 0;

    return {
      total: comparisons.length,
      quickWins,
      mediumEffort,
      longTerm,
      avgGap: Math.round(avgGap * 10) / 10,
    };
  }, [comparisons]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Keywords
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Quick Wins
            </div>
            <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {stats.quickWins}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Medium Effort
            </div>
            <div className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
              {stats.mediumEffort}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Long Term
            </div>
            <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {stats.longTerm}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Avg Gap to Page 1
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.avgGap}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Competitor Comparisons</CardTitle>
          <div className="flex items-center gap-2">
            {/* Opportunity Type Filter */}
            <div className="flex items-center gap-1.5 text-sm">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterOpportunity}
                onChange={(e) => setFilterOpportunity(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800"
              >
                <option value="all">All Opportunities</option>
                <option value="quick-win">Quick Wins Only</option>
                <option value="medium-effort">Medium Effort</option>
                <option value="long-term">Long Term</option>
              </select>
            </div>

            {onAnalyze && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onAnalyze(comparisons.slice(0, 10).map((c) => c.keyword_id))
                }
              >
                Analyze Top 10
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">
                Loading competitor comparisons...
              </div>
            </div>
          ) : filteredAndSortedComparisons.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No competitor comparisons found. Try adjusting your filters or
              analyze some keywords.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort('keyword')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Keyword
                        <SortIndicator field="keyword" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort('user_current_rank')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Your Rank
                        <SortIndicator field="user_current_rank" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Competitors
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort('gap_to_first_page')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Gap to Page 1
                        <SortIndicator field="gap_to_first_page" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort('opportunity_type')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Opportunity
                        <SortIndicator field="opportunity_type" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort('opportunity_score')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Score
                        <SortIndicator field="opportunity_score" />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => handleSort('rank_trend')}
                        className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Trend
                        <SortIndicator field="rank_trend" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedComparisons.map((comparison) => (
                    <>
                      <tr
                        key={comparison.id}
                        className={cn(
                          'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                          onRowClick && 'cursor-pointer'
                        )}
                        onClick={() => onRowClick?.(comparison)}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {comparison.keyword}
                          </div>
                          {comparison.search_volume && (
                            <div className="text-xs text-gray-500">
                              {comparison.search_volume.toLocaleString()}{' '}
                              searches/mo
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div
                            className={cn(
                              'text-lg',
                              getRankColor(comparison.user_current_rank)
                            )}
                          >
                            {formatRank(comparison.user_current_rank)}
                          </div>
                          {comparison.previous_rank && (
                            <RankTrendIndicator
                              trend={comparison.rank_trend}
                              previousRank={comparison.previous_rank}
                              currentRank={comparison.user_current_rank}
                            />
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {comparison.competitor_domains
                              .slice(0, 2)
                              .map((domain) => (
                                <span
                                  key={domain}
                                  className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
                                >
                                  {domain}
                                </span>
                              ))}
                            {comparison.competitor_domains.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{comparison.competitor_domains.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {comparison.gap_to_first_page !== null ? (
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  comparison.gap_to_first_page <= 5
                                    ? 'text-green-600 dark:text-green-400'
                                    : comparison.gap_to_first_page <= 10
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-gray-600 dark:text-gray-400'
                                )}
                              >
                                {comparison.gap_to_first_page} positions
                              </span>
                              {comparison.gap_to_top_3 !== null && (
                                <span className="text-xs text-gray-500">
                                  Top 3: {comparison.gap_to_top_3} positions
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <OpportunityBadge
                            type={comparison.opportunity_type}
                          />
                        </td>

                        <td className="py-3 px-4">
                          {comparison.opportunity_score !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-16">
                                <div
                                  className={cn(
                                    'h-2 rounded-full',
                                    comparison.opportunity_score >= 70
                                      ? 'bg-green-500'
                                      : comparison.opportunity_score >= 40
                                        ? 'bg-yellow-500'
                                        : 'bg-gray-500'
                                  )}
                                  style={{
                                    width: `${comparison.opportunity_score}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {comparison.opportunity_score}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <RankTrendIndicator
                            trend={comparison.rank_trend}
                            previousRank={comparison.previous_rank}
                            currentRank={comparison.user_current_rank}
                          />
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRow(
                                expandedRow === comparison.id
                                  ? null
                                  : comparison.id
                              );
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          >
                            {expandedRow === comparison.id ? (
                              <ChevronUp className="h-4 w-4 text-gray-500" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded row details */}
                      {expandedRow === comparison.id && (
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={8} className="py-4 px-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Ranking Gaps */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Ranking Gaps to Competitors
                                </h4>
                                {comparison.ranking_gaps &&
                                comparison.ranking_gaps.length > 0 ? (
                                  <div className="space-y-2">
                                    {comparison.ranking_gaps
                                      .slice(0, 5)
                                      .map((gap) => (
                                        <div
                                          key={gap.domain}
                                          className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700"
                                        >
                                          <span className="text-gray-600 dark:text-gray-400">
                                            #{gap.rank} {gap.domain}
                                          </span>
                                          <span
                                            className={cn(
                                              'font-medium',
                                              gap.gap_size <= 3
                                                ? 'text-green-600 dark:text-green-400'
                                                : gap.gap_size <= 10
                                                  ? 'text-yellow-600 dark:text-yellow-400'
                                                  : 'text-gray-600 dark:text-gray-400'
                                            )}
                                          >
                                            {gap.gap_size} positions behind
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">
                                    No ranking gap data available
                                  </div>
                                )}
                              </div>

                              {/* Additional Details */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Analysis Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Device
                                    </span>
                                    <span className="text-gray-900 dark:text-white capitalize">
                                      {comparison.device}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Location
                                    </span>
                                    <span className="text-gray-900 dark:text-white uppercase">
                                      {comparison.location}
                                    </span>
                                  </div>
                                  {comparison.strongest_competitor_domain && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Strongest Competitor
                                      </span>
                                      <span className="text-gray-900 dark:text-white">
                                        #{comparison.strongest_competitor_rank}{' '}
                                        {comparison.strongest_competitor_domain}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Last Analyzed
                                    </span>
                                    <span className="text-gray-900 dark:text-white">
                                      {new Date(
                                        comparison.last_analyzed_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

/**
 * Competitor Gap Chart Component
 * Visual representation of ranking gaps between user and competitors
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface CompetitorGapData {
  domain: string;
  rank: number;
  user_rank?: number | null;
  gap?: number;
  url?: string;
}

interface CompetitorGapChartProps {
  keyword: string;
  userRank: number | null;
  competitors: CompetitorGapData[];
  className?: string;
}

export function CompetitorGapChart({
  keyword,
  userRank,
  competitors,
  className,
}: CompetitorGapChartProps) {
  // Prepare chart data - merge user and competitors
  const chartData = useMemo(() => {
    const allEntries = [...competitors];

    // Add user entry if they have a rank
    if (userRank) {
      allEntries.push({
        domain: 'You',
        rank: userRank,
        user_rank: userRank,
        gap: 0,
      });
    }

    // Sort by rank (ascending - lower is better)
    return allEntries.sort((a, b) => a.rank - b.rank);
  }, [userRank, competitors]);

  // Calculate max rank for chart scaling
  const maxRank = useMemo(() => {
    const maxComp = Math.max(...chartData.map((d) => d.rank));
    return Math.max(20, maxComp + 2); // At least 20, with some padding
  }, [chartData]);

  // Get bar color based on entry type
  const getBarColor = (domain: string, isUser: boolean): string => {
    if (isUser) {
      return 'bg-blue-500 dark:bg-blue-400';
    }
    if (domain.includes('wikipedia.org')) {
      return 'bg-gray-400 dark:bg-gray-500';
    }
    return 'bg-orange-400 dark:bg-orange-500';
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Ranking Position Comparison</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Visual comparison of your ranking position vs competitors for "
          {keyword}"
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {chartData.map((entry, index) => {
            const isUser = entry.domain === 'You';
            const barWidth = ((maxRank - entry.rank + 1) / maxRank) * 100;
            const gap = userRank && !isUser ? userRank - entry.rank : null;

            return (
              <div
                key={`${entry.domain}-${index}`}
                className="flex items-center gap-3"
              >
                {/* Domain Label */}
                <div
                  className={cn(
                    'w-28 text-sm truncate',
                    isUser
                      ? 'font-medium text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                  title={entry.domain}
                >
                  {entry.domain}
                </div>

                {/* Rank Badge */}
                <div
                  className={cn(
                    'w-12 h-8 flex items-center justify-center rounded text-sm font-medium',
                    isUser
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : entry.rank <= 3
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : entry.rank <= 10
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  #{entry.rank}
                </div>

                {/* Bar Chart */}
                <div className="flex-1">
                  <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                    <div
                      className={cn(
                        'absolute right-0 top-0 h-full transition-all duration-500',
                        getBarColor(entry.domain, isUser)
                      )}
                      style={{ width: `${barWidth}%` }}
                    />

                    {/* Gap indicator for competitors */}
                    {gap !== null && gap > 0 && (
                      <div className="absolute top-1 left-2 text-xs font-medium text-white">
                        {gap} ahead
                      </div>
                    )}
                  </div>
                </div>

                {/* External Link Icon */}
                {entry.url && !isUser && (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded" />
            <span>Your Ranking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded" />
            <span>Top 3</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded" />
            <span>Page 1 (4-10)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded" />
            <span>Beyond Page 1</span>
          </div>
        </div>

        {/* Key Insight */}
        {userRank && userRank > 10 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">Key insight:</span> You're{' '}
              <span className="font-semibold">{userRank - 10} positions</span>{' '}
              away from the first page. Focus on the competitors within 5
              positions above you for the quickest gains.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

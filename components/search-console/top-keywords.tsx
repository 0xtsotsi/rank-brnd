'use client';

/**
 * Top Keywords Component
 * Displays top performing keywords by various metrics
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SearchConsoleData } from '@/types/google-search-console';

interface TopKeywordsProps {
  data: SearchConsoleData[];
  metric: 'impressions' | 'clicks' | 'ctr';
  limit?: number;
  isLoading?: boolean;
}

export function TopKeywords({
  data,
  metric = 'impressions',
  limit = 5,
  isLoading,
}: TopKeywordsProps) {
  const topKeywords = useMemo(() => {
    // Group by keyword and aggregate metrics
    const keywordMap = new Map<
      string,
      {
        keyword: string;
        impressions: number;
        clicks: number;
        ctr: number;
        avg_position: number;
      }
    >();

    for (const row of data) {
      const existing = keywordMap.get(row.keyword);
      if (existing) {
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.ctr =
          existing.impressions > 0
            ? ((existing.clicks + row.clicks) /
                (existing.impressions + row.impressions)) *
              100
            : 0;
        const totalImpressions = existing.impressions + row.impressions;
        existing.avg_position =
          (existing.avg_position * existing.impressions +
            row.avg_position * row.impressions) /
          totalImpressions;
      } else {
        keywordMap.set(row.keyword, {
          keyword: row.keyword,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          avg_position: row.avg_position,
        });
      }
    }

    let sorted = Array.from(keywordMap.values());

    // Sort by selected metric
    sorted.sort((a, b) => b[metric] - a[metric]);

    return sorted.slice(0, limit);
  }, [data, metric, limit]);

  const metricLabel = {
    impressions: 'Impressions',
    clicks: 'Clicks',
    ctr: 'CTR',
  }[metric];

  const formatValue = (value: number, metric: string) => {
    if (metric === 'ctr') return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  const getPositionColor = (position: number) => {
    if (position <= 3) return 'text-green-600 dark:text-green-400';
    if (position <= 10) return 'text-blue-600 dark:text-blue-400';
    if (position <= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        Top Keywords by {metricLabel}
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
            </div>
          ))}
        </div>
      ) : topKeywords.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No keywords found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topKeywords.map((kw, index) => (
            <div
              key={kw.keyword}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    index === 0
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : index === 1
                        ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        : index === 2
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {kw.keyword}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span
                  className={cn(
                    'text-sm font-medium',
                    getPositionColor(kw.avg_position)
                  )}
                  title="Average position"
                >
                  #{kw.avg_position.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatValue(kw[metric], metric)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Opportunity Gaps Component
 * Shows keywords with high impressions but low CTR
 */
export function OpportunityGaps({
  data,
  limit = 5,
  isLoading,
}: {
  data: SearchConsoleData[];
  limit?: number;
  isLoading?: boolean;
}) {
  const opportunities = useMemo(() => {
    // Group by keyword and aggregate metrics
    const keywordMap = new Map<
      string,
      {
        keyword: string;
        impressions: number;
        clicks: number;
        ctr: number;
        avg_position: number;
      }
    >();

    for (const row of data) {
      const existing = keywordMap.get(row.keyword);
      if (existing) {
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        const totalImpressions = existing.impressions + row.impressions;
        existing.ctr =
          totalImpressions > 0
            ? ((existing.clicks + row.clicks) / totalImpressions) * 100
            : 0;
        existing.avg_position =
          (existing.avg_position * existing.impressions +
            row.avg_position * row.impressions) /
          totalImpressions;
      } else {
        keywordMap.set(row.keyword, {
          keyword: row.keyword,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          avg_position: row.avg_position,
        });
      }
    }

    // Filter for opportunities: high impressions but low CTR (under 3%)
    let filtered = Array.from(keywordMap.values()).filter(
      (kw) => kw.impressions >= 50 && kw.ctr < 3
    );

    // Sort by potential (impressions * (10% - ctr))
    filtered.sort((a, b) => {
      const potentialA = a.impressions * (10 - a.ctr);
      const potentialB = b.impressions * (10 - b.ctr);
      return potentialB - potentialA;
    });

    return filtered.slice(0, limit);
  }, [data, limit]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>Opportunity Gaps</span>
        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
          High impressions, low CTR
        </span>
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No opportunity gaps found</p>
          <p className="text-xs mt-1">
            Keywords with high impressions but low CTR will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((kw, index) => {
            const potentialClicks = Math.round(
              kw.impressions * 0.1 - kw.clicks
            );
            return (
              <div
                key={kw.keyword}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {kw.keyword}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{kw.impressions.toLocaleString()} impressions</span>
                    <span>•</span>
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {kw.ctr.toFixed(1)}% CTR
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Potential gain
                  </p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    +{potentialClicks} clicks
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

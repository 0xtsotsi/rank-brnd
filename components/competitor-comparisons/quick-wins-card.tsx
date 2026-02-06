'use client';

/**
 * Quick Wins Card Component
 * Displays quick-win opportunities - keywords that are close to ranking on the first page
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Zap,
  TrendingUp,
  ExternalLink,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import type { OpportunityType } from './competitor-comparison-table';

export interface QuickWinOpportunity {
  id: string;
  keyword_id: string;
  keyword: string;
  user_current_rank: number | null;
  gap_to_first_page: number | null;
  gap_to_top_3: number | null;
  opportunity_score: number | null;
  competitor_domains: string[];
  strongest_competitor_rank: number | null;
  search_volume?: number;
  estimated_traffic?: number;
}

interface QuickWinsCardProps {
  quickWins: QuickWinOpportunity[];
  onKeywordClick?: (keywordId: string) => void;
  onAnalyzeAll?: () => void;
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

export function QuickWinsCard({
  quickWins,
  onKeywordClick,
  onAnalyzeAll,
  isLoading = false,
  maxItems = 10,
  className,
}: QuickWinsCardProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const displayWins = quickWins.slice(0, maxItems);

  // Calculate aggregate stats
  const avgGap =
    displayWins.length > 0
      ? displayWins.reduce((sum, w) => sum + (w.gap_to_first_page || 0), 0) /
        displayWins.length
      : 0;

  const totalPotentialTraffic = displayWins.reduce(
    (sum, w) => sum + (w.estimated_traffic || 0),
    0
  );

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          Quick Wins
        </CardTitle>
        {onAnalyzeAll && displayWins.length > 0 && (
          <Button size="sm" variant="outline" onClick={onAnalyzeAll}>
            Analyze All
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 text-sm">Loading quick wins...</div>
          </div>
        ) : displayWins.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No quick wins identified yet. Analyze your keywords to find
              opportunities.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {displayWins.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Opportunities
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {avgGap.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Avg Gap to Page 1
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                  {totalPotentialTraffic > 0
                    ? `${(totalPotentialTraffic / 1000).toFixed(0)}K`
                    : '-'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Est. Traffic Gain
                </div>
              </div>
            </div>

            {/* Quick Wins List */}
            <div className="space-y-2">
              {displayWins.map((win) => (
                <div
                  key={win.id}
                  className={cn(
                    'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all',
                    onKeywordClick &&
                      'cursor-pointer hover:border-green-300 dark:hover:border-green-700',
                    expandedItems.has(win.id) &&
                      'bg-gray-50 dark:bg-gray-800/50'
                  )}
                >
                  <div
                    className="flex items-center justify-between p-3"
                    onClick={() => onKeywordClick?.(win.keyword_id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {win.keyword}
                        </span>
                        {win.search_volume && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {win.search_volume.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Current:{' '}
                          <span className="font-medium">
                            #{win.user_current_rank || '-'}
                          </span>
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          Page 1 in {win.gap_to_first_page} positions
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Opportunity Score */}
                      {win.opportunity_score !== null && (
                        <div className="hidden sm:flex items-center gap-1.5">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={cn(
                                'h-1.5 rounded-full',
                                win.opportunity_score >= 80
                                  ? 'bg-green-500'
                                  : win.opportunity_score >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-orange-500'
                              )}
                              style={{ width: `${win.opportunity_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-6">
                            {win.opportunity_score}
                          </span>
                        </div>
                      )}

                      {/* Expand Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(win.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 text-gray-500 transition-transform',
                            expandedItems.has(win.id) && 'rotate-90'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedItems.has(win.id) && (
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Competitors beating you:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {win.competitor_domains
                              .slice(0, 3)
                              .map((domain) => (
                                <span
                                  key={domain}
                                  className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                                >
                                  {domain}
                                </span>
                              ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">
                            Position targets:
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {win.gap_to_top_3 !== null && (
                              <div className="text-xs">
                                Top 3:{' '}
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                  {win.gap_to_top_3} positions
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" variant="outline">
                          <TrendingUp className="h-3 w-3 mr-1.5" />
                          Optimize for This Keyword
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Show More Link */}
            {quickWins.length > maxItems && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => onKeywordClick?.('show-all')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
                >
                  View all {quickWins.length} quick wins
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

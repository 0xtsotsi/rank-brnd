'use client';

/**
 * Marketplace Sites Table Component
 * Displays available sites for backlink exchange
 */

import { useState, useMemo } from 'react';
import type {
  MarketplaceSite,
  MarketplaceSort,
  SortDirection,
} from '@/types/backlink-marketplace';
import {
  getDAScoreColor,
  getSpamScoreColor,
  getQualityScoreColor,
  formatTraffic,
} from '@/types/backlink-marketplace';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Clock,
  TrendingUp,
  Award,
  AlertCircle,
  Zap,
  Check,
  Globe,
  X,
} from 'lucide-react';

interface SitesTableProps {
  sites: MarketplaceSite[];
  onSiteSelect?: (site: MarketplaceSite) => void;
  onRequestExchange?: (site: MarketplaceSite) => void;
  userCredits?: number;
  isLoading?: boolean;
  className?: string;
}

export function SitesTable({
  sites,
  onSiteSelect,
  onRequestExchange,
  userCredits = 0,
  isLoading = false,
  className,
}: SitesTableProps) {
  const [sortField, setSortField] = useState<MarketplaceSort>('quality_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  // Handle sort toggle
  const handleSort = (field: MarketplaceSort) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort and memoize sites
  const sortedSites = useMemo(() => {
    const result = [...sites];

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'domain_authority':
          comparison = a.domain_authority - b.domain_authority;
          break;
        case 'page_authority':
          comparison = a.page_authority - b.page_authority;
          break;
        case 'quality_score':
          comparison = a.quality_score - b.quality_score;
          break;
        case 'credits_required':
          comparison = a.credits_required - b.credits_required;
          break;
        case 'traffic':
          comparison = (a.traffic || 0) - (b.traffic || 0);
          break;
        case 'success_rate':
          comparison = a.success_rate - b.success_rate;
          break;
        case 'response_time':
          comparison = (a.response_time || 999) - (b.response_time || 999);
          break;
        case 'created_at':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [sites, sortField, sortDirection]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: MarketplaceSort }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedSite(expandedSite === id ? null : id);
  };

  // Handle request exchange
  const handleRequestExchange = (
    site: MarketplaceSite,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    onRequestExchange?.(site);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div
      className={cn('sites-table w-full', className)}
      data-testid="marketplace-sites-table"
    >
      {/* Table Container */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleSort('domain_authority')}
            className="col-span-3 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Site <SortIndicator field="domain_authority" />
          </button>
          <button
            onClick={() => handleSort('quality_score')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Quality <SortIndicator field="quality_score" />
          </button>
          <button
            onClick={() => handleSort('credits_required')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Credits <SortIndicator field="credits_required" />
          </button>
          <button
            onClick={() => handleSort('success_rate')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Success Rate <SortIndicator field="success_rate" />
          </button>
          <button
            onClick={() => handleSort('response_time')}
            className="col-span-2 flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-left"
          >
            Response <SortIndicator field="response_time" />
          </button>
          <div className="col-span-1" />
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedSites.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              <Globe className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">No sites found</p>
              <p className="text-sm">
                Try adjusting your filters to see more results
              </p>
            </div>
          ) : (
            sortedSites.map((site) => {
              const daColors = getDAScoreColor(site.domain_authority);
              const spamColors = getSpamScoreColor(site.spam_score);
              const qualityColors = getQualityScoreColor(site.quality_score);
              const isExpanded = expandedSite === site.id;
              const canAfford = userCredits >= site.credits_required;
              const isAvailable = site.available;

              return (
                <div key={site.id} className="group">
                  {/* Main Row */}
                  <div
                    className={cn(
                      'grid grid-cols-12 gap-4 px-4 py-3 items-center cursor-pointer',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                      !isAvailable && 'opacity-60'
                    )}
                    onClick={() => toggleRow(site.id)}
                    data-site-id={site.id}
                    data-testid="marketplace-site-row"
                  >
                    {/* Site Info */}
                    <div className="col-span-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {site.title}
                        </p>
                        {!isAvailable && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {site.domain}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        {/* DA Badge */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
                            daColors.bg,
                            daColors.text,
                            daColors.border,
                            'border'
                          )}
                        >
                          DA: {site.domain_authority}
                        </span>
                        {/* PA Badge */}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          PA: {site.page_authority}
                        </span>
                        {/* Spam Badge */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
                            spamColors.bg,
                            spamColors.text,
                            spamColors.border,
                            'border'
                          )}
                        >
                          Spam: {site.spam_score}
                        </span>
                      </div>
                    </div>

                    {/* Quality Score */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          qualityColors.bg,
                          qualityColors.text,
                          qualityColors.border,
                          'border'
                        )}
                      >
                        <Award className="h-3 w-3" />
                        {site.quality_score}/100
                      </span>
                      {site.traffic && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatTraffic(site.traffic)}/mo
                        </p>
                      )}
                    </div>

                    {/* Credits */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <Zap
                          className={cn(
                            'h-4 w-4',
                            canAfford ? 'text-amber-500' : 'text-gray-400'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            canAfford
                              ? 'text-gray-900 dark:text-white'
                              : 'text-red-500 dark:text-red-400'
                          )}
                        >
                          {site.credits_required}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          credits
                        </span>
                      </div>
                      {!canAfford && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          Not enough credits
                        </p>
                      )}
                    </div>

                    {/* Success Rate */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {site.success_rate}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        approval rate
                      </p>
                    </div>

                    {/* Response Time */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-blue-500" />
                        {site.response_time ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            ~{site.response_time}h
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Varies</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        avg. response
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={(e) => handleRequestExchange(site, e)}
                        disabled={!isAvailable || !canAfford}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          isAvailable && canAfford
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        )}
                        data-testid="request-exchange-button"
                      >
                        Request
                      </button>
                    </div>
                  </div>

                  {/* Expanded Row Details */}
                  {isExpanded && (
                    <div
                      className={cn(
                        'px-4 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700',
                        'animate-fade-in'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Description */}
                        <div className="md:col-span-2 lg:col-span-2">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            About this site
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {site.description || 'No description available.'}
                          </p>
                        </div>

                        {/* Categories */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Categories
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {site.categories.map((category) => (
                              <span
                                key={category}
                                className="inline-flex items-center rounded bg-gray-200 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Niche Tags */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Niches
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {site.niche.map((n) => (
                              <span
                                key={n}
                                className="inline-flex items-center rounded bg-indigo-100 dark:bg-indigo-900 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Guidelines */}
                        <div className="md:col-span-2">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            Submission Guidelines
                          </h4>
                          {site.guidelines ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                              {site.guidelines}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              No specific guidelines provided.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <p>
          Showing <span className="font-medium">{sortedSites.length}</span>{' '}
          available sites
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>High Quality (80+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Good Quality (60+)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

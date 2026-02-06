'use client';

/**
 * SEO Sidebar Component
 *
 * Real-time SEO scoring sidebar for the article editor featuring:
 * - Overall SEO score with visual indicator
 * - Checklist of SEO items with pass/fail status
 * - Keyword density analysis
 * - Readability score
 * - Actionable suggestions
 */

import { useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  BookOpen,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SEOScoreResult, SEOCheckItem } from '@/lib/seo-scoring';
import { calculateSEOScore } from '@/lib/seo-scoring';

export interface SEOSidebarProps {
  /** Title of the article */
  title: string;
  /** Content (HTML) */
  content: string;
  /** Excerpt */
  excerpt: string | null;
  /** Meta title */
  metaTitle: string;
  /** Meta description */
  metaDescription: string;
  /** Meta keywords (comma-separated) */
  metaKeywords: string;
  /** URL slug */
  slug: string;
  /** Featured image URL */
  featuredImageUrl: string;
  /** Word count */
  wordCount: number;
  /** Whether to show expanded sections */
  expanded?: boolean;
}

interface CategoryGroup {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SEOCheckItem[];
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  content: { label: 'Content', icon: FileText },
  metadata: { label: 'Metadata', icon: Settings },
  structure: { label: 'Structure', icon: TrendingUp },
  readability: { label: 'Readability', icon: BookOpen },
};

export function SEOSidebar({
  title,
  content,
  excerpt,
  metaTitle,
  metaDescription,
  metaKeywords,
  slug,
  featuredImageUrl,
  wordCount,
}: SEOSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    score: true,
    checklist: true,
    keywords: true,
  });

  // Calculate SEO score
  const seoResult: SEOScoreResult = useMemo(() => {
    return calculateSEOScore({
      title,
      content,
      excerpt,
      metaTitle,
      metaDescription,
      metaKeywords,
      slug,
      featuredImageUrl,
      wordCount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    content,
    excerpt,
    metaTitle,
    metaDescription,
    metaKeywords,
    slug,
    featuredImageUrl,
    wordCount,
  ]);

  // Group checklist items by category
  const groupedChecklist = useMemo(() => {
    const groups: Record<string, SEOCheckItem[]> = {};
    seoResult.checklist.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [seoResult.checklist]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get score background
  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  // Get score ring color
  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'stroke-green-500';
    if (score >= 60) return 'stroke-yellow-500';
    if (score >= 40) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <div
        className={cn(
          'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4',
          getScoreBg(seoResult.score)
        )}
      >
        <button
          onClick={() => toggleSection('score')}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Search className="w-4 h-4" />
            SEO Score
          </h3>
          {expandedSections.score ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {expandedSections.score && (
          <div className="mt-4">
            <div className="flex items-center gap-4">
              {/* Circular Score Indicator */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    className={cn(
                      'transition-all duration-500',
                      getScoreRingColor(seoResult.score)
                    )}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - seoResult.score / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      getScoreColor(seoResult.score)
                    )}
                  >
                    {seoResult.score}
                  </span>
                </div>
              </div>

              {/* Score Details */}
              <div className="flex-1">
                <p
                  className={cn(
                    'text-lg font-semibold',
                    getScoreColor(seoResult.score)
                  )}
                >
                  {seoResult.level}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {seoResult.checklist.filter((i) => i.passed).length} of{' '}
                  {seoResult.checklist.length} checks passed
                </p>
              </div>
            </div>

            {/* Quick Suggestions */}
            {seoResult.suggestions.length > 0 && (
              <div className="mt-4 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top improvements:
                </p>
                <ul className="space-y-1">
                  {seoResult.suggestions.slice(0, 3).map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2"
                    >
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-yellow-500" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checklist Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => toggleSection('checklist')}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            SEO Checklist
          </h3>
          {expandedSections.checklist ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {expandedSections.checklist && (
          <div className="mt-4 space-y-4">
            {Object.entries(groupedChecklist).map(([category, items]) => {
              const config = CATEGORY_CONFIG[category];
              if (!config) return null;

              const Icon = config.icon;
              const passedCount = items.filter((i) => i.passed).length;

              return (
                <div
                  key={category}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(category)}
                    className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Icon className="w-4 h-4" />
                      {config.label}
                      <span className="text-gray-500">
                        ({passedCount}/{items.length})
                      </span>
                    </span>
                    {expandedSections[category] ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {expandedSections[category] && (
                    <div className="p-3 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-start gap-2 p-2 rounded-lg transition-colors',
                            item.passed
                              ? 'bg-green-50 dark:bg-green-900/20'
                              : 'bg-red-50 dark:bg-red-900/20'
                          )}
                        >
                          {item.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-sm font-medium',
                                item.passed
                                  ? 'text-green-800 dark:text-green-300'
                                  : 'text-red-800 dark:text-red-300'
                              )}
                            >
                              {item.label}
                            </p>
                            {!item.passed && item.suggestion && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {item.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyword Density Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => toggleSection('keywords')}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Keyword Density
          </h3>
          {expandedSections.keywords ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {expandedSections.keywords && (
          <div className="mt-4">
            {seoResult.keywordDensity.topKeywords.length > 0 ? (
              <div className="space-y-2">
                {seoResult.keywordDensity.topKeywords
                  .slice(0, 8)
                  .map((keyword, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-6">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {keyword.word}
                          </span>
                          <span className="text-xs text-gray-500">
                            {keyword.count}x ({keyword.density.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              keyword.density > 3
                                ? 'bg-red-500'
                                : keyword.density > 1.5
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            )}
                            style={{
                              width: `${Math.min(keyword.density * 20, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add content to see keyword analysis
              </p>
            )}

            {/* Density Guide */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keyword Density Guide:
              </p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>1-1.5%: Optimal density</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>1.5-3%: Acceptable range</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>&gt;3%: Possible keyword stuffing</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

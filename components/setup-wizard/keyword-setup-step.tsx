'use client';

/**
 * Keyword Setup Step Component
 *
 * Guides users through creating their first SEO keyword to track,
 * including search volume estimates and keyword difficulty.
 */

import { useState } from 'react';
import {
  Search,
  TrendingUp,
  CheckCircle,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeywordConfig } from '@/types/setup-wizard';

interface KeywordSetupStepProps {
  onNext: () => void;
  onSkip?: () => void;
  initialData?: KeywordConfig;
}

const SEARCH_INTENTS = [
  {
    value: 'informational',
    label: 'Informational',
    description: 'Looking for information',
    icon: '📚',
  },
  {
    value: 'commercial',
    label: 'Commercial',
    description: 'Researching purchases',
    icon: '🛍️',
  },
  {
    value: 'transactional',
    label: 'Transactional',
    description: 'Ready to buy',
    icon: '💳',
  },
  {
    value: 'navigational',
    label: 'Navigational',
    description: 'Finding a specific site',
    icon: '🧭',
  },
] as const;

const DIFFICULTY_LEVELS = [
  {
    value: 'low',
    label: 'Low',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  {
    value: 'high',
    label: 'High',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
] as const;

// Mock keyword suggestions based on input
const KEYWORD_SUGGESTIONS = [
  {
    keyword: 'best seo tools 2025',
    volume: 1200,
    difficulty: 'medium' as const,
  },
  {
    keyword: 'how to improve seo ranking',
    volume: 3400,
    difficulty: 'high' as const,
  },
  { keyword: 'seo checker free', volume: 8900, difficulty: 'low' as const },
  {
    keyword: 'content marketing strategy',
    volume: 2200,
    difficulty: 'medium' as const,
  },
];

export function KeywordSetupStep({
  onNext,
  onSkip,
  initialData,
}: KeywordSetupStepProps) {
  const [keyword, setKeyword] = useState(initialData?.keyword || '');
  const [searchVolume, setSearchVolume] = useState<number | undefined>(
    initialData?.searchVolume
  );
  const [difficulty, setDifficulty] = useState<'low' | 'medium' | 'high'>(
    initialData?.difficulty || 'medium'
  );
  const [intent, setIntent] = useState<
    'informational' | 'commercial' | 'transactional' | 'navigational'
  >(initialData?.intent || 'informational');
  const [targetUrl, setTargetUrl] = useState(initialData?.targetUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<typeof KEYWORD_SUGGESTIONS>(
    []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    volume: number;
    difficulty: 'low' | 'medium' | 'high';
    trend: 'up' | 'down' | 'stable';
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAnalyzeKeyword = async () => {
    if (!keyword.trim()) {
      setError('Please enter a keyword to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysisResult(null);

    try {
      // Simulate API analysis
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock analysis result
      const mockVolume = Math.floor(Math.random() * 10000) + 100;
      const mockDifficulties: Array<'low' | 'medium' | 'high'> = [
        'low',
        'medium',
        'high',
      ];
      const mockDifficulty = mockDifficulties[Math.floor(Math.random() * 3)];
      const mockTrends: Array<'up' | 'down' | 'stable'> = [
        'up',
        'down',
        'stable',
      ];
      const mockTrend = mockTrends[Math.floor(Math.random() * 3)];

      setAnalysisResult({
        volume: mockVolume,
        difficulty: mockDifficulty,
        trend: mockTrend,
      });

      setSearchVolume(mockVolume);
      setDifficulty(mockDifficulty);

      // Show suggestions
      setSuggestions(KEYWORD_SUGGESTIONS);
    } catch (err) {
      setError('Failed to analyze keyword. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSuggestionClick = (
    suggestion: (typeof KEYWORD_SUGGESTIONS)[number]
  ) => {
    setKeyword(suggestion.keyword);
    setSearchVolume(suggestion.volume);
    setDifficulty(suggestion.difficulty);
    setShowSuggestions(false);
    setAnalysisResult({
      volume: suggestion.volume,
      difficulty: suggestion.difficulty,
      trend: 'stable',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      setError('Please enter a keyword');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const config: KeywordConfig = {
        keyword: keyword.trim(),
        searchVolume,
        difficulty,
        intent,
        targetUrl: targetUrl.trim() || undefined,
      };

      setIsSuccess(true);
      setTimeout(() => onNext(), 800);
    } catch (err) {
      setError('Failed to save keyword. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Keyword Added!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            &quot;{keyword}&quot; is now being tracked.
          </p>
        </div>
      </div>
    );
  }

  const selectedDifficulty = DIFFICULTY_LEVELS.find(
    (d) => d.value === difficulty
  );
  const selectedIntent = SEARCH_INTENTS.find((i) => i.value === intent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
          <Search className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Add Your First Keyword
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Track your SEO performance and generate content based on target
          keywords.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Keyword Input */}
        <div>
          <label
            htmlFor="keyword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Keyword <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="keyword"
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setError('');
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g., best seo tools"
                disabled={isLoading}
                className={cn(
                  'w-full pl-12 pr-4 py-3 rounded-lg border',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  'bg-white dark:bg-gray-800',
                  'border-gray-300 dark:border-gray-600',
                  'text-gray-900 dark:text-white',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'transition-colors',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Suggestions
                    </span>
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {suggestion.keyword}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {suggestion.volume.toLocaleString()} searches/mo
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            suggestion.difficulty === 'low' &&
                              'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                            suggestion.difficulty === 'medium' &&
                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                            suggestion.difficulty === 'high' &&
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          )}
                        >
                          {suggestion.difficulty} difficulty
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAnalyzeKeyword}
              disabled={isAnalyzing || isLoading || !keyword.trim()}
              className={cn(
                'px-4 py-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
                'hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
                'font-medium rounded-lg transition-colors flex items-center gap-2',
                (isAnalyzing || isLoading || !keyword.trim()) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter a keyword to analyze search volume and difficulty
          </p>
        </div>

        {/* Analysis Result */}
        {analysisResult && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Keyword Analysis
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Monthly Searches
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {analysisResult.volume.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Difficulty
                </div>
                <div
                  className={cn('text-xl font-bold', selectedDifficulty?.color)}
                >
                  {selectedDifficulty?.label}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Trend
                </div>
                <div
                  className={cn(
                    'text-xl font-bold flex items-center gap-1',
                    analysisResult.trend === 'up' && 'text-green-600',
                    analysisResult.trend === 'down' && 'text-red-600',
                    analysisResult.trend === 'stable' && 'text-gray-600'
                  )}
                >
                  {analysisResult.trend === 'up' && '↑'}
                  {analysisResult.trend === 'down' && '↓'}
                  {analysisResult.trend === 'stable' && '→'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Intent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Search Intent
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SEARCH_INTENTS.map((intentOption) => (
              <button
                key={intentOption.value}
                type="button"
                onClick={() => setIntent(intentOption.value)}
                disabled={isLoading}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  'hover:border-gray-300 dark:hover:border-gray-600',
                  intent === intentOption.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{intentOption.icon}</span>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {intentOption.label}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {intentOption.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Target URL */}
        <div>
          <label
            htmlFor="targetUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Target URL (Optional)
          </label>
          <input
            id="targetUrl"
            type="url"
            value={targetUrl}
            onChange={(e) => {
              setTargetUrl(e.target.value);
              setError('');
            }}
            placeholder="https://example.com/page-to-rank"
            disabled={isLoading}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            The page you want to rank for this keyword
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isLoading}
              className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Skip for Now
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

/**
 * Article Generation Step Component
 *
 * Guides users through generating their first AI article,
 * with options for word count, tone, and additional content.
 */

import { useState } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle,
  Loader2,
  AlertCircle,
  Settings,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ArticleGenerationOptions,
  KeywordConfig,
} from '@/types/setup-wizard';

interface ArticleGenerationStepProps {
  onNext: () => void;
  onSkip?: () => void;
  keywordConfig?: KeywordConfig;
  initialOptions?: ArticleGenerationOptions;
}

const WORD_COUNT_OPTIONS = [
  { value: 500, label: 'Short', description: '~500 words' },
  { value: 1000, label: 'Standard', description: '~1,000 words' },
  { value: 1500, label: 'Long', description: '~1,500 words' },
  { value: 2500, label: 'Comprehensive', description: '~2,500 words' },
];

const TONES = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Formal and authoritative',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Relaxed and conversational',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable',
  },
  {
    value: 'authoritative',
    label: 'Authoritative',
    description: 'Expert and confident',
  },
] as const;

// Mock article preview
const generatePreview = (keyword: string, tone: string): string => {
  return `# ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: A Complete Guide

## Introduction
In today's digital landscape, understanding ${keyword} is essential for success. This comprehensive guide will walk you through everything you need to know.

## Key Benefits
- Improved understanding of ${keyword}
- Practical implementation strategies
- Expert insights and recommendations

## Conclusion
Mastering ${keyword} takes time, but with the right approach, you'll see results quickly...`;
};

export function ArticleGenerationStep({
  onNext,
  onSkip,
  keywordConfig,
  initialOptions,
}: ArticleGenerationStepProps) {
  const [keyword, setKeyword] = useState(
    initialOptions?.keyword || keywordConfig?.keyword || ''
  );
  const [title, setTitle] = useState(initialOptions?.title || '');
  const [wordCount, setWordCount] = useState(initialOptions?.wordCount || 1000);
  const [tone, setTone] = useState<
    'professional' | 'casual' | 'friendly' | 'authoritative'
  >(initialOptions?.tone || 'professional');
  const [includeFaq, setIncludeFaq] = useState(
    initialOptions?.includeFaq ?? true
  );
  const [includeMeta, setIncludeMeta] = useState(
    initialOptions?.includeMeta ?? true
  );
  const [targetAudience, setTargetAudience] = useState(
    initialOptions?.targetAudience || ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleGeneratePreview = async () => {
    if (!keyword.trim()) {
      setError('Please enter a keyword first');
      return;
    }

    setPreviewContent(generatePreview(keyword, tone));
    setShowPreview(true);
  };

  const handleGenerateArticle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      setError('Please enter a keyword');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const options: ArticleGenerationOptions = {
        keyword: keyword.trim(),
        title: title.trim() || undefined,
        wordCount,
        tone,
        includeFaq,
        includeMeta,
        targetAudience: targetAudience.trim() || undefined,
      };

      setIsSuccess(true);
      setTimeout(() => onNext(), 1000);
    } catch (err) {
      setError('Failed to generate article. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 animate-bounce-in">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Article Generated!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your first AI article is ready for review.
          </p>
        </div>
      </div>
    );
  }

  const selectedTone = TONES.find((t) => t.value === tone);
  const selectedWordCount = WORD_COUNT_OPTIONS.find(
    (w) => w.value === wordCount
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-4">
          <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Generate Your First Article
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Use AI to create SEO-optimized content based on your target keyword.
        </p>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Article Preview
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Close
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap max-h-48 overflow-auto">
            {previewContent}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleGenerateArticle} className="space-y-5">
        {/* Keyword (Pre-filled from previous step) */}
        <div>
          <label
            htmlFor="keyword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Target Keyword <span className="text-red-500">*</span>
          </label>
          <input
            id="keyword"
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setError('');
            }}
            placeholder="Enter your target keyword"
            disabled={isGenerating}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'transition-colors',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Article Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Article Title (Optional)
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            placeholder="AI will generate if left blank"
            disabled={isGenerating}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'transition-colors',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Word Count & Tone Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Word Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Article Length
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  // Toggle word count dropdown
                }}
                disabled={isGenerating}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border text-left',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  'bg-white dark:bg-gray-800',
                  'border-gray-300 dark:border-gray-600',
                  'text-gray-900 dark:text-white',
                  'transition-colors flex items-center justify-between',
                  isGenerating && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div>
                  <div className="font-medium">{selectedWordCount?.label}</div>
                  <div className="text-xs text-gray-500">
                    {selectedWordCount?.description}
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {/* Word count dropdown options */}
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                {WORD_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWordCount(option.value)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                      wordCount === option.value &&
                        'bg-indigo-50 dark:bg-indigo-900/20'
                    )}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Writing Tone
            </label>
            <div className="relative">
              <button
                type="button"
                disabled={isGenerating}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border text-left',
                  'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                  'bg-white dark:bg-gray-800',
                  'border-gray-300 dark:border-gray-600',
                  'text-gray-900 dark:text-white',
                  'transition-colors flex items-center justify-between',
                  isGenerating && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div>
                  <div className="font-medium">{selectedTone?.label}</div>
                  <div className="text-xs text-gray-500">
                    {selectedTone?.description}
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </button>

              {/* Tone dropdown options */}
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                {TONES.map((toneOption) => (
                  <button
                    key={toneOption.value}
                    type="button"
                    onClick={() => setTone(toneOption.value)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                      tone === toneOption.value &&
                        'bg-indigo-50 dark:bg-indigo-900/20'
                    )}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {toneOption.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {toneOption.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Content Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFaq}
                onChange={(e) => setIncludeFaq(e.target.checked)}
                disabled={isGenerating}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  Include FAQ Section
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Add common questions and answers
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMeta}
                onChange={(e) => setIncludeMeta(e.target.checked)}
                disabled={isGenerating}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  Generate Meta Content
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Include meta title and description
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label
            htmlFor="targetAudience"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Target Audience (Optional)
          </label>
          <textarea
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => {
              setTargetAudience(e.target.value);
              setError('');
            }}
            placeholder="e.g., Marketing professionals looking to improve their SEO"
            rows={2}
            disabled={isGenerating}
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'bg-white dark:bg-gray-800',
              'border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'transition-colors resize-none',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Preview Button */}
        <button
          type="button"
          onClick={handleGeneratePreview}
          disabled={isGenerating || !keyword.trim()}
          className={cn(
            'w-full px-4 py-3 bg-gray-100 dark:bg-gray-800',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
            (isGenerating || !keyword.trim()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Eye className="w-5 h-5" />
          Preview Article Structure
        </button>

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
              disabled={isGenerating}
              className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Skip for Now
            </button>
          )}
          <button
            type="submit"
            disabled={isGenerating}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Article
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

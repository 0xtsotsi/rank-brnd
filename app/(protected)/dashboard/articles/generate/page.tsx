'use client';

/**
 * Article Generation Page
 *
 * Multi-step wizard for article generation:
 * 1. Select keyword
 * 2. Review and customize outline
 * 3. Set brand voice preferences
 * 4. Generate content
 * 5. Edit and publish
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search,
  Settings,
  Wand2,
  BookOpen,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  Lightbulb,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for the wizard state
interface Keyword {
  id: string;
  keyword: string;
  search_volume?: number;
  difficulty: string;
  intent: string;
  opportunity_score?: number;
  current_rank?: number;
  tags: string[];
}

interface OutlineSection {
  id: string;
  title: string;
  points: string[];
  wordCount: number;
}

interface GeneratedArticle {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

interface WizardState {
  step: number;
  selectedKeyword: Keyword | null;
  searchQuery: string;
  outline: OutlineSection[] | null;
  brandTone: string;
  customInstructions: string;
  targetLength: number;
  isGenerating: boolean;
  generatedArticle: GeneratedArticle | null;
  error: string | null;
}

const toneOptions = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Formal and authoritative',
    emoji: '💼',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Relaxed and conversational',
    emoji: '🎯',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and approachable',
    emoji: '👋',
  },
  {
    value: 'authoritative',
    label: 'Authoritative',
    description: 'Expert and confident',
    emoji: '📚',
  },
  {
    value: 'minimalist',
    label: 'Minimalist',
    description: 'Concise and direct',
    emoji: '✨',
  },
  {
    value: 'playful',
    label: 'Playful',
    description: 'Fun and engaging',
    emoji: '🎨',
  },
];

const lengthOptions = [
  { value: 500, label: 'Short', description: '~500 words' },
  { value: 1000, label: 'Medium', description: '~1000 words' },
  { value: 1500, label: 'Long', description: '~1500 words' },
  { value: 2500, label: 'Comprehensive', description: '~2500 words' },
];

const steps = [
  { id: 1, title: 'Select Keyword', icon: Search },
  { id: 2, title: 'Review Outline', icon: BookOpen },
  { id: 3, title: 'Brand Voice', icon: Settings },
  { id: 4, title: 'Generate', icon: Wand2 },
  { id: 5, title: 'Review & Edit', icon: CheckCircle2 },
];

export default function ArticleGenerationPage() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>({
    step: 1,
    selectedKeyword: null,
    searchQuery: '',
    outline: null,
    brandTone: 'professional',
    customInstructions: '',
    targetLength: 1000,
    isGenerating: false,
    generatedArticle: null,
    error: null,
  });

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [organizationId, setOrganizationId] = useState<string>('');

  useEffect(() => {
    // Get organization ID from localStorage or context
    const orgId = localStorage.getItem('organization_id') || 'default-org-id';
    setOrganizationId(orgId);
    fetchKeywords(orgId);
  }, []);

  const fetchKeywords = async (orgId: string) => {
    setIsLoadingKeywords(true);
    try {
      const response = await fetch(
        `/api/keywords?organization_id=${orgId}&status=tracking,opportunity`
      );
      if (response.ok) {
        const data = await response.json();
        setKeywords(data.keywords || []);
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  const filteredKeywords = keywords.filter((kw) =>
    kw.keyword.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  const handleKeywordSelect = (keyword: Keyword) => {
    setState((prev) => ({ ...prev, selectedKeyword: keyword, error: null }));
  };

  const handleNext = async () => {
    setState((prev) => ({ ...prev, error: null }));

    // Generate outline when moving from step 1 to 2
    if (state.step === 1 && state.selectedKeyword) {
      await generateOutline();
    } else if (state.step === 3) {
      // Generate article when moving from step 3 to 4
      await generateArticle();
    } else if (state.step === 4 && state.generatedArticle) {
      // Move to edit page
      router.push(`/dashboard/articles/new?generated=true`);
    } else {
      setState((prev) => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const handlePrevious = () => {
    setState((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1),
      error: null,
    }));
  };

  const generateOutline = async () => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await fetch('/api/articles/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: state.selectedKeyword?.keyword,
          organization_id: organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate outline');
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        outline: data.outline,
        isGenerating: false,
        step: 2,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: 'Failed to generate outline. Please try again.',
      }));
    }
  };

  const generateArticle = async () => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await fetch('/api/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword_id: state.selectedKeyword?.id,
          keyword: state.selectedKeyword?.keyword,
          outline: state.outline,
          tone: state.brandTone,
          customInstructions: state.customInstructions,
          targetLength: state.targetLength,
          organization_id: organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate article');
      }

      const data = await response.json();

      // Store the generated article in sessionStorage for the editor
      sessionStorage.setItem('generatedArticle', JSON.stringify(data.article));

      setState((prev) => ({
        ...prev,
        generatedArticle: data.article,
        isGenerating: false,
        step: 4,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: 'Failed to generate article. Please try again.',
      }));
    }
  };

  const regenerateOutline = async () => {
    await generateOutline();
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const updateOutlinePoint = (
    sectionId: string,
    pointIndex: number,
    newValue: string
  ) => {
    setState((prev) => ({
      ...prev,
      outline:
        prev.outline?.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                points: section.points.map((point, idx) =>
                  idx === pointIndex ? newValue : point
                ),
              }
            : section
        ) ?? null,
    }));
  };

  const addOutlinePoint = (sectionId: string) => {
    setState((prev) => ({
      ...prev,
      outline:
        prev.outline?.map((section) =>
          section.id === sectionId
            ? { ...section, points: [...section.points, ''] }
            : section
        ) ?? null,
    }));
  };

  const removeOutlinePoint = (sectionId: string, pointIndex: number) => {
    setState((prev) => ({
      ...prev,
      outline:
        prev.outline?.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                points: section.points.filter((_, idx) => idx !== pointIndex),
              }
            : section
        ) ?? null,
    }));
  };

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.selectedKeyword !== null;
      case 2:
        return state.outline !== null && state.outline.length > 0;
      case 3:
        return true;
      case 4:
        return state.generatedArticle !== null;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Generate Article with AI
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Follow the steps to create an SEO-optimized article tailored to your
          brand voice
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  state.step === step.id
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : state.step > step.id
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-600'
                )}
              >
                {state.step > step.id ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2',
                    state.step > step.id
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Title */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {steps[state.step - 1].title}
        </h2>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{state.error}</p>
          <button
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            className="ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Step 1: Select Keyword */}
        {state.step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search keywords
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={state.searchQuery}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      searchQuery: e.target.value,
                    }))
                  }
                  placeholder="Search for a keyword..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            {isLoadingKeywords ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredKeywords.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No keywords found. Try a different search term.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredKeywords.map((keyword) => (
                  <button
                    key={keyword.id}
                    onClick={() => handleKeywordSelect(keyword)}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border-2 transition-all',
                      state.selectedKeyword?.id === keyword.id
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {keyword.keyword}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {keyword.intent && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {keyword.intent}
                            </span>
                          )}
                          {keyword.difficulty && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {keyword.difficulty}
                            </span>
                          )}
                          {keyword.search_volume && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {keyword.search_volume.toLocaleString()}
                            </span>
                          )}
                          {keyword.current_rank && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                              <Target className="w-3 h-3" />#
                              {keyword.current_rank}
                            </span>
                          )}
                        </div>
                        {keyword.tags && keyword.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {keyword.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {state.selectedKeyword?.id === keyword.id && (
                        <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review Outline */}
        {state.step === 2 && state.outline && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Article Outline
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review and customize the AI-generated outline
                </p>
              </div>
              <button
                onClick={regenerateOutline}
                disabled={state.isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Regenerate
              </button>
            </div>

            <div className="space-y-4">
              {state.outline.map((section, index) => (
                <div
                  key={section.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleSectionExpanded(section.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
                        {index + 1}
                      </span>
                      <div className="text-left">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {section.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {section.points.length} points · ~{section.wordCount}{' '}
                          words
                        </p>
                      </div>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedSections.has(section.id) && (
                    <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
                      {section.points.map((point, pointIndex) => (
                        <div key={pointIndex} className="flex gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                          <input
                            type="text"
                            value={point}
                            onChange={(e) =>
                              updateOutlinePoint(
                                section.id,
                                pointIndex,
                                e.target.value
                              )
                            }
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() =>
                              removeOutlinePoint(section.id, pointIndex)
                            }
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addOutlinePoint(section.id)}
                        className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <span className="text-lg">+</span>
                        Add point
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Brand Voice */}
        {state.step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Select brand tone
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {toneOptions.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() =>
                      setState((prev) => ({ ...prev, brandTone: tone.value }))
                    }
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      state.brandTone === tone.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <span className="text-2xl mb-2 block">{tone.emoji}</span>
                    <span className="font-medium text-gray-900 dark:text-white block">
                      {tone.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {tone.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Article length
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lengthOptions.map((length) => (
                  <button
                    key={length.value}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        targetLength: length.value,
                      }))
                    }
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all text-center',
                      state.targetLength === length.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <span className="font-medium text-gray-900 dark:text-white block">
                      {length.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {length.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom instructions (optional)
              </label>
              <textarea
                value={state.customInstructions}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    customInstructions: e.target.value,
                  }))
                }
                placeholder="Add any specific requirements or instructions for the article..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Summary
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <span className="font-medium">Keyword:</span>{' '}
                  {state.selectedKeyword?.keyword}
                </p>
                <p>
                  <span className="font-medium">Tone:</span>{' '}
                  {toneOptions.find((t) => t.value === state.brandTone)?.label}
                </p>
                <p>
                  <span className="font-medium">Length:</span>{' '}
                  {
                    lengthOptions.find((l) => l.value === state.targetLength)
                      ?.label
                  }
                </p>
                <p>
                  <span className="font-medium">Sections:</span>{' '}
                  {state.outline?.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Generate */}
        {state.step === 4 && (
          <div className="space-y-6">
            {state.isGenerating ? (
              <div className="text-center py-12">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Generating your article...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This may take a moment. We&apos;re creating optimized content
                  based on your preferences.
                </p>
              </div>
            ) : state.generatedArticle ? (
              <div className="text-center py-8 space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Article Generated Successfully!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    &quot;{state.generatedArticle.title}&quot;
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {state.generatedArticle.content.split(' ').length} words
                  </span>
                  <span>·</span>
                  <span>{state.outline?.length} sections</span>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      // Store in sessionStorage and navigate to editor
                      sessionStorage.setItem(
                        'generatedArticle',
                        JSON.stringify(state.generatedArticle)
                      );
                      router.push('/dashboard/articles/new?generated=true');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Continue to Editor
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
                <p className="text-gray-600 dark:text-gray-400">
                  Ready to generate your article. Click continue to start.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={state.step === 1 || state.isGenerating}
          className={cn(
            'flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors',
            state.step === 1 || state.isGenerating
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed() || state.isGenerating}
          className={cn(
            'flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors',
            canProceed() && !state.isGenerating
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
        >
          {state.isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              {state.step === 4 && state.generatedArticle
                ? 'Edit Article'
                : 'Continue'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* AI Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Sparkles className="w-3 h-3" />
        <span>Powered by AI - optimized for SEO and your brand voice</span>
      </div>
    </div>
  );
}

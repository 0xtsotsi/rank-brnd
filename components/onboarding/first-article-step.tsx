'use client';

/**
 * First Article Step Component
 *
 * Walkthrough for creating the first SEO-optimized article.
 */

import { useState } from 'react';
import { FileText, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArticleWalkthroughStep {
  id: string;
  title: string;
  description: string;
  placeholder: string;
  fieldName: 'topic' | 'keywords' | 'tone';
}

const walkthroughSteps: ArticleWalkthroughStep[] = [
  {
    id: 'topic',
    title: 'What would you like to write about?',
    description:
      'Enter a topic or headline for your article. Our AI will help you expand it into a full SEO-optimized piece.',
    placeholder: 'e.g., "10 Tips for Remote Work Productivity"',
    fieldName: 'topic',
  },
  {
    id: 'keywords',
    title: 'Add target keywords',
    description:
      'Include keywords you want to rank for. These will be naturally woven into your content.',
    placeholder: 'e.g., "remote work, productivity, work from home"',
    fieldName: 'keywords',
  },
  {
    id: 'tone',
    title: 'Choose your tone',
    description: 'Select the writing style that matches your brand voice.',
    placeholder: '',
    fieldName: 'tone',
  },
];

const toneOptions = [
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'casual', label: 'Casual', emoji: '🎯' },
  { value: 'friendly', label: 'Friendly', emoji: '👋' },
  { value: 'authoritative', label: 'Authoritative', emoji: '📚' },
];

interface FirstArticleStepProps {
  onNext: () => void;
  onSkip?: () => void;
}

export function FirstArticleStep({ onNext, onSkip }: FirstArticleStepProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({
    topic: '',
    keywords: '',
    tone: 'professional',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const currentStep = walkthroughSteps[currentStepIndex];
  const isLastStep = currentStepIndex === walkthroughSteps.length - 1;
  const canProceed =
    (currentStep.fieldName === 'tone' && formData.tone) ||
    (currentStep.fieldName !== 'tone' &&
      formData[currentStep.fieldName]?.trim());

  const handleInputChange = (value: string) => {
    setFormData((prev) => ({ ...prev, [currentStep.fieldName]: value }));
  };

  const handleNext = () => {
    if (!canProceed) return;

    if (isLastStep) {
      generateArticle();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const generateArticle = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGenerating(false);
    setIsSuccess(true);
    setTimeout(() => onNext(), 1500);
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 py-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Article Created!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            &quot;{formData.topic}&quot; is ready in your drafts.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-4 h-4" />
          <span>AI-generated content optimized for your keywords</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Step {currentStepIndex + 1} of {walkthroughSteps.length}
          </span>
        </div>
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Skip for now
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{
            width: `${((currentStepIndex + 1) / walkthroughSteps.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {currentStep.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {currentStep.description}
        </p>
      </div>

      {/* Input */}
      <div className="space-y-4">
        {currentStep.fieldName === 'tone' ? (
          <div className="grid grid-cols-2 gap-3">
            {toneOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleInputChange(option.value)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  formData.tone === option.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <span className="text-2xl mb-2 block">{option.emoji}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <textarea
            value={formData[currentStep.fieldName]}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={currentStep.placeholder}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        )}
      </div>

      {/* Summary of what's filled */}
      {currentStepIndex > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            So far:
          </p>
          {formData.topic && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Topic:</span> {formData.topic}
            </p>
          )}
          {formData.keywords && currentStepIndex >= 2 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Keywords:</span> {formData.keywords}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
          className={cn(
            'px-4 py-3 font-medium rounded-lg transition-colors',
            currentStepIndex === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed || isGenerating}
          className={cn(
            'flex-1 px-6 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
            canProceed && !isGenerating
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              {isLastStep ? 'Generate Article' : 'Continue'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* AI Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Sparkles className="w-3 h-3" />
        <span>Powered by AI - optimized for SEO</span>
      </div>
    </div>
  );
}

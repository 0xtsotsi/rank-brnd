'use client';

/**
 * Product Tour Step Component
 *
 * Interactive tour of the main features and navigation.
 */

import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: 'right' | 'left' | 'top' | 'bottom' | 'center';
}

const tourSteps: TourStep[] = [
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description:
      'Get an overview of your content performance, metrics, and quick actions all in one place.',
    target: '[data-tour="dashboard"]',
    position: 'right',
  },
  {
    id: 'sidebar',
    title: 'Navigation Sidebar',
    description:
      'Quickly access all features: articles, keywords, planner, analytics, and settings.',
    target: '[data-tour="sidebar"]',
    position: 'right',
  },
  {
    id: 'articles',
    title: 'Articles',
    description:
      'Create, edit, and manage your SEO-optimized content with AI assistance.',
    target: '[data-tour="articles"]',
    position: 'right',
  },
  {
    id: 'keywords',
    title: 'Keyword Research',
    description:
      'Track keyword rankings, discover new opportunities, and monitor your SEO progress.',
    target: '[data-tour="keywords"]',
    position: 'right',
  },
  {
    id: 'planner',
    title: 'Content Planner',
    description:
      'Plan and schedule your content with an intuitive calendar view.',
    target: '[data-tour="planner"]',
    position: 'right',
  },
];

interface ProductTourStepProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function ProductTourStep({ onComplete, onSkip }: ProductTourStepProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = tourSteps[currentStepIndex];
  const isLastStep = currentStepIndex === tourSteps.length - 1;

  // Find and highlight the target element
  useEffect(() => {
    const findElement = () => {
      // Try to find the element by selector
      let element = document.querySelector(currentStep.target) as HTMLElement;

      // If not found, use a fallback element for the demo
      if (!element) {
        // For demo purposes, create visible placeholders
        const placeholder = document.createElement('div');
        placeholder.id = `tour-placeholder-${currentStep.id}`;
        placeholder.className =
          'tour-placeholder fixed bg-indigo-100 dark:bg-indigo-900/30 border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center';
        placeholder.innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 text-sm font-medium px-4 py-2">${currentStep.title}</span>`;

        // Position placeholders for demo
        if (currentStep.id === 'dashboard') {
          placeholder.style.cssText =
            'top: 100px; right: 100px; width: 300px; height: 200px;';
        } else if (currentStep.id === 'sidebar') {
          placeholder.style.cssText =
            'top: 200px; left: 20px; width: 200px; height: 300px;';
        } else if (currentStep.id === 'articles') {
          placeholder.style.cssText =
            'top: 300px; left: 80px; width: 180px; height: 60px;';
        } else if (currentStep.id === 'keywords') {
          placeholder.style.cssText =
            'top: 380px; left: 80px; width: 180px; height: 60px;';
        } else if (currentStep.id === 'planner') {
          placeholder.style.cssText =
            'top: 460px; left: 80px; width: 180px; height: 60px;';
        }

        document.body.appendChild(placeholder);
        element = placeholder;
      }

      setTargetElement(element);

      // Calculate spotlight position
      const rect = element.getBoundingClientRect();
      setSpotlightStyle({
        top: `${rect.top - 4}px`,
        left: `${rect.left - 4}px`,
        width: `${rect.width + 8}px`,
        height: `${rect.height + 8}px`,
      });
    };

    findElement();

    // Cleanup placeholders
    return () => {
      document
        .querySelectorAll('.tour-placeholder')
        .forEach((el) => el.remove());
    };
  }, [currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    // Remove all placeholders
    document.querySelectorAll('.tour-placeholder').forEach((el) => el.remove());
    onSkip?.();
  };

  return (
    <>
      {/* Spotlight overlay */}
      <div className="fixed inset-0 z-40 pointer-events-none">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Spotlight hole */}
        <div
          className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-2xl transition-all duration-300 ease-out"
          style={spotlightStyle}
        />

        {/* Pulsing ring around spotlight */}
        <div
          className="absolute border-4 border-indigo-500 rounded-lg animate-pulse"
          style={{
            ...spotlightStyle,
            top: `calc(${spotlightStyle.top || '0px'} - 8px)`,
            left: `calc(${spotlightStyle.left || '0px'} - 8px)`,
            width: `calc(${spotlightStyle.width || '0px'} + 16px)`,
            height: `calc(${spotlightStyle.height || '0px'} + 16px)`,
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 transition-all duration-300',
          'animate-fade-in-up'
        )}
        style={{
          // Position tooltip based on spotlight
          top: `calc(${spotlightStyle.top || '0px'} + ${spotlightStyle.height || '0'}px + 20px)`,
          left: spotlightStyle.left,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Step {currentStepIndex + 1} of {tourSteps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / tourSteps.length) * 100}%`,
            }}
          />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {currentStep.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {currentStep.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={cn(
              'p-2 rounded-lg transition-colors',
              currentStepIndex === 0
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Simplified Tour Preview Component
 *
 * Shows a preview of what the tour covers without the interactive spotlight.
 */
export function ProductTourPreview({
  onStartTour,
  onSkip,
}: {
  onStartTour: () => void;
  onSkip?: () => void;
}) {
  const features = [
    {
      icon: '📊',
      title: 'Dashboard',
      description: 'Overview of metrics and quick actions',
    },
    {
      icon: '📝',
      title: 'Articles',
      description: 'AI-powered content creation',
    },
    {
      icon: '🔍',
      title: 'Keywords',
      description: 'Track rankings and opportunities',
    },
    {
      icon: '📅',
      title: 'Planner',
      description: 'Schedule content with calendar view',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
          <span className="text-3xl">🗺️</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Explore the Features
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Take a quick tour to learn how to navigate Rank.brnd
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          >
            <span className="text-2xl mb-2 block">{feature.icon}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Skip Tour
          </button>
        )}
        <button
          onClick={onStartTour}
          className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
        >
          Start Tour
        </button>
      </div>
    </div>
  );
}

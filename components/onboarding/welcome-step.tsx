'use client';

/**
 * Welcome Step Component
 *
 * The first step of the onboarding flow that welcomes users
 * and sets expectations for the onboarding process.
 */

import { Hand, Sparkles, Clock } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  userName?: string;
}

export function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 animate-pulse">
        <Hand className="w-10 h-10 text-white" />
      </div>

      {/* Welcome Message */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Rank.brnd{userName ? `, ${userName}` : ''}!
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Let&apos;s get your SEO content engine up and running
        </p>
      </div>

      {/* What to expect */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-left">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Here&apos;s what we&apos;ll cover:
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                1
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Set up your workspace
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create your organization and configure settings
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                2
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Quick product tour
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Learn how to navigate and use key features
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                3
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Create your first article
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use AI to generate SEO-optimized content
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                4
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Connect your CMS
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Publish to WordPress, Ghost, Notion, and more
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* Time estimate */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Clock className="w-4 h-4" />
        <span>Estimated time: 10-15 minutes</span>
      </div>

      {/* CTA Button */}
      <button
        onClick={onNext}
        className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
      >
        Let&apos;s Get Started
      </button>
    </div>
  );
}

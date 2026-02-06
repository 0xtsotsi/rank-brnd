'use client';

/**
 * Success Step Component
 *
 * Final step celebrating onboarding completion.
 */

import { ConfettiCannon } from '@/components/ui/confetti';
import {
  CheckCircle2,
  ArrowRight,
  Home,
  FileText,
  Settings,
} from 'lucide-react';

interface SuccessStepProps {
  userName?: string;
  achievements?: {
    organizationCreated?: boolean;
    firstArticleCreated?: boolean;
    integrationConnected?: boolean;
    tourCompleted?: boolean;
  };
  onNext?: () => void;
}

export function SuccessStep({
  userName,
  achievements = {},
  onNext,
}: SuccessStepProps) {
  const achievementList = [
    ...(achievements.organizationCreated ? ['Created your workspace'] : []),
    ...(achievements.firstArticleCreated
      ? ['Generated your first AI article']
      : []),
    ...(achievements.integrationConnected ? ['Connected your CMS'] : []),
    ...(achievements.tourCompleted ? ['Completed product tour'] : []),
  ];

  // Add default achievements if none
  const displayAchievements =
    achievementList.length > 0
      ? achievementList
      : [
          'Completed onboarding setup',
          'Ready to create content',
          'Explored key features',
        ];

  return (
    <>
      {/* Confetti Celebration */}
      <ConfettiCannon fire={true} />

      {/* Success Content */}
      <div className="text-center space-y-6 animate-fade-in">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-4 shadow-lg animate-bounce-in">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>

        {/* Congratulatory Message */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {userName ? `Great job, ${userName}!` : 'You&apos;re All Set!'}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            You&apos;ve successfully completed the onboarding. Your SEO content
            engine is ready to go!
          </p>
        </div>

        {/* Achievement Summary */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-left max-w-sm mx-auto">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">
            What you accomplished:
          </h3>
          <ul className="space-y-3">
            {displayAchievements.map((achievement, index) => (
              <li
                key={index}
                className="flex items-center gap-3 text-gray-700 dark:text-gray-300"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span>{achievement}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What's Next */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            What&apos;s next?
          </h3>
          <div className="grid gap-3">
            <a
              href="/dashboard"
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Go to Dashboard
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </a>
            <a
              href="/dashboard/articles/new"
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Create Another Article
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </a>
            <a
              href="/dashboard/settings"
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-indigo-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Configure Settings
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </a>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onNext}
          className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
        >
          Start Creating Content
        </button>

        {/* Pro tip */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-400">
            <span className="font-semibold">💡 Pro tip:</span> Check out the
            keyword research tool to find high-opportunity topics to write
            about!
          </p>
        </div>
      </div>
    </>
  );
}

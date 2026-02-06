'use client';

/**
 * Wizard Complete Step Component
 *
 * Celebration screen shown when users complete the setup wizard.
 * Displays achievements and provides next steps.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  PartyPopper,
  ArrowRight,
  Home,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardCompleteStepProps {
  userName?: string;
  brandConfig?: {
    name: string;
  };
  achievements: {
    brandSetupComplete: boolean;
    cmsConnected: boolean;
    keywordCreated: boolean;
    articleGenerated: boolean;
  };
  onNext: () => void;
}

const NEXT_STEPS = [
  {
    icon: BarChart3,
    title: 'View Your Analytics',
    description: 'Track your keyword rankings and traffic',
    href: '/dashboard/analytics',
  },
  {
    icon: FileText,
    title: 'Manage Your Articles',
    description: 'Edit and publish your generated content',
    href: '/dashboard/articles',
  },
  {
    icon: Settings,
    title: 'Customize Your Settings',
    description: 'Configure integrations and preferences',
    href: '/dashboard/settings',
  },
];

export function WizardCompleteStep({
  userName,
  brandConfig,
  achievements,
  onNext,
}: WizardCompleteStepProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const [visibleAchievements, setVisibleAchievements] = useState<boolean[]>([]);

  useEffect(() => {
    // Trigger animations
    setShowConfetti(true);
    const timer = setTimeout(() => {
      const achievementsList = [
        achievements.brandSetupComplete,
        achievements.cmsConnected,
        achievements.keywordCreated,
        achievements.articleGenerated,
      ];
      setVisibleAchievements(achievementsList);
    }, 300);
    return () => clearTimeout(timer);
  }, [achievements]);

  const achievementItems = [
    {
      key: 'brandSetupComplete',
      icon: '🎨',
      label: 'Brand configured',
      completed: achievements.brandSetupComplete,
    },
    {
      key: 'cmsConnected',
      icon: '🔗',
      label: 'CMS connected',
      completed: achievements.cmsConnected,
    },
    {
      key: 'keywordCreated',
      icon: '🎯',
      label: 'Keyword added',
      completed: achievements.keywordCreated,
    },
    {
      key: 'articleGenerated',
      icon: '📝',
      label: 'Article generated',
      completed: achievements.articleGenerated,
    },
  ];

  const completedCount = achievementItems.filter((a) => a.completed).length;

  const handleNextStep = () => {
    onNext();
  };

  const handleNavigate = (href: string) => {
    onNext();
    setTimeout(() => router.push(href), 100);
  };

  return (
    <div className="text-center space-y-8 py-8">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <PartyPopper
                className={cn(
                  'w-6 h-6',
                  i % 4 === 0 && 'text-purple-500',
                  i % 4 === 1 && 'text-blue-500',
                  i % 4 === 2 && 'text-green-500',
                  i % 4 === 3 && 'text-yellow-500'
                )}
              />
            </div>
          ))}
        </div>
      )}

      {/* Success Icon */}
      <div className="relative inline-flex">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 animate-bounce-in">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
          <span className="text-white text-sm font-bold">{completedCount}</span>
        </div>
      </div>

      {/* Congratulations Message */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          You&apos;re All Set, {userName || 'Partner'}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          {brandConfig?.name || 'Your workspace'} is ready to start creating
          amazing content.
        </p>
      </div>

      {/* Achievements */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          Setup Complete
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {achievementItems.map((item, index) => (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-all duration-500',
                item.completed
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-gray-100 dark:bg-gray-800 border border-transparent opacity-50',
                visibleAchievements[index] && 'animate-scale-in'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {item.label}
              </span>
              {item.completed && (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
          What&apos;s Next?
        </h3>
        <div className="space-y-2">
          {NEXT_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <button
                key={step.href}
                onClick={() => handleNavigate(step.href)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                  'hover:border-indigo-300 dark:hover:border-indigo-700',
                  'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                  'border-gray-200 dark:border-gray-700',
                  'animate-fade-in'
                )}
                style={{ animationDelay: `${500 + index * 100}ms` }}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {step.title}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {step.description}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button
          onClick={() => handleNavigate('/dashboard')}
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Home className="w-5 h-5" />
          Go to Dashboard
        </button>
        <button
          onClick={handleNextStep}
          className="px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Stay Here
          <span className="text-sm opacity-50">(explore more)</span>
        </button>
      </div>
    </div>
  );
}

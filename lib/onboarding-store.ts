'use client';

/**
 * Onboarding Store
 *
 * Client-side state management for the onboarding flow using Zustand.
 * Handles multi-step onboarding progress with SSR-safe localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  OnboardingStep,
  OnboardingStepId,
  OnboardingProgress,
} from '@/types/onboarding';

const ONBOARDING_STORAGE_KEY = 'rankbrnd_onboarding';
const ONBOARDING_VERSION = 1;

/**
 * All available onboarding steps in order
 */
const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with Rank.brnd',
    estimatedTime: '2 min',
    isCompleted: false,
  },
  {
    id: 'organization-setup',
    title: 'Set Up Organization',
    description: 'Create your workspace',
    estimatedTime: '3 min',
    isCompleted: false,
  },
  {
    id: 'product-tour',
    title: 'Product Tour',
    description: 'Explore the key features',
    estimatedTime: '5 min',
    isOptional: true,
    isCompleted: false,
  },
  {
    id: 'first-article',
    title: 'Create First Article',
    description: 'Generate SEO content with AI',
    estimatedTime: '5 min',
    isCompleted: false,
  },
  {
    id: 'integration-setup',
    title: 'Connect CMS',
    description: 'Publish to your favorite platforms',
    estimatedTime: '3 min',
    isOptional: true,
    isCompleted: false,
  },
  {
    id: 'success',
    title: 'All Set!',
    description: "You're ready to go",
    isCompleted: false,
  },
];

/**
 * Default onboarding progress
 */
const defaultProgress: OnboardingProgress = {
  userId: '',
  currentStep: 'welcome',
  completedSteps: [],
  skippedSteps: [],
  startedAt: null,
  completedAt: null,
  organizationCreated: false,
  firstArticleCreated: false,
  integrationConnected: false,
  tourCompleted: false,
};

/**
 * Update step completion status based on progress
 */
function updateStepsCompletion(
  progress: Partial<OnboardingProgress>
): OnboardingStep[] {
  return onboardingSteps.map((step) => ({
    ...step,
    isCompleted: !!(
      progress.completedSteps?.includes(step.id) ||
      (step.id === 'organization-setup' && progress.organizationCreated) ||
      (step.id === 'first-article' && progress.firstArticleCreated) ||
      (step.id === 'integration-setup' && progress.integrationConnected) ||
      (step.id === 'product-tour' && progress.tourCompleted)
    ),
  }));
}

interface OnboardingStore extends OnboardingProgress {
  steps: OnboardingStep[];

  // Actions
  start: (userId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: OnboardingStepId) => void;
  skipStep: () => void;
  markAchievement: <
    T extends keyof Pick<
      OnboardingProgress,
      | 'organizationCreated'
      | 'firstArticleCreated'
      | 'integrationConnected'
      | 'tourCompleted'
    >,
  >(
    achievement: T
  ) => void;
  complete: () => void;
  reset: () => void;
  isComplete: () => boolean;
  getProgressPercentage: () => number;
  getCurrentStepIndex: () => number;
  getTotalSteps: () => number;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultProgress,
      steps: onboardingSteps,

      // Start onboarding for a user
      start: (userId: string) => {
        set({
          userId,
          currentStep: 'welcome',
          startedAt: new Date().toISOString(),
          completedAt: null,
          completedSteps: [],
          skippedSteps: [],
          steps: onboardingSteps,
        });
      },

      // Move to next step
      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = onboardingSteps.findIndex(
          (s) => s.id === currentStep
        );
        if (currentIndex < onboardingSteps.length - 1) {
          const nextStep = onboardingSteps[currentIndex + 1];
          get().goToStep(nextStep.id);
        }
      },

      // Move to previous step
      previousStep: () => {
        const { currentStep } = get();
        const currentIndex = onboardingSteps.findIndex(
          (s) => s.id === currentStep
        );
        if (currentIndex > 0) {
          const prevStep = onboardingSteps[currentIndex - 1];
          get().goToStep(prevStep.id);
        }
      },

      // Go to a specific step
      goToStep: (stepId: OnboardingStepId) => {
        const { currentStep, completedSteps } = get();
        const currentIndex = onboardingSteps.findIndex(
          (s) => s.id === currentStep
        );
        const newIndex = onboardingSteps.findIndex((s) => s.id === stepId);

        // Mark current step as completed if moving forward
        let newCompletedSteps = [...completedSteps];
        if (newIndex > currentIndex) {
          if (!newCompletedSteps.includes(currentStep)) {
            newCompletedSteps.push(currentStep);
          }
        }

        const state = get();
        set({
          currentStep: stepId,
          completedSteps: newCompletedSteps,
          steps: updateStepsCompletion({
            ...state,
            completedSteps: newCompletedSteps,
          }),
        });
      },

      // Skip current step
      skipStep: () => {
        const { currentStep, skippedSteps } = get();
        set({
          skippedSteps: skippedSteps.includes(currentStep)
            ? skippedSteps
            : [...skippedSteps, currentStep],
        });
        get().nextStep();
      },

      // Mark a specific achievement as complete
      markAchievement: <
        T extends keyof Pick<
          OnboardingProgress,
          | 'organizationCreated'
          | 'firstArticleCreated'
          | 'integrationConnected'
          | 'tourCompleted'
        >,
      >(
        achievement: T
      ) => {
        set({
          [achievement]: true,
          steps: updateStepsCompletion({
            ...get(),
            [achievement]: true,
          }),
        });
      },

      // Complete onboarding
      complete: () => {
        const { completedSteps } = get();
        set({
          completedAt: new Date().toISOString(),
          currentStep: 'success',
          completedSteps: completedSteps.includes('success')
            ? completedSteps
            : [...completedSteps, 'success'],
          steps: updateStepsCompletion({
            ...get(),
            completedAt: new Date().toISOString(),
            currentStep: 'success',
            completedSteps: completedSteps.includes('success')
              ? completedSteps
              : [...completedSteps, 'success'],
          }),
        });
      },

      // Reset onboarding (for testing or restart)
      reset: () => {
        set({
          ...defaultProgress,
          steps: onboardingSteps,
        });
      },

      // Check if onboarding is complete
      isComplete: () => {
        const { completedAt } = get();
        return !!completedAt;
      },

      // Get progress percentage
      getProgressPercentage: () => {
        const { completedSteps } = get();
        const requiredSteps = onboardingSteps.filter((s) => !s.isOptional);
        const completedRequiredSteps = requiredSteps.filter((s) =>
          completedSteps.includes(s.id)
        );
        return Math.round(
          (completedRequiredSteps.length / requiredSteps.length) * 100
        );
      },

      // Get current step index
      getCurrentStepIndex: () => {
        const { currentStep } = get();
        return onboardingSteps.findIndex((s) => s.id === currentStep);
      },

      // Get total steps
      getTotalSteps: () => {
        return onboardingSteps.length;
      },
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(name);
        },
      },
      version: ONBOARDING_VERSION,
      skipHydration: true,
      // Migrate or clear old data if version changes
      migrate: (persistedState: any, version: number) => {
        if (version !== ONBOARDING_VERSION) {
          // Version mismatch, return default state
          return {
            ...defaultProgress,
            steps: onboardingSteps,
          };
        }
        return persistedState as OnboardingStore;
      },
      // Only persist specific fields (exclude computed steps)
      partialize: (state) => {
        const { steps, ...persistedState } = state;
        return persistedState as any;
      },
    }
  )
);

// Export the store for non-React usage
// Usage: getOnboardingStore().getState() or getOnboardingStore().setState()
export const getOnboardingStore = useOnboardingStore;

/**
 * Selector hooks for optimized re-renders
 */
export const useOnboardingSteps = () =>
  useOnboardingStore((state) => state.steps);
export const useOnboardingCurrentStep = () =>
  useOnboardingStore((state) => state.currentStep);
export const useOnboardingProgress = () =>
  useOnboardingStore((state) => state.getProgressPercentage());
export const useOnboardingIsComplete = () =>
  useOnboardingStore((state) => state.isComplete());

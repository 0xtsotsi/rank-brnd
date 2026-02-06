'use client';

/**
 * Setup Wizard Store
 *
 * Client-side state management for the setup wizard flow using Zustand.
 * Handles multi-step form progress with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreApi } from 'zustand';
import type {
  SetupWizardStep,
  SetupWizardStepId,
  SetupWizardProgress,
  BrandConfig,
  CMSIntegration,
  KeywordConfig,
  ArticleGenerationOptions,
} from '@/types/setup-wizard';

const SETUP_WIZARD_STORAGE_KEY = 'rankbrnd_setup_wizard';
const SETUP_WIZARD_VERSION = 1;

/**
 * All available setup wizard steps in order
 */
const setupWizardSteps: SetupWizardStep[] = [
  {
    id: 'brand-setup',
    title: 'Brand Setup',
    description: 'Configure your brand identity',
    estimatedTime: '3 min',
    isCompleted: false,
  },
  {
    id: 'cms-connection',
    title: 'Connect CMS',
    description: 'Link your content management system',
    estimatedTime: '2 min',
    isOptional: true,
    isCompleted: false,
  },
  {
    id: 'keyword-setup',
    title: 'First Keyword',
    description: 'Add a keyword to track',
    estimatedTime: '2 min',
    isCompleted: false,
  },
  {
    id: 'article-generation',
    title: 'Generate Article',
    description: 'Create your first AI article',
    estimatedTime: '3 min',
    isCompleted: false,
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: "You're ready to go",
    isCompleted: false,
  },
];

/**
 * Default setup wizard progress
 */
const defaultProgress: SetupWizardProgress = {
  userId: '',
  currentStep: 'brand-setup',
  completedSteps: [],
  skippedSteps: [],
  startedAt: null,
  completedAt: null,
  brandSetupComplete: false,
  cmsConnected: false,
  keywordCreated: false,
  articleGenerated: false,
};

/**
 * Update step completion status based on progress
 */
function updateStepsCompletion(
  progress: Partial<SetupWizardProgress>
): SetupWizardStep[] {
  return setupWizardSteps.map((step) => ({
    ...step,
    isCompleted: !!(
      progress.completedSteps?.includes(step.id) ||
      (step.id === 'brand-setup' && progress.brandSetupComplete) ||
      (step.id === 'cms-connection' && progress.cmsConnected) ||
      (step.id === 'keyword-setup' && progress.keywordCreated) ||
      (step.id === 'article-generation' && progress.articleGenerated)
    ),
  }));
}

interface SetupWizardStore extends SetupWizardProgress {
  steps: SetupWizardStep[];

  // Actions
  start: (userId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: SetupWizardStepId) => void;
  skipStep: () => void;
  saveBrandConfig: (config: BrandConfig) => void;
  saveCMSIntegration: (integration: CMSIntegration) => void;
  saveKeywordConfig: (config: KeywordConfig) => void;
  saveArticleOptions: (options: ArticleGenerationOptions) => void;
  complete: () => void;
  reset: () => void;
  isComplete: () => boolean;
  canAccessStep: (stepId: SetupWizardStepId) => boolean;
  getProgressPercentage: () => number;
  getCurrentStepIndex: () => number;
  getTotalSteps: () => number;
}

/**
 * Create the setup wizard store with Zustand and persistence
 */
export const useSetupWizardStore = create<SetupWizardStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultProgress,
      steps: setupWizardSteps,
      brandConfig: undefined,
      cmsIntegration: undefined,
      keywordConfig: undefined,
      articleOptions: undefined,

      // Start setup wizard for a user
      start: (userId: string) => {
        set({
          userId,
          currentStep: 'brand-setup',
          startedAt: new Date().toISOString(),
          completedAt: null,
          completedSteps: [],
          skippedSteps: [],
          steps: setupWizardSteps,
        });
      },

      // Move to next step
      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = setupWizardSteps.findIndex(
          (s) => s.id === currentStep
        );
        if (currentIndex < setupWizardSteps.length - 1) {
          const nextStep = setupWizardSteps[currentIndex + 1];
          get().goToStep(nextStep.id);
        }
      },

      // Move to previous step
      previousStep: () => {
        const { currentStep } = get();
        const currentIndex = setupWizardSteps.findIndex(
          (s) => s.id === currentStep
        );
        if (currentIndex > 0) {
          const prevStep = setupWizardSteps[currentIndex - 1];
          get().goToStep(prevStep.id);
        }
      },

      // Go to a specific step
      goToStep: (stepId: SetupWizardStepId) => {
        const { currentStep, completedSteps } = get();
        const currentIndex = setupWizardSteps.findIndex(
          (s) => s.id === currentStep
        );
        const newIndex = setupWizardSteps.findIndex((s) => s.id === stepId);

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

      // Save brand configuration
      saveBrandConfig: (config: BrandConfig) => {
        set({
          brandConfig: config,
          brandSetupComplete: true,
          steps: updateStepsCompletion({
            ...get(),
            brandSetupComplete: true,
          }),
        });
      },

      // Save CMS integration
      saveCMSIntegration: (integration: CMSIntegration) => {
        set({
          cmsIntegration: integration,
          cmsConnected: integration.connected,
          steps: updateStepsCompletion({
            ...get(),
            cmsConnected: integration.connected,
          }),
        });
      },

      // Save keyword configuration
      saveKeywordConfig: (config: KeywordConfig) => {
        set({
          keywordConfig: config,
          keywordCreated: true,
          steps: updateStepsCompletion({
            ...get(),
            keywordCreated: true,
          }),
        });
      },

      // Save article generation options
      saveArticleOptions: (options: ArticleGenerationOptions) => {
        set({
          articleOptions: options,
          articleGenerated: true,
          steps: updateStepsCompletion({
            ...get(),
            articleGenerated: true,
          }),
        });
      },

      // Complete setup wizard
      complete: () => {
        const { completedSteps } = get();
        set({
          completedAt: new Date().toISOString(),
          currentStep: 'complete',
          completedSteps: completedSteps.includes('complete')
            ? completedSteps
            : [...completedSteps, 'complete'],
        });
      },

      // Reset setup wizard (for testing or restart)
      reset: () => {
        set({
          ...defaultProgress,
          steps: setupWizardSteps,
          brandConfig: undefined,
          cmsIntegration: undefined,
          keywordConfig: undefined,
          articleOptions: undefined,
        });
      },

      // Check if setup wizard is complete
      isComplete: () => {
        const { completedAt } = get();
        return !!completedAt;
      },

      // Check if step can be navigated to (previous steps completed)
      canAccessStep: (stepId: SetupWizardStepId) => {
        const { currentStep } = get();
        const stepIndex = setupWizardSteps.findIndex((s) => s.id === stepId);
        const currentStepIndex = setupWizardSteps.findIndex(
          (s) => s.id === currentStep
        );

        // Can access current step and any previous step
        return stepIndex <= currentStepIndex;
      },

      // Get progress percentage
      getProgressPercentage: () => {
        const { completedSteps } = get();
        const requiredSteps = setupWizardSteps.filter((s) => !s.isOptional);
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
        return setupWizardSteps.findIndex((s) => s.id === currentStep);
      },

      // Get total steps
      getTotalSteps: () => {
        return setupWizardSteps.length;
      },
    }),
    {
      name: SETUP_WIZARD_STORAGE_KEY,
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
      // Version migration for future updates
      version: SETUP_WIZARD_VERSION,
      skipHydration: true,
      // Don't persist these transient properties (exclude computed steps)
      partialize: (state) => {
        const { steps, ...persistedState } = state;
        return persistedState as any;
      },
    }
  )
);

// Export the store for non-React usage
// Usage: getSetupWizardStore().getState() or getSetupWizardStore().subscribe()
export const getSetupWizardStore = useSetupWizardStore;

/**
 * Selector hooks for optimized re-renders
 */
export const useSetupWizardSteps = () =>
  useSetupWizardStore((state) => state.steps);
export const useSetupWizardCurrentStep = () =>
  useSetupWizardStore((state) => state.currentStep);
export const useSetupWizardProgress = () =>
  useSetupWizardStore((state) => state.getProgressPercentage());
export const useSetupWizardBrandConfig = () =>
  useSetupWizardStore((state) => state.brandConfig);
export const useSetupWizardCMSIntegration = () =>
  useSetupWizardStore((state) => state.cmsIntegration);
export const useSetupWizardKeywordConfig = () =>
  useSetupWizardStore((state) => state.keywordConfig);
export const useSetupWizardArticleOptions = () =>
  useSetupWizardStore((state) => state.articleOptions);

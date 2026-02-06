/**
 * Onboarding Types
 *
 * Types for the interactive onboarding flow including
 * product tour, first article creation walkthrough, and integration setup.
 */

/**
 * Onboarding step identifiers
 */
export type OnboardingStepId =
  | 'welcome'
  | 'organization-setup'
  | 'product-tour'
  | 'first-article'
  | 'integration-setup'
  | 'success';

/**
 * Individual onboarding step configuration
 */
export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  icon?: string;
  estimatedTime?: string;
  isOptional?: boolean;
  isCompleted: boolean;
}

/**
 * Tour hotspot/tooltip configuration
 */
export interface TourHotspot {
  id: string;
  target: string; // CSS selector or element ID
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * Product tour configuration
 */
export interface ProductTour {
  id: string;
  name: string;
  description: string;
  hotspots: TourHotspot[];
}

/**
 * Integration setup options
 */
export interface IntegrationOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  popular?: boolean;
  setupUrl: string;
}

/**
 * First article walkthrough steps
 */
export interface ArticleWalkthroughStep {
  id: string;
  title: string;
  description: string;
  content?: string;
  targetElement?: string;
}

/**
 * User's onboarding progress state
 */
export interface OnboardingProgress {
  userId: string;
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  skippedSteps: OnboardingStepId[];
  startedAt: string | null;
  completedAt: string | null;
  // Track specific accomplishments
  organizationCreated: boolean;
  firstArticleCreated: boolean;
  integrationConnected: boolean;
  tourCompleted: boolean;
}

/**
 * Onboarding state for UI
 */
export interface OnboardingState {
  isActive: boolean;
  currentStepIndex: number;
  progress: OnboardingProgress;
  selectedIntegration?: string;
}

/**
 * Success celebration configuration
 */
export interface SuccessCelebration {
  title: string;
  message: string;
  achievements: string[];
  nextAction?: {
    label: string;
    href: string;
  };
}

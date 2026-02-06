/**
 * Setup Wizard Types
 *
 * Types for the multi-step setup wizard that guides users through:
 * 1. Brand setup
 * 2. CMS connection
 * 3. First keyword creation
 * 4. First article generation
 */

/**
 * Setup wizard step identifiers
 */
export type SetupWizardStepId =
  | 'brand-setup'
  | 'cms-connection'
  | 'keyword-setup'
  | 'article-generation'
  | 'complete';

/**
 * Individual wizard step configuration
 */
export interface SetupWizardStep {
  id: SetupWizardStepId;
  title: string;
  description: string;
  icon?: string;
  estimatedTime?: string;
  isOptional?: boolean;
  isCompleted: boolean;
}

/**
 * Brand configuration
 */
export interface BrandConfig {
  name: string;
  website?: string;
  industry?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  description?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
}

/**
 * CMS integration options
 */
export type CMSProvider =
  | 'wordpress'
  | 'webflow'
  | 'shopify'
  | 'contentful'
  | 'custom';

export interface CMSIntegration {
  provider: CMSProvider;
  siteUrl?: string;
  apiKey?: string;
  connected: boolean;
  lastSync?: string;
}

/**
 * Keyword configuration
 */
export interface KeywordConfig {
  keyword: string;
  searchVolume?: number;
  difficulty?: 'low' | 'medium' | 'high';
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  targetUrl?: string;
}

/**
 * Article generation options
 */
export interface ArticleGenerationOptions {
  keyword: string;
  title?: string;
  wordCount?: number;
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
  includeFaq?: boolean;
  includeMeta?: boolean;
  targetAudience?: string;
}

/**
 * User's setup wizard progress state
 */
export interface SetupWizardProgress {
  userId: string;
  currentStep: SetupWizardStepId;
  completedSteps: SetupWizardStepId[];
  skippedSteps: SetupWizardStepId[];
  startedAt: string | null;
  completedAt: string | null;
  // Track specific accomplishments
  brandSetupComplete: boolean;
  cmsConnected: boolean;
  keywordCreated: boolean;
  articleGenerated: boolean;
  // Stored data
  brandConfig?: BrandConfig;
  cmsIntegration?: CMSIntegration;
  keywordConfig?: KeywordConfig;
  articleOptions?: ArticleGenerationOptions;
}

/**
 * Setup wizard state for UI
 */
export interface SetupWizardState {
  isActive: boolean;
  currentStepIndex: number;
  progress: SetupWizardProgress;
}

/**
 * Step validation result
 */
export interface StepValidation {
  isValid: boolean;
  errors?: Record<string, string>;
}

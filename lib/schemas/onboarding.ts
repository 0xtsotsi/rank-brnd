/**
 * Onboarding API Schemas
 *
 * Zod validation schemas for onboarding-related API routes.
 */

import { z } from 'zod';

/**
 * Valid onboarding steps
 */
const onboardingStepSchema = z.enum([
  'welcome',
  'organization-setup',
  'product-tour',
  'first-article',
  'integration-setup',
  'success',
]);

/**
 * Update Onboarding Progress Schema
 *
 * POST /api/onboarding
 */
export const updateOnboardingSchema = z.object({
  currentStep: onboardingStepSchema.optional(),
  completedSteps: z.array(onboardingStepSchema).optional(),
  skippedSteps: z.array(onboardingStepSchema).optional(),
  organizationCreated: z.boolean().optional(),
  firstArticleCreated: z.boolean().optional(),
  integrationConnected: z.boolean().optional(),
  tourCompleted: z.boolean().optional(),
  completed: z.boolean().optional(),
});

/**
 * Onboarding Response Schema
 */
export const onboardingResponseSchema = z.object({
  userId: z.string(),
  currentStep: onboardingStepSchema,
  completedSteps: z.array(onboardingStepSchema),
  skippedSteps: z.array(onboardingStepSchema),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  organizationCreated: z.boolean(),
  firstArticleCreated: z.boolean(),
  integrationConnected: z.boolean(),
  tourCompleted: z.boolean(),
});

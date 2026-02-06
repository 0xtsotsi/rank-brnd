/**
 * Usage API Schemas
 *
 * Zod validation schemas for usage-related API routes.
 */

import { z } from 'zod';

/**
 * Usage metric types
 */
const usageMetricSchema = z.enum([
  'api_calls',
  'articles_published',
  'keywords_tracked',
  'storage_bytes',
  'team_members',
  'integrations',
]);

/**
 * Plan identifiers
 */
const planIdSchema = z.enum(['free', 'pro', 'enterprise']);

/**
 * Usage Query Schema
 *
 * GET /api/usage
 */
export const usageQuerySchema = z.object({
  planId: planIdSchema.optional(),
});

/**
 * Check Usage Limit Schema
 *
 * POST /api/usage/check
 */
export const checkUsageSchema = z.object({
  metric: usageMetricSchema,
  quantity: z.coerce.number().int().positive().optional().default(1),
  planId: planIdSchema.optional().default('free'),
  organizationId: z.string().optional(),
});

/**
 * Usage Stats Response Schema
 */
export const usageStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    planId: planIdSchema,
    quotas: z.array(
      z.object({
        metric: usageMetricSchema,
        limit: z.number(),
        used: z.number(),
        remaining: z.number(),
        percentage: z.number(),
        resetAt: z.string().datetime().nullable(),
      })
    ),
  }),
});

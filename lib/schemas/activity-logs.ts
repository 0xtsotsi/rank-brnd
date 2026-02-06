/**
 * Activity Logs API Schemas
 *
 * Zod validation schemas for activity log-related API routes.
 */

import { z } from 'zod';

/**
 * Activity action types
 */
export const activityActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'publish',
]);

/**
 * Activity action type
 */
export type ActivityAction = z.infer<typeof activityActionSchema>;

/**
 * Create Activity Log Schema
 *
 * Used for internal activity logging via POST /api/activity-logs
 */
export const createActivityLogSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  user_id: z.string().min(1, 'User ID is required'),
  action: activityActionSchema,
  resource_type: z.string().min(1, 'Resource type is required'),
  resource_id: z.string().min(1, 'Resource ID is required'),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  timestamp: z.string().datetime().optional(),
});

/**
 * Activity Logs Query Schema
 *
 * GET /api/activity-logs
 */
export const activityLogsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  action: activityActionSchema.optional(),
  resource_type: z.string().optional(),
  user_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  sort_by: z.enum(['timestamp', 'created_at']).optional().default('timestamp'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Resource Activity Logs Query Schema
 *
 * GET /api/activity-logs/resource/[resourceType]/[resourceId]
 */
export const resourceActivityLogsQuerySchema = z.object({
  organization_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * Activity Stats Query Schema
 *
 * GET /api/activity-logs/stats
 */
export const activityStatsQuerySchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

/**
 * Bulk Activity Logs Schema
 *
 * For creating multiple activity logs at once (internal use)
 */
export const bulkCreateActivityLogsSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  logs: z
    .array(
      z.object({
        user_id: z.string().min(1, 'User ID is required'),
        action: activityActionSchema,
        resource_type: z.string().min(1, 'Resource type is required'),
        resource_id: z.string().min(1, 'Resource ID is required'),
        metadata: z.record(z.string(), z.any()).optional().default({}),
      })
    )
    .min(1, 'At least one activity log is required')
    .max(100, 'Cannot create more than 100 logs at once'),
});

/**
 * Log activity helper schema
 *
 * Used by internal functions to log activities
 */
export const logActivitySchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  action: activityActionSchema,
  resourceType: z.string().min(1, 'Resource type is required'),
  resourceId: z.string().min(1, 'Resource ID is required'),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Clean up old activity logs schema
 *
 * DELETE /api/activity-logs/cleanup
 */
export const cleanupActivityLogsSchema = z.object({
  organization_id: z.string().min(1, 'Organization ID is required'),
  older_than_days: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .default(90),
});

/**
 * Schedules API Schemas
 *
 * Zod validation schemas for schedule-related API routes.
 * These endpoints manage scheduled articles with date/status tracking and RLS checks.
 */

import { z } from 'zod';

/**
 * Schedule status types
 */
const scheduleStatusSchema = z.enum([
  'pending',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled',
]);

/**
 * Recurrence types for recurring schedules
 */
const recurrenceTypeSchema = z.enum([
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);

/**
 * Create Schedule Schema
 *
 * POST /api/schedule
 * Creates a new schedule for an article
 */
export const createScheduleSchema = z.object({
  article_id: z.string().uuid('Invalid article ID'),
  scheduled_at: z.string().datetime('Invalid scheduled date'),
  status: scheduleStatusSchema.optional().default('pending'),
  recurrence: recurrenceTypeSchema.optional().default('none'),
  recurrence_end_date: z
    .string()
    .datetime('Invalid recurrence end date')
    .optional(),
  notes: z.string().max(2000, 'Notes are too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update Schedule Schema
 *
 * PUT /api/schedule/:id
 */
export const updateScheduleSchema = z.object({
  article_id: z.string().uuid('Invalid article ID').optional(),
  scheduled_at: z.string().datetime('Invalid scheduled date').optional(),
  status: scheduleStatusSchema.optional(),
  recurrence: recurrenceTypeSchema.optional(),
  recurrence_end_date: z
    .string()
    .datetime('Invalid recurrence end date')
    .optional()
    .nullable(),
  notes: z.string().max(2000, 'Notes are too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schedules Query Schema
 *
 * GET /api/schedule
 */
export const schedulesQuerySchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  status: scheduleStatusSchema.optional(),
  date_from: z.string().datetime('Invalid start date').optional(),
  date_to: z.string().datetime('Invalid end date').optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  sort: z
    .enum(['scheduled_at', 'created_at', 'title', 'status'])
    .optional()
    .default('scheduled_at'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Delete Schedule Schema
 *
 * DELETE /api/schedule
 */
export const deleteScheduleSchema = z.object({
  id: z.string().uuid('Invalid schedule ID'),
});

/**
 * Bulk Update Schedule Schema
 *
 * POST /api/schedule/bulk
 */
export const bulkUpdateSchedulesSchema = z.object({
  schedule_ids: z
    .array(z.string().uuid('Invalid schedule ID'))
    .min(1, 'At least one schedule ID is required')
    .max(50, 'Cannot update more than 50 schedules at once'),
  scheduled_at: z.string().datetime('Invalid scheduled date').optional(),
  status: scheduleStatusSchema.optional(),
  notes: z.string().max(2000, 'Notes are too long').optional(),
});

/**
 * Cancel Schedule Schema
 *
 * POST /api/schedule/cancel
 */
export const cancelScheduleSchema = z.object({
  id: z.string().uuid('Invalid schedule ID'),
  reason: z.string().max(500, 'Reason is too long').optional(),
});

/**
 * Reschedule Schema
 *
 * POST /api/schedule/reschedule
 */
export const rescheduleSchema = z.object({
  id: z.string().uuid('Invalid schedule ID'),
  scheduled_at: z.string().datetime('Invalid scheduled date'),
  reason: z.string().max(500, 'Reason is too long').optional(),
});

/**
 * Drag-Drop Reschedule Schema
 *
 * POST /api/schedule/drag-drop
 * Used for calendar drag-drop scheduling
 */
export const dragDropRescheduleSchema = z.object({
  article_id: z.string().uuid('Invalid article ID'),
  scheduled_at: z.string().datetime('Invalid scheduled date'),
  organization_id: z.string().uuid('Invalid organization ID'),
  source_date: z.string().datetime('Invalid source date').optional(),
});

/**
 * Validate Scheduling Conflicts Schema
 *
 * POST /api/schedule/validate-conflicts
 */
export const validateConflictsSchema = z.object({
  article_id: z.string().uuid('Invalid article ID'),
  scheduled_at: z.string().datetime('Invalid scheduled date'),
  organization_id: z.string().uuid('Invalid organization ID'),
});

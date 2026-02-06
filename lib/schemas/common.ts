/**
 * Common Zod Schemas
 *
 * Reusable schemas that can be shared across multiple API routes.
 */

import { z } from 'zod';

/**
 * Schema for ID parameters (string or number)
 */
export const idSchema = z.union([
  z.string().min(1, 'ID is required'),
  z.number().int().positive(),
]);

/**
 * Schema for user ID
 */
export const userIdSchema = z.string().min(1, 'User ID is required');

/**
 * Schema for organization ID
 */
export const organizationIdSchema = z
  .string()
  .min(1, 'Organization ID is required');

/**
 * Schema for URL parameters
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Schema for email addresses
 */
export const emailSchema = z.string().email('Invalid email format');

/**
 * Schema for boolean strings (common in query params)
 */
export const booleanStringSchema = z
  .string()
  .transform((val) => val === 'true' || val === '1')
  .optional();

/**
 * Schema for enum values with default
 */
export function createEnumSchema<T extends readonly [string, ...string[]]>(
  values: T,
  defaultValue: T[number]
) {
  return z.enum(values).optional().default(defaultValue);
}

/**
 * Schema for timestamps
 */
export const timestampSchema = z
  .union([
    z.string().datetime(),
    z.date(),
    z.number().int().positive(), // Unix timestamp
  ])
  .optional();

/**
 * Schema for metadata objects
 */
export const metadataSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Schema for pagination
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  cursor: z.string().optional(),
});

/**
 * Schema for sorting
 */
export const sortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Schema for search/filter
 */
export const searchSchema = z.object({
  search: z.string().optional(),
  query: z.string().optional(),
});

/**
 * Common API response schemas
 */
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.any().optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
});

/**
 * Schema for webhook signatures
 */
export const webhookSignatureSchemaCommon = z.object({
  signature: z.string().min(1, 'Signature is required'),
  payload: z.any(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

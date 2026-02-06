/**
 * Products Schema
 *
 * Zod validation schemas for product CRUD operations.
 * Ensures consistent validation across all product-related API routes.
 */

import { z } from 'zod';

/**
 * Brand colors schema
 */
export const brandColorsSchema = z.object({
  primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Primary color must be a valid hex color (e.g., #000000)',
  }),
  secondary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Secondary color must be a valid hex color (e.g., #000000)',
  }),
  accent: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Accent color must be a valid hex color (e.g., #000000)',
  }),
  background: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
  text: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional(),
});

/**
 * Tone preferences schema
 */
export const tonePreferencesSchema = z.object({
  tone: z.enum(['professional', 'casual', 'friendly', 'formal'], {
    message: 'Tone must be one of: professional, casual, friendly, formal',
  }),
  voice: z.enum(['first-person', 'second-person', 'third-person'], {
    message: 'Voice must be one of: first-person, second-person, third-person',
  }),
  style: z.string().optional(),
});

/**
 * Analytics config schema
 */
export const analyticsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  tracking_id: z.string().optional(),
  provider: z
    .enum(['google-analytics', 'plausible', 'fathom'])
    .nullable()
    .default(null),
});

/**
 * Product metadata schema
 */
export const productMetadataSchema = z.object({
  logo: z.string().url().optional(),
  favicon: z.string().url().optional(),
  industry: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
});

/**
 * URL validation with optional https:// prefix
 */
const urlWithOptionalProtocol = z
  .string()
  .transform((val, ctx) => {
    if (!val || val.trim() === '') return null;
    try {
      new URL(val.startsWith('http') ? val : `https://${val}`);
      return val.trim();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid URL format',
      });
      return z.NEVER;
    }
  })
  .nullable();

/**
 * Base product schema with common fields
 */
const baseProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must contain only lowercase letters, numbers, and hyphens',
    })
    .max(100, 'Slug must be less than 100 characters'),
  url: urlWithOptionalProtocol,
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  status: z
    .enum(['active', 'archived', 'pending'], {
      message: 'Status must be one of: active, archived, pending',
    })
    .default('active'),
  brand_colors: brandColorsSchema.partial().optional(),
  tone_preferences: tonePreferencesSchema.partial().optional(),
  analytics_config: analyticsConfigSchema.partial().optional(),
  metadata: productMetadataSchema.partial().optional(),
});

/**
 * Create product schema (for POST requests)
 * Validates incoming data for creating a new product
 */
export const createProductSchema = baseProductSchema.extend({
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
      message: 'Primary color must be a valid hex color',
    })
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
      message: 'Secondary color must be a valid hex color',
    })
    .optional(),
  accentColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
      message: 'Accent color must be a valid hex color',
    })
    .optional(),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal']).optional(),
  logoUrl: z.string().url().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Update product schema (for PUT/PATCH requests)
 * All fields are optional for partial updates
 */
export const updateProductSchema = baseProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Product query parameters schema
 * For filtering and searching products
 */
export const productQuerySchema = z.object({
  search: z.string().optional(),
  status: z
    .enum(['active', 'archived', 'pending', 'all'])
    .optional()
    .default('all'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z
    .enum(['name', 'created_at', 'updated_at', 'status'])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ProductQueryParams = z.infer<typeof productQuerySchema>;

/**
 * Product ID schema
 */
export const productIdSchema = z.string().min(1, 'Product ID is required');

/**
 * Bulk operation schema
 */
export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required'),
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;

/**
 * Bulk update schema
 */
export const bulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required'),
  updates: updateProductSchema,
});

export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;

/**
 * Brand Settings Schemas
 * Zod validation schemas for brand settings API routes
 */

import { z } from 'zod';

/**
 * Hex color validation schema
 */
const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format (e.g., #2563eb)',
  })
  .optional();

/**
 * Required hex color validation schema
 */
const requiredHexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format (e.g., #2563eb)',
  });

/**
 * Brand tone validation schema
 */
const brandToneSchema = z.enum([
  'professional',
  'casual',
  'friendly',
  'formal',
  'playful',
  'authoritative',
  'minimalist',
]);

/**
 * Brand style guide schema
 */
const brandStyleGuideSchema = z
  .object({
    typography: z.string().max(2000).optional(),
    imagery: z.string().max(2000).optional(),
    additional: z.string().max(5000).optional(),
  })
  .optional();

/**
 * Brand logo schema
 */
const brandLogoSchema = z
  .object({
    url: z.string().url('Invalid logo URL'),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .optional();

/**
 * Brand colors schema
 */
const brandColorsSchema = z.object({
  primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format (e.g., #2563eb)',
  }),
  secondary: hexColorSchema,
  accent: hexColorSchema,
});

/**
 * Complete brand settings schema
 */
export const brandSettingsSchema = z.object({
  colors: brandColorsSchema,
  tone: brandToneSchema,
  styleGuide: brandStyleGuideSchema,
  logo: brandLogoSchema,
});

/**
 * Brand settings form data schema (for API requests)
 */
export const brandSettingsFormSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Invalid hex color format (e.g., #2563eb)',
  }),
  secondaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  tone: brandToneSchema,
  typography: z.string().max(2000).optional(),
  imagery: z.string().max(2000).optional(),
  additional: z.string().max(5000).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
});

/**
 * Brand settings update schema (partial updates allowed)
 */
export const brandSettingsUpdateSchema = brandSettingsFormSchema.partial();

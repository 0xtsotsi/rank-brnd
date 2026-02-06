/**
 * Images API Schemas
 *
 * Zod validation schemas for image-related API routes.
 */

import { z } from 'zod';

/**
 * Image status types
 */
const imageStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

/**
 * Image format types
 */
const imageFormatSchema = z.enum([
  'jpeg',
  'jpg',
  'png',
  'webp',
  'gif',
  'svg',
  'avif',
  'heic',
  'heif',
]);

/**
 * MIME type validation for images
 */
const imageMimeTypeSchema = z.enum([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
]);

/**
 * Create Image Schema (single)
 *
 * POST /api/images
 */
export const createImageSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  article_id: z.string().uuid('Invalid article ID').optional(),
  url: z.string().url('Invalid image URL'),
  storage_path: z.string().optional(),
  alt_text: z.string().max(500, 'Alt text is too long').optional(),
  caption: z.string().max(1000, 'Caption is too long').optional(),
  title: z.string().max(255, 'Title is too long').optional(),
  description: z.string().max(5000, 'Description is too long').optional(),
  style: z.string().max(100, 'Style is too long').optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  file_size: z.coerce.number().int().nonnegative().optional(),
  mime_type: imageMimeTypeSchema.optional(),
  format: imageFormatSchema.optional(),
  status: imageStatusSchema.optional().default('completed'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Bulk Import Images Schema
 *
 * POST /api/images (bulk mode)
 */
export const bulkImportImagesSchema = z.object({
  bulk: z.literal(true),
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  article_id: z.string().uuid('Invalid article ID').optional(),
  images: z
    .array(
      z.object({
        url: z.string().url('Invalid image URL'),
        alt_text: z.string().optional(),
        caption: z.string().optional(),
        title: z.string().optional(),
        style: z.string().optional(),
        width: z.coerce.number().int().positive().optional(),
        height: z.coerce.number().int().positive().optional(),
        mime_type: z.string().optional(),
        format: z.string().optional(),
      })
    )
    .min(1, 'At least one image is required')
    .max(50, 'Cannot import more than 50 images at once'),
});

/**
 * Single image with bulk field
 */
const singleImageWithBulk = z.object({
  bulk: z.literal(false),
  organization_id: z.string().uuid('Invalid organization ID'),
  product_id: z.string().uuid('Invalid product ID').optional(),
  article_id: z.string().uuid('Invalid article ID').optional(),
  url: z.string().url('Invalid image URL'),
  storage_path: z.string().optional(),
  alt_text: z.string().max(500, 'Alt text is too long').optional(),
  caption: z.string().max(1000, 'Caption is too long').optional(),
  title: z.string().max(255, 'Title is too long').optional(),
  description: z.string().max(5000, 'Description is too long').optional(),
  style: z.string().max(100, 'Style is too long').optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  file_size: z.coerce.number().int().nonnegative().optional(),
  mime_type: imageMimeTypeSchema.optional(),
  format: imageFormatSchema.optional(),
  status: imageStatusSchema.optional().default('completed'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Combined POST schema for images (single or bulk)
 */
export const imagesPostSchema = z.discriminatedUnion('bulk', [
  bulkImportImagesSchema,
  singleImageWithBulk,
]);

/**
 * Images Query Schema
 *
 * GET /api/images
 */
export const imagesQuerySchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID').optional(),
  product_id: z.string().uuid('Invalid product ID').optional(),
  article_id: z.string().uuid('Invalid article ID').optional(),
  status: imageStatusSchema.optional(),
  style: z.string().optional(),
  format: imageFormatSchema.optional(),
  mime_type: imageMimeTypeSchema.optional(),
  search: z.string().optional(),
  sort: z
    .enum([
      'created_at',
      'updated_at',
      'title',
      'url',
      'file_size',
      'width',
      'height',
      'status',
    ])
    .optional()
    .default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * Update Image Schema
 *
 * PATCH /api/images
 */
export const updateImageSchema = z.object({
  id: z.string().uuid('Invalid image ID'),
  url: z.string().url('Invalid image URL').optional(),
  alt_text: z.string().max(500, 'Alt text is too long').optional(),
  caption: z.string().max(1000, 'Caption is too long').optional(),
  title: z.string().max(255, 'Title is too long').optional(),
  description: z.string().max(5000, 'Description is too long').optional(),
  style: z.string().max(100, 'Style is too long').optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
  file_size: z.coerce.number().int().nonnegative().optional(),
  mime_type: imageMimeTypeSchema.optional(),
  format: imageFormatSchema.optional(),
  status: imageStatusSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Link Image Schema
 *
 * POST /api/images/link
 */
export const linkImageSchema = z
  .object({
    image_id: z.string().uuid('Invalid image ID'),
    product_id: z.string().uuid('Invalid product ID').optional(),
    article_id: z.string().uuid('Invalid article ID').optional(),
  })
  .refine(
    (data) => data.product_id || data.article_id,
    'Either product_id or article_id must be provided'
  );

/**
 * Unlink Image Schema
 *
 * POST /api/images/unlink
 */
export const unlinkImageSchema = z.object({
  image_id: z.string().uuid('Invalid image ID'),
  unlink_from: z.enum(['product', 'article', 'both']),
});

/**
 * Delete Image Schema
 *
 * DELETE /api/images
 */
export const deleteImageSchema = z.object({
  id: z.string().uuid('Invalid image ID'),
});

/**
 * Integrations API Schemas
 *
 * Zod validation schemas for integration-related API routes.
 */

import { z } from 'zod';

/**
 * Platform enum schema
 */
const integrationPlatformSchema = z.enum([
  'wordpress',
  'webflow',
  'shopify',
  'ghost',
  'notion',
  'squarespace',
  'wix',
  'contentful',
  'strapi',
  'custom',
]);

/**
 * Integration status enum schema
 */
const integrationStatusSchema = z.enum([
  'active',
  'inactive',
  'error',
  'pending',
  'revoked',
]);

/**
 * Auth type enum schema
 */
const authTypeSchema = z.enum([
  'api_key',
  'oauth',
  'bearer_token',
  'basic_auth',
]);

/**
 * Sync settings schema
 */
const syncSettingsSchema = z.object({
  enabled: z.boolean().optional().default(true),
  interval: z.coerce.number().int().positive().optional(),
  syncContent: z.boolean().optional(),
  syncMedia: z.boolean().optional(),
  syncProducts: z.boolean().optional(),
  syncPages: z.boolean().optional(),
  lastSyncAt: z.string().datetime().optional(),
  nextSyncAt: z.string().datetime().optional(),
});

/**
 * Field mapping schema
 */
const fieldMappingSchema = z.record(z.string(), z.string());

/**
 * Integration config schema
 */
const integrationConfigSchema = z
  .object({
    // WordPress specific
    siteUrl: z.string().url().optional(),
    apiVersion: z.string().optional(),
    // Webflow specific
    siteId: z.string().optional(),
    collectionId: z.string().optional(),
    // Shopify specific
    shopDomain: z.string().optional(),
    // Ghost specific
    adminUrl: z.string().url().optional(),
    // Notion specific
    workspaceId: z.string().optional(),
    databaseId: z.string().optional(),
    // Common fields
    webhookUrl: z.string().url().optional(),
    webhookSecret: z.string().optional(),
    syncSettings: syncSettingsSchema.optional(),
    mapping: fieldMappingSchema.optional(),
  })
  .passthrough();

/**
 * Integration metadata schema
 */
const integrationMetadataSchema = z
  .object({
    version: z.string().optional(),
    connectedBy: z.string().optional(),
    lastVerifiedAt: z.string().datetime().optional(),
    webhookCount: z.coerce.number().int().nonnegative().optional(),
    totalSyncs: z.coerce.number().int().nonnegative().optional(),
  })
  .passthrough();

/**
 * Create Integration Schema
 *
 * POST /api/integrations
 */
export const createIntegrationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  platform: integrationPlatformSchema,
  product_id: z.string().uuid('Invalid product ID').optional(),
  auth_token: z.string().max(5000, 'Auth token is too long').optional(),
  refresh_token: z.string().max(5000, 'Refresh token is too long').optional(),
  auth_type: authTypeSchema.optional().default('api_key'),
  config: integrationConfigSchema.optional(),
  sync_interval_seconds: z.coerce
    .number()
    .int()
    .min(60, 'Sync interval must be at least 60 seconds')
    .max(2592000, 'Sync interval must be at most 30 days (2592000 seconds)')
    .optional(),
});

/**
 * Update Integration Schema
 *
 * PATCH /api/integrations/:id
 */
export const updateIntegrationSchema = z.object({
  id: z.string().uuid('Invalid integration ID'),
  name: z.string().min(1, 'Name is required').max(255).optional(),
  description: z.string().max(1000).optional(),
  auth_token: z.string().max(5000).optional(),
  refresh_token: z.string().max(5000).optional(),
  auth_type: authTypeSchema.optional(),
  config: integrationConfigSchema.optional(),
  sync_interval_seconds: z.coerce
    .number()
    .int()
    .min(60)
    .max(2592000)
    .optional(),
});

/**
 * Update Integration Status Schema
 *
 * PATCH /api/integrations/:id/status
 */
export const updateIntegrationStatusSchema = z.object({
  status: integrationStatusSchema,
});

/**
 * Integrations Query Schema
 *
 * GET /api/integrations
 */
export const integrationsQuerySchema = z.object({
  search: z.string().optional(),
  platform: integrationPlatformSchema
    .or(z.literal('all'))
    .optional()
    .default('all'),
  status: integrationStatusSchema
    .or(z.literal('all'))
    .optional()
    .default('all'),
  product_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

/**
 * Delete Integration Schema
 *
 * DELETE /api/integrations/:id
 */
export const deleteIntegrationSchema = z.object({
  id: z.string().uuid('Invalid integration ID'),
});

/**
 * Test Integration Schema
 *
 * POST /api/integrations/:id/test
 */
export const testIntegrationSchema = z.object({
  testType: z
    .enum(['connection', 'sync', 'webhook'])
    .optional()
    .default('connection'),
});

/**
 * Sync Integration Schema
 *
 * POST /api/integrations/:id/sync
 */
export const syncIntegrationSchema = z.object({
  force: z.boolean().optional().default(false),
});

/**
 * Bulk integration import schema
 */
export const bulkImportIntegrationsSchema = z.object({
  integrations: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        platform: integrationPlatformSchema,
        product_id: z.string().uuid().optional(),
        auth_token: z.string().max(5000).optional(),
        auth_type: authTypeSchema.optional().default('api_key'),
        config: integrationConfigSchema.optional(),
      })
    )
    .min(1, 'At least one integration is required')
    .max(50, 'Cannot import more than 50 integrations at once'),
});

/**
 * Platform config template schema
 * Returns platform-specific configuration requirements
 */
export const platformConfigTemplateSchema = z.object({
  platform: integrationPlatformSchema,
});

// ============================================================================
// Export Types
// ============================================================================

export type IntegrationPlatform = z.infer<typeof integrationPlatformSchema>;
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
export type AuthType = z.infer<typeof authTypeSchema>;
export type IntegrationConfig = z.infer<typeof integrationConfigSchema>;
export type IntegrationMetadata = z.infer<typeof integrationMetadataSchema>;
export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
export type IntegrationsQueryInput = z.infer<typeof integrationsQuerySchema>;

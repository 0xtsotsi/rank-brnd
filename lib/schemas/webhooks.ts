/**
 * Webhook Schemas
 *
 * Validation schemas for webhook management and delivery
 */

import { z } from 'zod';
import {
  idSchema,
  urlSchema,
  metadataSchema,
  paginationSchema,
} from './common';

/**
 * Webhook event types enum
 */
export const webhookEventTypeEnum = z.enum([
  'article.published',
  'article.updated',
  'article.deleted',
  'article.created',
  'keyword.ranking_changed',
  'backlink.status_changed',
  'subscription.updated',
  'organization.updated',
]);

export type WebhookEventType = z.infer<typeof webhookEventTypeEnum>;

/**
 * Webhook status enum
 */
export const webhookStatusEnum = z.enum(['active', 'paused', 'disabled']);

export type WebhookStatus = z.infer<typeof webhookStatusEnum>;

/**
 * Schema for creating a webhook
 */
export const createWebhookSchema = z.object({
  organization_id: idSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  url: urlSchema,
  event_types: z
    .array(webhookEventTypeEnum)
    .min(1, 'At least one event type is required'),
  secret: z
    .string()
    .min(16, 'Secret must be at least 16 characters')
    .optional(),
  status: webhookStatusEnum.optional(),
  headers: z.record(z.string(), z.any()).optional(),
  metadata: metadataSchema,
});

/**
 * Schema for updating a webhook
 */
export const updateWebhookSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(255).optional(),
  url: urlSchema.optional(),
  event_types: z.array(webhookEventTypeEnum).min(1).optional(),
  secret: z.string().min(16).optional(),
  status: webhookStatusEnum.optional(),
  headers: z.record(z.string(), z.any()).optional(),
  metadata: metadataSchema,
});

/**
 * Schema for deleting a webhook
 */
export const deleteWebhookSchema = z.object({
  id: idSchema,
});

/**
 * Schema for querying webhooks
 */
export const queryWebhooksSchema = paginationSchema.merge(
  z.object({
    organization_id: idSchema,
    status: webhookStatusEnum.optional(),
    event_type: webhookEventTypeEnum.optional(),
  })
);

/**
 * Schema for testing a webhook
 */
export const testWebhookSchema = z.object({
  id: idSchema,
  event_type: webhookEventTypeEnum,
  test_payload: z.any().optional(),
});

/**
 * Schema for webhook delivery logs query
 */
export const queryDeliveryLogsSchema = paginationSchema.merge(
  z.object({
    webhook_id: idSchema,
    event_type: webhookEventTypeEnum.optional(),
    success: z.coerce.boolean().optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  })
);

/**
 * Schema for verifying webhook signature
 */
export const webhookSignatureSchema = z.object({
  signature: z.string().min(1, 'Signature is required'),
  timestamp: z.union([z.string(), z.number()]).optional(),
  payload: z.any(),
});

/**
 * Webhook payload schema for article events
 */
export const articleEventPayloadSchema = z.object({
  event_id: z.string(),
  event_type: webhookEventTypeEnum,
  timestamp: z.string().datetime(),
  organization_id: z.string(),
  data: z.object({
    article_id: z.string(),
    title: z.string(),
    slug: z.string(),
    status: z.enum(['draft', 'published', 'archived']),
    published_at: z.string().datetime().nullable(),
    scheduled_at: z.string().datetime().nullable(),
    author_id: z.string(),
    product_id: z.string().nullable(),
    keyword_id: z.string().nullable(),
  }),
});

/**
 * Webhook payload schema for keyword ranking events
 */
export const keywordRankingEventPayloadSchema = z.object({
  event_id: z.string(),
  event_type: z.literal('keyword.ranking_changed'),
  timestamp: z.string().datetime(),
  organization_id: z.string(),
  data: z.object({
    keyword_id: z.string(),
    keyword: z.string(),
    old_ranking: z.number().int().nullable(),
    new_ranking: z.number().int().nullable(),
    change: z.number(),
  }),
});

/**
 * Webhook payload schema for backlink status events
 */
export const backlinkStatusEventPayloadSchema = z.object({
  event_id: z.string(),
  event_type: z.literal('backlink.status_changed'),
  timestamp: z.string().datetime(),
  organization_id: z.string(),
  data: z.object({
    backlink_id: z.string(),
    old_status: z.enum(['pending', 'active', 'rejected', 'expired']).nullable(),
    new_status: z.enum(['pending', 'active', 'rejected', 'expired']),
    url: z.string().url(),
  }),
});

/**
 * Schema for redelivering a webhook
 */
export const redeliverWebhookSchema = z.object({
  delivery_log_id: idSchema,
});

/**
 * Helper type for webhook data
 */
export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  event_types: WebhookEventType[];
  status: WebhookStatus;
  headers: Record<string, string>;
  last_triggered_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Helper type for webhook delivery log
 */
export interface WebhookDeliveryLog {
  id: string;
  webhook_id: string;
  event_type: WebhookEventType;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  delivered_at: string;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
}

/**
 * Helper type for webhook event payload
 */
export interface WebhookEventPayload {
  event_id: string;
  event_type: WebhookEventType;
  timestamp: string;
  organization_id: string;
  data: Record<string, unknown>;
}

/**
 * Supabase Webhook Helpers
 *
 * Functions for managing webhooks and webhook delivery logs
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Webhook,
  WebhookDeliveryLog,
  WebhookEventType,
  WebhookEventPayload,
} from '@/lib/schemas';
import type { Database } from '@/types/database';

/**
 * Result type for database operations
 */
export type DbResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  client: SupabaseClient<Database>,
  data: {
    organization_id: string;
    name: string;
    url: string;
    event_types: WebhookEventType[];
    secret?: string;
    status?: 'active' | 'paused' | 'disabled';
    headers?: Record<string, string>;
    metadata?: Record<string, unknown>;
  }
): Promise<DbResult<Webhook>> {
  const secret = data.secret || generateWebhookSecret();

  const { data: webhook, error } = await (client as any)
    .from('webhooks')
    .insert({
      organization_id: data.organization_id,
      name: data.name,
      url: data.url,
      event_types: data.event_types,
      secret,
      status: data.status || 'active',
      headers: data.headers || {},
      metadata: data.metadata || {},
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: webhook as Webhook };
}

/**
 * Get webhooks for an organization
 */
export async function getOrganizationWebhooks(
  client: SupabaseClient<Database>,
  organizationId: string,
  options?: {
    status?: 'active' | 'paused' | 'disabled';
    event_type?: WebhookEventType;
  }
): Promise<DbResult<Webhook[]>> {
  let query = client
    .from('webhooks')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.event_type) {
    query = query.contains('event_types', [options.event_type]);
  }

  query = query.order('created_at', { ascending: false });

  const { data: webhooks, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: webhooks as Webhook[] };
}

/**
 * Get a webhook by ID
 */
export async function getWebhookById(
  client: SupabaseClient<Database>,
  webhookId: string
): Promise<DbResult<Webhook>> {
  const { data: webhook, error } = await client
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .is('deleted_at', null)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: webhook as Webhook };
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  client: SupabaseClient<Database>,
  webhookId: string,
  updates: Partial<
    Omit<Webhook, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  >
): Promise<DbResult<Webhook>> {
  const { data: webhook, error } = await (client as any)
    .from('webhooks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', webhookId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: webhook as Webhook };
}

/**
 * Delete (soft delete) a webhook
 */
export async function deleteWebhook(
  client: SupabaseClient<Database>,
  webhookId: string
): Promise<DbResult<void>> {
  const { error } = await (client as any)
    .from('webhooks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', webhookId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined };
}

/**
 * Get webhooks that should receive an event
 */
export async function getWebhooksForEvent(
  client: SupabaseClient<Database>,
  organizationId: string,
  eventType: WebhookEventType
): Promise<DbResult<Array<Webhook & { secret: string }>>> {
  const { data: webhooks, error } = await client
    .from('webhooks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .contains('event_types', [eventType])
    .is('deleted_at', null);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: webhooks as Array<Webhook & { secret: string }>,
  };
}

/**
 * Get delivery logs for a webhook
 */
export async function getWebhookDeliveryLogs(
  client: SupabaseClient<Database>,
  webhookId: string,
  options?: {
    event_type?: WebhookEventType;
    success?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<DbResult<WebhookDeliveryLog[]>> {
  let query = client
    .from('webhook_delivery_logs')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('delivered_at', { ascending: false });

  if (options?.event_type) {
    query = query.eq('event_type', options.event_type);
  }

  if (options?.success !== undefined) {
    query = query.eq('success', options.success);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      (options.offset || 0) + (options.limit || 10) - 1
    );
  }

  const { data: logs, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: logs as WebhookDeliveryLog[] };
}

/**
 * Record a webhook delivery attempt
 */
export async function recordWebhookDelivery(
  client: SupabaseClient<Database>,
  data: {
    webhook_id: string;
    event_type: WebhookEventType;
    payload: Record<string, unknown>;
    response_status?: number | null;
    response_body?: string | null;
    success: boolean;
    error_message?: string | null;
    duration_ms?: number | null;
  }
): Promise<DbResult<WebhookDeliveryLog>> {
  // First, insert the delivery log
  const { data: log, error: logError } = await (client as any)
    .from('webhook_delivery_logs')
    .insert({
      webhook_id: data.webhook_id,
      event_type: data.event_type,
      payload: data.payload,
      response_status: data.response_status,
      response_body: data.response_body,
      success: data.success,
      error_message: data.error_message,
      duration_ms: data.duration_ms,
    })
    .select()
    .single();

  if (logError) {
    return { success: false, error: logError.message };
  }

  // Then update webhook stats
  const updateData: {
    last_triggered_at: string;
    last_success_at?: string;
    last_failure_at?: string;
    failure_count?: number;
  } = {
    last_triggered_at: new Date().toISOString(),
  };

  if (data.success) {
    updateData.last_success_at = new Date().toISOString();
    updateData.failure_count = 0;
  } else {
    updateData.last_failure_at = new Date().toISOString();
    // Increment failure count
    const { data: webhook } = await client
      .from('webhooks')
      .select('failure_count')
      .eq('id', data.webhook_id)
      .single();

    updateData.failure_count = ((webhook as any)?.failure_count || 0) + 1;
  }

  await (client as any)
    .from('webhooks')
    .update(updateData)
    .eq('id', data.webhook_id);

  return { success: true, data: log as WebhookDeliveryLog };
}

/**
 * Disable failing webhooks
 */
export async function disableFailingWebhook(
  client: SupabaseClient<Database>,
  webhookId: string,
  failureThreshold: number = 10
): Promise<DbResult<boolean>> {
  const { data: webhook } = await client
    .from('webhooks')
    .select('failure_count, status')
    .eq('id', webhookId)
    .single();

  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  const failureCount = (webhook as any).failure_count || 0;
  const status = (webhook as any).status;

  if (status === 'disabled') {
    return { success: true, data: true };
  }

  if (failureCount >= failureThreshold) {
    await (client as any)
      .from('webhooks')
      .update({ status: 'disabled' })
      .eq('id', webhookId);

    return { success: true, data: true };
  }

  return { success: true, data: false };
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(
  client: SupabaseClient<Database>,
  webhookId: string
): Promise<DbResult<{ secret: string }>> {
  const newSecret = generateWebhookSecret();

  const { error } = await (client as any)
    .from('webhooks')
    .update({ secret: newSecret })
    .eq('id', webhookId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { secret: newSecret } };
}

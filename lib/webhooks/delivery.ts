/**
 * Webhook Delivery Service
 *
 * Handles webhook delivery with HMAC signature verification
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type {
  Webhook,
  WebhookEventType,
  WebhookEventPayload,
} from '@/lib/schemas';
import {
  recordWebhookDelivery,
  disableFailingWebhook,
} from '@/lib/supabase/webhooks';

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
}

/**
 * Create HMAC signature for webhook payload
 *
 * Uses HMAC-SHA256 to sign the payload with the webhook secret
 */
export async function generateHMACSignature(
  payload: string,
  secret: string,
  timestamp: number
): Promise<string> {
  // Create the signed content: timestamp + payload
  const signedContent = `${timestamp}.${payload}`;

  // Convert to UTF-8 bytes
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signedContent);

  // Import the key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert signature to hex
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hashHex}`;
}

/**
 * Verify HMAC signature for incoming webhook
 *
 * This is used when receiving webhooks from external services
 */
export async function verifyHMACSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp?: number
): Promise<boolean> {
  try {
    const expectedSignature = await generateHMACSignature(
      payload,
      secret,
      timestamp || Date.now()
    );

    // Use timing-safe comparison
    return timingSafeEqual(signature, expectedSignature);
  } catch {
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  // Use crypto.subtle.timingSafeEqual if available, otherwise fall back
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  // Simple constant-time comparison
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }

  return result === 0;
}

/**
 * Deliver a webhook to its endpoint
 */
export async function deliverWebhook(
  webhook: Webhook & { secret: string },
  eventType: WebhookEventType,
  payloadData: Record<string, unknown>,
  client: SupabaseClient<Database>
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  const startTime = Date.now();

  // Create the full event payload
  const payload: WebhookEventPayload = {
    event_id: generateEventId(),
    event_type: eventType,
    timestamp: new Date().toISOString(),
    organization_id: webhook.organization_id,
    data: payloadData,
  };

  const payloadString = JSON.stringify(payload);
  const timestamp = Date.now();

  // Generate signature
  const signature = await generateHMACSignature(
    payloadString,
    webhook.secret,
    timestamp
  );

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': eventType,
    'X-Webhook-ID': payload.event_id,
    'X-Webhook-Timestamp': timestamp.toString(),
    'X-Webhook-Signature': signature,
    'User-Agent': 'RankFlow-Webhooks/1.0',
    ...webhook.headers,
  };

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text().catch(() => '');
    const success = response.ok;

    // Record delivery
    await recordWebhookDelivery(client, {
      webhook_id: webhook.id,
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      response_status: response.status,
      response_body: success ? responseText.substring(0, 10000) : undefined,
      success,
      error_message: success ? undefined : `HTTP ${response.status}`,
      duration_ms: duration,
    });

    // Disable webhook if too many failures
    if (!success) {
      await disableFailingWebhook(client, webhook.id);
    }

    return {
      success,
      statusCode: response.status,
      error: success ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Record failed delivery
    await recordWebhookDelivery(client, {
      webhook_id: webhook.id,
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      success: false,
      error_message: errorMessage,
      duration_ms: duration,
    });

    // Disable webhook if too many failures
    await disableFailingWebhook(client, webhook.id);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Trigger webhooks for an event
 *
 * Sends the event payload to all active webhooks configured for the event type
 */
export async function triggerWebhooks(
  client: SupabaseClient<Database>,
  organizationId: string,
  eventType: WebhookEventType,
  payloadData: Record<string, unknown>
): Promise<{ triggered: number; succeeded: number; failed: number }> {
  const { getWebhooksForEvent } = await import('@/lib/supabase/webhooks');

  const webhooksResult = await getWebhooksForEvent(
    client,
    organizationId,
    eventType
  );

  if (!webhooksResult.success || webhooksResult.data.length === 0) {
    return { triggered: 0, succeeded: 0, failed: 0 };
  }

  const webhooks = webhooksResult.data;
  let succeeded = 0;
  let failed = 0;

  // Deliver to all webhooks in parallel
  await Promise.all(
    webhooks.map(async (webhook) => {
      const result = await deliverWebhook(
        webhook,
        eventType,
        payloadData,
        client
      );
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    })
  );

  return {
    triggered: webhooks.length,
    succeeded,
    failed,
  };
}

/**
 * Retry a failed webhook delivery
 */
export async function retryWebhookDelivery(
  client: SupabaseClient<Database>,
  deliveryLogId: string
): Promise<{ success: boolean; error?: string }> {
  // Get the delivery log
  const { data: log, error } = await client
    .from('webhook_delivery_logs')
    .select('*, webhooks(*)')
    .eq('id', deliveryLogId)
    .single();

  if (error || !log) {
    return { success: false, error: 'Delivery log not found' };
  }

  const webhook = (log as any).webhooks as Webhook & { secret: string };
  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  // Redeliver
  const result = await deliverWebhook(
    webhook,
    (log as any).event_type as WebhookEventType,
    (log as any).payload as Record<string, unknown>,
    client
  );

  return result;
}

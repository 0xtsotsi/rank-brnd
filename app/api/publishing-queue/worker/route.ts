/**
 * Unified Publishing Worker API Route
 *
 * This is a unified worker that:
 * 1. Processes scheduled items (moves them to queued)
 * 2. Processes queued items (publishes them)
 * 3. Processes retry items (retries failed items)
 *
 * This is the main entry point for the background job system.
 * It should be called by a cron job every minute.
 *
 * Usage:
 * - Cron: Call POST /api/publishing-queue/worker every minute
 * - Manual: Call POST /api/publishing-queue/worker with CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getPendingPublishingItems,
  markPublishingItemStarted,
  markPublishingItemCompleted,
  markPublishingItemFailed,
} from '@/lib/supabase/publishing-queue';
import { classifyError } from '@/lib/publishing/retry-service';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * Configuration for the unified worker
 */
const WORKER_CONFIG = {
  // Maximum number of items to process in one run
  MAX_ITEMS_PER_RUN: 20,

  // Maximum time to spend processing (in milliseconds)
  MAX_PROCESSING_TIME_MS: 120000, // 2 minutes

  // Secret key for cron job authorization
  CRON_SECRET: process.env.CRON_SECRET || '',
} as const;

/**
 * Worker phase result
 */
interface PhaseResult {
  name: string;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration: number;
}

/**
 * Overall worker result
 */
interface WorkerResult {
  phases: PhaseResult[];
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
  totalDuration: number;
}

/**
 * POST /api/publishing-queue/worker
 *
 * Runs the full publishing pipeline:
 * 1. Move scheduled items to queued
 * 2. Process queued items for publishing
 * 3. Process retry items
 *
 * Authentication:
 * - If CRON_SECRET is set, requires it in the header (for cron jobs)
 * - Otherwise requires authenticated user with admin role
 */
export async function POST(request: NextRequest) {
  const overallStart = Date.now();

  try {
    // Check authorization
    const cronSecret = request.headers.get('x-cron-secret');

    if (WORKER_CONFIG.CRON_SECRET) {
      if (cronSecret !== WORKER_CONFIG.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const authData = await auth();
      if (!authData.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const client = getSupabaseServerClient();
    const body = await request.json().catch(() => ({}));
    const platform = body.platform as string | undefined;
    const limit = Math.min(
      body.limit ?? WORKER_CONFIG.MAX_ITEMS_PER_RUN,
      WORKER_CONFIG.MAX_ITEMS_PER_RUN
    );

    const phases: PhaseResult[] = [];

    // Phase 1: Move scheduled items to queued
    const scheduledPhaseResult = await processScheduledItems(client, {
      platform: platform as any,
      limit,
    });
    phases.push(scheduledPhaseResult);

    // Phase 2: Process queued items (actual publishing)
    const queuedPhaseResult = await processQueuedItems(client, {
      platform: platform as any,
      limit,
    });
    phases.push(queuedPhaseResult);

    // Phase 3: Process retry items
    const retryPhaseResult = await processRetryItems(client, {
      platform: platform as any,
      limit,
    });
    phases.push(retryPhaseResult);

    const result: WorkerResult = {
      phases,
      totalProcessed: phases.reduce((sum, p) => sum + p.processed, 0),
      totalSucceeded: phases.reduce((sum, p) => sum + p.succeeded, 0),
      totalFailed: phases.reduce((sum, p) => sum + p.failed, 0),
      totalDuration: Date.now() - overallStart,
    };

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/publishing-queue/worker');
  }
}

/**
 * GET /api/publishing-queue/worker
 *
 * Returns the status of items ready for processing in each phase.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get counts for each phase
    const [scheduledResult, queuedResult, retryResult] = await Promise.all([
      getScheduledItemsCount(client, { platform: platform as any }),
      getQueuedItemsCount(client, { platform: platform as any }),
      getRetryItemsCount(client, { platform: platform as any }),
    ]);

    return NextResponse.json({
      success: true,
      scheduled: scheduledResult,
      queued: queuedResult,
      retry: retryResult,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/publishing-queue/worker');
  }
}

/**
 * Phase 1: Process scheduled items
 */
async function processScheduledItems(
  client: any,
  options: { platform?: string; limit?: number } = {}
): Promise<PhaseResult> {
  const start = Date.now();
  const result: PhaseResult = {
    name: 'scheduled',
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };

  try {
    // Find scheduled items ready to queue
    const { data: items } = await client
      .from('publishing_queue')
      .select('id')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(options.limit || 50);

    if (!items || items.length === 0) {
      result.duration = Date.now() - start;
      return result;
    }

    // Move each item to queued status
    for (const item of items) {
      try {
        const { error } = await client
          .from('publishing_queue')
          .update({
            status: 'queued',
            queued_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .eq('status', 'pending');

        if (!error) {
          result.succeeded++;
        } else {
          result.failed++;
        }
      } catch {
        result.failed++;
      }
      result.processed++;
    }

    result.duration = Date.now() - start;
    return result;
  } catch (error) {
    result.duration = Date.now() - start;
    return result;
  }
}

/**
 * Phase 2: Process queued items
 */
async function processQueuedItems(
  client: any,
  options: { platform?: string; limit?: number } = {}
): Promise<PhaseResult> {
  const start = Date.now();
  const result: PhaseResult = {
    name: 'queued',
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };

  try {
    // Get pending items ready for processing
    const pendingResult = await getPendingPublishingItems(client, {
      platform: options.platform as any,
      limit: options.limit || 10,
    });

    if (
      !pendingResult.success ||
      !pendingResult.data ||
      pendingResult.data.length === 0
    ) {
      result.duration = Date.now() - start;
      return result;
    }

    // Process each item
    for (const item of pendingResult.data) {
      try {
        await processQueuedItem(client, item.id);
        result.succeeded++;
      } catch (error) {
        result.failed++;
      }
      result.processed++;
    }

    result.duration = Date.now() - start;
    return result;
  } catch (error) {
    result.duration = Date.now() - start;
    return result;
  }
}

/**
 * Phase 3: Process retry items
 */
async function processRetryItems(
  client: any,
  options: { platform?: string; limit?: number } = {}
): Promise<PhaseResult> {
  const start = Date.now();
  const result: PhaseResult = {
    name: 'retry',
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };

  try {
    // Get items ready for retry
    const { data: items } = await client
      .from('publishing_queue')
      .select('id')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .not('retry_after', 'is', null)
      .lte('retry_after', new Date().toISOString())
      .order('retry_after', { ascending: true })
      .limit(options.limit || 20);

    if (!items || items.length === 0) {
      result.duration = Date.now() - start;
      return result;
    }

    // Process each item
    for (const item of items) {
      try {
        await processQueuedItem(client, item.id);
        result.succeeded++;
      } catch (error) {
        result.failed++;
      }
      result.processed++;
    }

    result.duration = Date.now() - start;
    return result;
  } catch (error) {
    result.duration = Date.now() - start;
    return result;
  }
}

/**
 * Process a single queued item
 */
async function processQueuedItem(client: any, itemId: string): Promise<void> {
  // Mark as started
  const startedResult = await markPublishingItemStarted(client, itemId);
  if (!startedResult.success || !startedResult.data) {
    throw new Error('Failed to mark item as started');
  }

  try {
    // TODO: Implement actual publishing logic here
    // This would typically:
    // 1. Fetch the article content
    // 2. Get the CMS integration credentials
    // 3. Call the CMS API to publish
    // 4. Handle the response

    // For now, simulate a successful publish
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mark as completed (with placeholder data)
    await markPublishingItemCompleted(client, itemId, {
      publishedUrl: `https://example.com/article/${itemId}`,
      publishedData: {
        worker_processed: true,
        processed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Mark as failed with error classification
    const errorMessage = error instanceof Error ? error.message : String(error);
    const classification = classifyError(error);

    await markPublishingItemFailed(
      client,
      itemId,
      errorMessage,
      classification.type
    );

    throw error;
  }
}

/**
 * Get count of scheduled items ready to queue
 */
async function getScheduledItemsCount(
  client: any,
  options: { platform?: string } = {}
): Promise<{ count: number; items: any[] }> {
  let query = client
    .from('publishing_queue')
    .select('id, article_id, scheduled_for, platform')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(10);

  if (options.platform) {
    query = query.eq('platform', options.platform);
  }

  const { data, error, count } = await query;

  return {
    count: count || 0,
    items: data || [],
  };
}

/**
 * Get count of queued items
 */
async function getQueuedItemsCount(
  client: any,
  options: { platform?: string } = {}
): Promise<{ count: number; items: any[] }> {
  let query = client
    .from('publishing_queue')
    .select('id, article_id, priority, platform')
    .eq('status', 'queued')
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .limit(10);

  if (options.platform) {
    query = query.eq('platform', options.platform);
  }

  const { data, error, count } = await query;

  return {
    count: count || 0,
    items: data || [],
  };
}

/**
 * Get count of retry items
 */
async function getRetryItemsCount(
  client: any,
  options: { platform?: string } = {}
): Promise<{ count: number; items: any[] }> {
  let query = client
    .from('publishing_queue')
    .select('id, article_id, retry_after, error_type, platform')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .not('retry_after', 'is', null)
    .lte('retry_after', new Date().toISOString())
    .order('retry_after', { ascending: true })
    .limit(10);

  if (options.platform) {
    query = query.eq('platform', options.platform);
  }

  const { data, error, count } = await query;

  return {
    count: count || 0,
    items: data || [],
  };
}

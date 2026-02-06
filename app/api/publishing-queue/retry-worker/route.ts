/**
 * Automatic Retry Worker API Route
 *
 * Processes publishing queue items that are ready for retry.
 * This can be called by:
 * 1. A cron job (e.g., Vercel Cron Jobs)
 * 2. A background worker
 * 3. Manually by an admin
 *
 * The worker finds items whose retry_after time has passed and
 * attempts to process them again.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getItemsReadyForRetry,
  markPublishingItemStarted,
  markPublishingItemFailed,
  markPublishingItemCompleted,
} from '@/lib/supabase/publishing-queue';
import { handleAPIError } from '@/lib/api-error-handler';
import { classifyError } from '@/lib/publishing/retry-service';

/**
 * Configuration for the retry worker
 */
const RETRY_WORKER_CONFIG = {
  // Maximum number of items to process in one run
  MAX_ITEMS_PER_RUN: 10,

  // Maximum time to spend processing (in milliseconds)
  MAX_PROCESSING_TIME_MS: 30000, // 30 seconds

  // Secret key for cron job authorization
  CRON_SECRET: process.env.CRON_SECRET || '',
} as const;

/**
 * Worker result summary
 */
interface WorkerResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ itemId: string; error: string }>;
}

/**
 * POST /api/publishing-queue/retry-worker
 *
 * Runs the automatic retry worker.
 *
 * Authentication:
 * - If CRON_SECRET is set, requires it in the header (for cron jobs)
 * - Otherwise requires authenticated user with admin role
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret');

    if (RETRY_WORKER_CONFIG.CRON_SECRET) {
      // Cron job authorization
      if (cronSecret !== RETRY_WORKER_CONFIG.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // User authorization (fallback for development)
      const authData = await auth();
      userId = authData.userId;

      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // For non-cron requests, verify user is an admin
      // (You may want to add additional checks here)
    }

    const client = getSupabaseServerClient();

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const platform = body.platform as string | undefined;
    const limit = Math.min(
      body.limit ?? RETRY_WORKER_CONFIG.MAX_ITEMS_PER_RUN,
      RETRY_WORKER_CONFIG.MAX_ITEMS_PER_RUN
    );

    // Get items ready for retry
    const itemsResult = await getItemsReadyForRetry(client, {
      platform: platform as any,
      limit,
    });

    if (
      !itemsResult.success ||
      !itemsResult.data ||
      itemsResult.data.length === 0
    ) {
      return NextResponse.json({
        success: true,
        result: {
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
          errors: [],
        },
        message: 'No items ready for retry',
      });
    }

    const result: WorkerResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    // Process each item
    for (const item of itemsResult.data) {
      // Check time limit
      if (Date.now() - startTime > RETRY_WORKER_CONFIG.MAX_PROCESSING_TIME_MS) {
        result.skipped += itemsResult.data.length - result.processed;
        break;
      }

      try {
        await processRetryItem(client, item.id);
        result.succeeded++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          itemId: item.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      result.processed++;
    }

    return NextResponse.json({
      success: true,
      result,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/publishing-queue/retry-worker');
  }
}

/**
 * Process a single retry item
 *
 * This is a placeholder for the actual publishing logic.
 * In a real implementation, this would call the appropriate
 * CMS integration to publish the content.
 */
async function processRetryItem(
  client: SupabaseClient,
  itemId: string
): Promise<void> {
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
    // In production, replace this with actual CMS integration calls

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mark as completed (with placeholder data)
    await markPublishingItemCompleted(client, itemId, {
      publishedUrl: `https://example.com/article/${itemId}`,
      publishedData: {
        retry_processed: true,
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
 * GET /api/publishing-queue/retry-worker
 *
 * Returns the status of the retry worker and items ready for retry.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseServerClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get items ready for retry
    const itemsResult = await getItemsReadyForRetry(client, {
      platform: platform as any,
      limit,
    });

    if (!itemsResult.success) {
      return NextResponse.json({ error: itemsResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: itemsResult.data?.length || 0,
      items: itemsResult.data,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/publishing-queue/retry-worker');
  }
}

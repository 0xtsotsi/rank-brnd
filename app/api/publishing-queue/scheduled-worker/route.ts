/**
 * Scheduled Publishing Worker API Route
 *
 * Processes publishing queue items that are scheduled for publishing.
 * This worker:
 * 1. Finds items whose scheduled_for time has passed
 * 2. Moves them from 'pending' to 'queued' status
 * 3. Triggers the publishing process
 *
 * This can be called by:
 * 1. A cron job (e.g., Vercel Cron Jobs)
 * 2. A background worker
 * 3. Manually by an admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * Configuration for the scheduled worker
 */
const SCHEDULED_WORKER_CONFIG = {
  // Maximum number of items to process in one run
  MAX_ITEMS_PER_RUN: 50,

  // Maximum time to spend processing (in milliseconds)
  MAX_PROCESSING_TIME_MS: 60000, // 60 seconds

  // Secret key for cron job authorization
  CRON_SECRET: process.env.CRON_SECRET || '',
} as const;

/**
 * Worker result summary
 */
interface WorkerResult {
  processed: number;
  queued: number;
  skipped: number;
  errors: Array<{ itemId: string; error: string }>;
}

/**
 * POST /api/publishing-queue/scheduled-worker
 *
 * Runs the scheduled publishing worker.
 *
 * Finds items where:
 * - status is 'pending'
 * - scheduled_for is not null
 * - scheduled_for <= NOW()
 *
 * And moves them to 'queued' status for processing.
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
    const cronSecret = request.headers.get('x-cron-secret');

    if (SCHEDULED_WORKER_CONFIG.CRON_SECRET) {
      // Cron job authorization
      if (cronSecret !== SCHEDULED_WORKER_CONFIG.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // User authorization (fallback for development)
      const authData = await auth();
      userId = authData.userId;

      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const client = getSupabaseServerClient();

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const platform = body.platform as string | undefined;
    const limit = Math.min(
      body.limit ?? SCHEDULED_WORKER_CONFIG.MAX_ITEMS_PER_RUN,
      SCHEDULED_WORKER_CONFIG.MAX_ITEMS_PER_RUN
    );

    // Find scheduled items that are ready to be queued
    const result = await findScheduledItemsReadyToQueue(client, {
      platform: platform as any,
      limit,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const items = result.data || [];

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        result: {
          processed: 0,
          queued: 0,
          skipped: 0,
          errors: [],
        },
        message: 'No scheduled items ready for publishing',
      });
    }

    const workerResult: WorkerResult = {
      processed: 0,
      queued: 0,
      skipped: 0,
      errors: [],
    };

    // Process each item
    for (const item of items) {
      // Check time limit
      if (
        Date.now() - startTime >
        SCHEDULED_WORKER_CONFIG.MAX_PROCESSING_TIME_MS
      ) {
        workerResult.skipped += items.length - workerResult.processed;
        break;
      }

      try {
        const queued = await queueScheduledItem(client, item.id);
        if (queued) {
          workerResult.queued++;
        }
      } catch (error) {
        workerResult.errors.push({
          itemId: item.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      workerResult.processed++;
    }

    return NextResponse.json({
      success: true,
      result: workerResult,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/publishing-queue/scheduled-worker');
  }
}

/**
 * GET /api/publishing-queue/scheduled-worker
 *
 * Returns the status of scheduled items that are ready to be published.
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

    // Get scheduled items ready to queue
    const itemsResult = await findScheduledItemsReadyToQueue(client, {
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
    return handleAPIError(error, 'GET /api/publishing-queue/scheduled-worker');
  }
}

/**
 * Find scheduled items that are ready to be queued
 */
async function findScheduledItemsReadyToQueue(
  client: any,
  options: {
    platform?: string;
    limit?: number;
  } = {}
) {
  try {
    let query = client
      .from('publishing_queue')
      .select('id, article_id, organization_id, platform, scheduled_for')
      .eq('status', 'pending')
      .is('deleted_at', null)
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', new Date().toISOString());

    if (options.platform) {
      query = query.eq('platform', options.platform);
    }

    query = query.order('scheduled_for', { ascending: true });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Queue a scheduled item for publishing
 */
async function queueScheduledItem(
  client: any,
  itemId: string
): Promise<boolean> {
  try {
    const { error } = await client
      .from('publishing_queue')
      .update({
        status: 'queued',
        queued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('status', 'pending');

    if (error) throw error;

    return true;
  } catch {
    return false;
  }
}

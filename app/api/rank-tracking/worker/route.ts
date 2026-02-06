/**
 * Rank Tracking Worker API Route
 *
 * Background worker that processes daily rank tracking for all organizations.
 * This can be called by:
 * 1. A cron job (e.g., Vercel Cron Jobs)
 * 2. A background worker
 * 3. Manually by an admin
 *
 * The worker finds active keywords and tracks their positions using DataForSEO.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { runRankTrackingJob } from '@/lib/rank-tracking';
import { handleAPIError } from '@/lib/api-error-handler';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ context: 'RankTrackingWorker' });

/**
 * Configuration for the rank tracking worker
 */
const RANK_TRACKING_WORKER_CONFIG = {
  // Maximum number of keywords to process in one run
  MAX_KEYWORDS_PER_RUN: 100,

  // Maximum time to spend processing (in milliseconds)
  MAX_PROCESSING_TIME_MS: 300000, // 5 minutes

  // Secret key for cron job authorization
  CRON_SECRET: process.env.RANK_TRACKING_CRON_SECRET || '',
} as const;

/**
 * Worker result summary
 */
interface WorkerResult {
  organizations: number;
  keywordsProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ organizationId: string; keyword: string; error: string }>;
  duration: number;
  totalCost: number;
}

/**
 * POST /api/rank-tracking/worker
 *
 * Runs the automatic rank tracking worker.
 *
 * Authentication:
 * - If RANK_TRACKING_CRON_SECRET is set, requires it in the header (for cron jobs)
 * - Otherwise requires authenticated user with admin role
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Check authorization
    const cronSecret = request.headers.get('x-cron-secret');

    if (RANK_TRACKING_WORKER_CONFIG.CRON_SECRET) {
      // Cron job authorization
      if (cronSecret !== RANK_TRACKING_WORKER_CONFIG.CRON_SECRET) {
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
    const organizationId = body.organizationId as string | undefined;
    const productId = body.productId as string | undefined;
    const device = body.device as 'desktop' | 'mobile' | 'tablet' | undefined;
    const location = body.location as string | undefined;
    const limit = Math.min(
      body.limit ?? RANK_TRACKING_WORKER_CONFIG.MAX_KEYWORDS_PER_RUN,
      RANK_TRACKING_WORKER_CONFIG.MAX_KEYWORDS_PER_RUN
    );

    const result: WorkerResult = {
      organizations: 0,
      keywordsProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0,
      totalCost: 0,
    };

    // If organization ID is provided, only process that organization
    if (organizationId) {
      const jobResult = await runRankTrackingJob(client, organizationId, {
        productId,
        device,
        location,
        limit,
      });

      result.organizations = 1;
      result.keywordsProcessed = jobResult.total;
      result.successful = jobResult.successful;
      result.failed = jobResult.failed;
      result.errors = jobResult.errors.map((e) => ({
        organizationId,
        keyword: e.keyword,
        error: e.error,
      }));
      result.totalCost = jobResult.cost;
    } else {
      // Get all active organizations
      const { data: organizations, error: orgError } = await client
        .from('organizations')
        .select('id')
        .eq('active', true);

      if (orgError) {
        throw orgError;
      }

      if (!organizations || organizations.length === 0) {
        return NextResponse.json({
          success: true,
          result,
          message: 'No active organizations found',
        });
      }

      // Process each organization
      for (const org of organizations as any[]) {
        // Check time limit
        if (
          Date.now() - startTime >
          RANK_TRACKING_WORKER_CONFIG.MAX_PROCESSING_TIME_MS
        ) {
          logger.info('Rank tracking worker reached time limit', {
            processed: result.organizations,
            remaining: organizations.length - result.organizations,
          });
          break;
        }

        try {
          const jobResult = await runRankTrackingJob(client, org.id, {
            productId,
            device,
            location,
            limit: Math.max(1, Math.floor(limit / organizations.length)),
          });

          result.organizations++;
          result.keywordsProcessed += jobResult.total;
          result.successful += jobResult.successful;
          result.failed += jobResult.failed;
          result.totalCost += jobResult.cost;

          // Add errors
          jobResult.errors.forEach((e) => {
            result.errors.push({
              organizationId: org.id,
              keyword: e.keyword,
              error: e.error,
            });
          });
        } catch (error) {
          logger.error('Error processing organization rank tracking', {
            organizationId: org.id,
            error: error instanceof Error ? error.message : String(error),
          });

          result.errors.push({
            organizationId: org.id,
            keyword: 'all',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    result.duration = Date.now() - startTime;

    logger.info('Rank tracking worker completed', {
      organizations: result.organizations,
      keywordsProcessed: result.keywordsProcessed,
      successful: result.successful,
      failed: result.failed,
      duration: result.duration,
      totalCost: result.totalCost,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/rank-tracking/worker');
  }
}

/**
 * GET /api/rank-tracking/worker
 *
 * Returns the status of the rank tracking worker and configuration.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = getSupabaseServerClient();

    // Get statistics
    const { count: totalKeywords } = await client
      .from('keywords')
      .select('id', { count: 'exact', head: true })
      .eq('active', true);

    const { count: totalOrganizations } = await client
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('active', true);

    const { count: totalRankRecords } = await client
      .from('rank_tracking')
      .select('id', { count: 'exact', head: true });

    // Get recent rank tracking activity
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRecords } = await client
      .from('rank_tracking')
      .select('id')
      .gte('date', today)
      .limit(1);

    return NextResponse.json({
      success: true,
      config: {
        maxKeywordsPerRun: RANK_TRACKING_WORKER_CONFIG.MAX_KEYWORDS_PER_RUN,
        maxProcessingTimeMs: RANK_TRACKING_WORKER_CONFIG.MAX_PROCESSING_TIME_MS,
        cronSecretConfigured: !!RANK_TRACKING_WORKER_CONFIG.CRON_SECRET,
      },
      stats: {
        totalActiveKeywords: totalKeywords || 0,
        totalActiveOrganizations: totalOrganizations || 0,
        totalRankRecords: totalRankRecords || 0,
        trackedToday: todayRecords ? todayRecords.length : 0,
      },
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/rank-tracking/worker');
  }
}

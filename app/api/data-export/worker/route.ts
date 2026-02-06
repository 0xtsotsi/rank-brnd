/**
 * Data Export Worker API Route
 *
 * POST /api/data-export/worker - Process pending data exports (background worker)
 *
 * This endpoint should be called by a cron job or background job scheduler
 * to process pending export requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getPendingDataExports,
  markExportAsProcessing,
  markExportAsCompleted,
  markExportAsFailed,
} from '@/lib/data-export';
import {
  generateExport,
  calculateExportSize,
  generateExportFilename,
} from '@/lib/data-export';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

// Cron secret for authentication
const WORKER_SECRET = process.env.DATA_EXPORT_WORKER_SECRET;

/**
 * POST /api/data-export/worker
 * Process pending data exports
 *
 * This is a background worker that:
 * 1. Fetches pending exports
 * 2. Generates the export file
 * 3. Uploads to storage (or stores as base64 for smaller exports)
 * 4. Marks the export as completed
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate with worker secret
    const authHeader = request.headers.get('authorization');
    if (!WORKER_SECRET) {
      return NextResponse.json(
        { error: 'Worker not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${WORKER_SECRET}`) {
      // Also check for Clerk auth for testing purposes
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const client = getSupabaseServerClient();

    // Get pending exports (limit to 5 at a time)
    const pendingResult = await getPendingDataExports(client, 5);
    if (!pendingResult.success) {
      return NextResponse.json({ error: pendingResult.error }, { status: 500 });
    }

    const pendingExports = pendingResult.data;

    if (pendingExports.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending exports to process',
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      completed: [],
      failed: [] as Array<{ id: string; error: string }>,
    };

    // Process each export
    for (const exportItem of pendingExports) {
      try {
        // Mark as processing
        const markResult = await markExportAsProcessing(client, exportItem.id);
        if (!markResult.success || !markResult.data) {
          continue; // Skip if already being processed
        }

        // Generate the export data
        const { data: exportData, recordCount } = await generateExport(
          client,
          exportItem.organization_id,
          exportItem.format as 'json' | 'csv',
          exportItem.requested_tables as any,
          exportItem.include_deleted
        );

        // Calculate file size
        const fileSizeBytes = calculateExportSize(exportData);

        // In production, upload to storage and get a signed URL
        // For now, we'll store as base64 in the database (for smaller exports)
        // or you can integrate with your storage service

        // Get organization slug for filename
        const { data: org } = await (client as any)
          .from('organizations')
          .select('slug')
          .eq('id', exportItem.organization_id)
          .single();

        const orgSlug = org?.slug || 'organization';
        const filename = generateExportFilename(
          orgSlug,
          exportItem.format as any
        );

        // TODO: Upload to storage and get signed URL
        // For now, we'll create a data URL (not recommended for production)
        const fileUrl = `data:application/${exportItem.format};base64,${Buffer.from(exportData).toString('base64')}`;

        // Mark as completed
        const completeResult = await markExportAsCompleted(
          client,
          exportItem.id,
          {
            fileUrl,
            fileSizeBytes,
            recordCount,
          }
        );

        if (completeResult.success) {
          (results.completed as string[]).push(exportItem.id);
          results.processed++;
        } else {
          throw new Error(completeResult.error);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Mark as failed
        await markExportAsFailed(client, exportItem.id, errorMessage);
        results.failed.push({ id: exportItem.id, error: errorMessage });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    return handleAPIError(error, 'POST /api/data-export/worker');
  }
}

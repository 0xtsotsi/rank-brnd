/**
 * Data Export Status API Route
 *
 * GET /api/data-export/[id] - Get the status of a data export
 * DELETE /api/data-export/[id] - Cancel/delete a data export
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getDataExportById,
  canAccessDataExport,
  deleteDataExport,
  markExportAsFailed,
} from '@/lib/data-export';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/data-export/[id]
 * Get the status of a data export
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = getSupabaseServerClient();

    // Check if user can access this export
    const hasAccess = await canAccessDataExport(client, id, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this export' },
        { status: 403 }
      );
    }

    const result = await getDataExportById(client, id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'GET /api/data-export/[id]');
  }
}

/**
 * DELETE /api/data-export/[id]
 * Cancel or delete a data export
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = getSupabaseServerClient();

    // Get the export to check ownership
    const exportResult = await getDataExportById(client, id);
    if (!exportResult.success) {
      return NextResponse.json({ error: exportResult.error }, { status: 404 });
    }

    const dataExport = exportResult.data;

    // Check if user is the owner (the one who requested it)
    if (dataExport.user_id !== userId) {
      return NextResponse.json(
        { error: 'You can only cancel your own exports' },
        { status: 403 }
      );
    }

    // Only allow cancelling pending or processing exports
    if (dataExport.status === 'pending' || dataExport.status === 'processing') {
      // Mark as failed with cancellation message
      const cancelResult = await markExportAsFailed(
        client,
        id,
        'Export was cancelled by the user'
      );

      if (!cancelResult.success) {
        return NextResponse.json(
          { error: cancelResult.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Export cancelled successfully',
      });
    }

    // For completed or failed exports, permanently delete
    const deleteResult = await deleteDataExport(client, id);
    if (!deleteResult.success) {
      return NextResponse.json({ error: deleteResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Export deleted successfully',
    });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/data-export/[id]');
  }
}

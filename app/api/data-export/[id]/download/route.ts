/**
 * Data Export Download API Route
 *
 * GET /api/data-export/[id]/download - Download a completed data export
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDataExportById, canAccessDataExport } from '@/lib/data-export';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/data-export/[id]/download
 * Download a completed data export file
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

    // Get the export
    const exportResult = await getDataExportById(client, id);
    if (!exportResult.success) {
      return NextResponse.json({ error: exportResult.error }, { status: 404 });
    }

    const dataExport = exportResult.data;

    // Check if export is completed
    if (dataExport.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Export is not ready for download',
          status: dataExport.status,
        },
        { status: 400 }
      );
    }

    // Check if export has expired
    if (dataExport.expires_at && new Date(dataExport.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Export has expired' },
        { status: 410 }
      );
    }

    // Check if file URL exists
    if (!dataExport.file_url) {
      return NextResponse.json(
        { error: 'Export file not found' },
        { status: 404 }
      );
    }

    // Fetch the export data from storage or return the URL
    // For now, we'll return the URL since the actual file would be in storage
    // In production, you might want to proxy the file through this endpoint
    return NextResponse.json({
      download_url: dataExport.file_url,
      filename: `gdpr-export-${dataExport.id}.${dataExport.format}`,
      size_bytes: dataExport.file_size_bytes,
      record_count: dataExport.record_count,
      expires_at: dataExport.expires_at,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/data-export/[id]/download');
  }
}

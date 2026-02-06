/**
 * Data Export API Routes
 *
 * POST /api/data-export - Request a new data export
 * GET /api/data-export - List data exports for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  requestDataExportSchema,
  exportListQuerySchema,
  validateRequest,
} from '@/lib/schemas';
import {
  requestDataExport,
  getOrganizationDataExports,
  getDataExportStats,
} from '@/lib/data-export';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/data-export
 * Request a new data export
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, requestDataExportSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member, error: memberError } = await (client as any)
      .from('organization_members')
      .select('role')
      .eq('organization_id', validationResult.data.organization_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Only owners, admins, and members can request exports
    if (!['owner', 'admin', 'member'].includes(member.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to export data' },
        { status: 403 }
      );
    }

    const result = await requestDataExport(
      client,
      validationResult.data.organization_id,
      userId,
      validationResult.data.format as 'json' | 'csv',
      {
        requestedTables: validationResult.data.requested_tables as any,
        includeDeleted: validationResult.data.include_deleted,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'POST /api/data-export');
  }
}

/**
 * GET /api/data-export
 * List data exports for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryValidation = validateRequest(
      Object.fromEntries(searchParams),
      exportListQuerySchema
    );

    if (!queryValidation.success) {
      return NextResponse.json(queryValidation.error, { status: 400 });
    }

    const query = queryValidation.data || {};

    // Get organization_id from query
    const organizationId = searchParams.get('organization_id');
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await (client as any)
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    const result = await getOrganizationDataExports(client, organizationId, {
      includeExpired: (query as any).include_expired,
      status: (query as any).status,
      format: (query as any).format,
      limit: (query as any).limit,
      offset: (query as any).offset,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Get stats
    const statsResult = await getDataExportStats(client, organizationId);

    return NextResponse.json({
      exports: result.data,
      stats: statsResult.success ? statsResult.data : null,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/data-export');
  }
}

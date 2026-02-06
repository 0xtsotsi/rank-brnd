// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Individual Backlink API Route
 * Handles GET, PUT, PATCH, and DELETE operations for a specific backlink by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { updateBacklinkSchema } from '@/lib/schemas/backlinks';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/backlinks/[id]
 * Fetch a single backlink by ID
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

    const backlinkId = (await params).id;

    if (!backlinkId) {
      return NextResponse.json(
        { error: 'Backlink ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First get the backlink to check organization access
    const { data: backlink, error } = await client
      .from('backlinks')
      .select('*')
      .eq('id', backlinkId)
      .is('deleted_at', null)
      .single();

    if (error || !backlink) {
      return NextResponse.json(
        { error: 'Backlink not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      backlink.organization_id,
      userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(backlink);
  } catch (error) {
    console.error('Error fetching backlink:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backlink' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/backlinks/[id]
 * Update a backlink by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backlinkId = (await params).id;

    if (!backlinkId) {
      return NextResponse.json(
        { error: 'Backlink ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate update data (excluding id from body, using path param)
    const { id, ...updateData } = body;
    const validatedData = updateBacklinkSchema.parse(updateData);

    const client = getSupabaseServerClient();

    // First get the backlink to check organization access
    const { data: backlink } = await client
      .from('backlinks')
      .select('organization_id')
      .eq('id', backlinkId)
      .is('deleted_at', null)
      .single();

    if (!backlink) {
      return NextResponse.json(
        { error: 'Backlink not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      backlink.organization_id,
      userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Build the update object, only including fields that were provided
    // Map camelCase from schema to snake_case for database
    const updates: Partial<
      Database['public']['Tables']['backlinks']['Update']
    > = {};
    if (validatedData.sourceUrl !== undefined)
      updates.source_url = validatedData.sourceUrl;
    if (validatedData.targetUrl !== undefined)
      updates.target_url = validatedData.targetUrl || null;
    if (validatedData.domainAuthority !== undefined)
      updates.domain_authority = validatedData.domainAuthority;
    if (validatedData.pageAuthority !== undefined)
      updates.page_authority = validatedData.pageAuthority;
    if (validatedData.spamScore !== undefined)
      updates.spam_score = validatedData.spamScore;
    if (validatedData.linkType !== undefined)
      updates.link_type = validatedData.linkType || null;
    if (validatedData.anchorText !== undefined)
      updates.anchor_text = validatedData.anchorText || null;
    if (validatedData.status !== undefined) {
      updates.status = validatedData.status;
      updates.last_verified_at = new Date().toISOString();
      if (validatedData.status === 'lost') {
        updates.lost_at = new Date().toISOString();
      }
    }
    if (validatedData.notes !== undefined)
      updates.notes = validatedData.notes || null;
    if (validatedData.tags !== undefined) updates.tags = validatedData.tags;
    if (validatedData.metadata !== undefined)
      updates.metadata =
        validatedData.metadata as Database['public']['Tables']['backlinks']['Update']['metadata'];
    if (validatedData.lastVerifiedAt !== undefined)
      updates.last_verified_at = validatedData.lastVerifiedAt;

    // Always update updated_at
    updates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('backlinks')
      .update(updates)
      .eq('id', backlinkId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update backlink', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating backlink:', error);
    return NextResponse.json(
      { error: 'Failed to update backlink' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/backlinks/[id]
 * Partial update a backlink by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH behaves the same as PUT for this API
  return PUT(request, { params });
}

/**
 * DELETE /api/backlinks/[id]
 * Delete a backlink by ID (soft delete)
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

    const backlinkId = (await params).id;

    if (!backlinkId) {
      return NextResponse.json(
        { error: 'Backlink ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First get the backlink to check organization access
    const { data: backlink } = await client
      .from('backlinks')
      .select('organization_id')
      .eq('id', backlinkId)
      .is('deleted_at', null)
      .single();

    if (!backlink) {
      return NextResponse.json(
        { error: 'Backlink not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      backlink.organization_id,
      userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Soft delete by setting deleted_at
    const { error } = await client
      .from('backlinks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', backlinkId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete backlink', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting backlink:', error);
    return NextResponse.json(
      { error: 'Failed to delete backlink' },
      { status: 500 }
    );
  }
}

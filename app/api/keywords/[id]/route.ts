// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Individual Keyword API Route
 * Handles GET, PUT, PATCH, and DELETE operations for a specific keyword by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { updateKeywordSchema } from '@/lib/schemas/keywords';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/keywords/[id]
 * Fetch a single keyword by ID
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

    const keywordId = (await params).id;

    if (!keywordId) {
      return NextResponse.json(
        { error: 'Keyword ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First get the keyword to check organization access
    const { data: keyword, error } = await client
      .from('keywords')
      .select('*')
      .eq('id', keywordId)
      .is('deleted_at', null)
      .single();

    if (error || !keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      keyword.organization_id,
      userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(keyword);
  } catch (error) {
    console.error('Error fetching keyword:', error);
    return NextResponse.json(
      { error: 'Failed to fetch keyword' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/keywords/[id]
 * Update a keyword by ID
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

    const keywordId = (await params).id;

    if (!keywordId) {
      return NextResponse.json(
        { error: 'Keyword ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate update data (excluding id from body, using path param)
    const { id, ...updateData } = body;
    const validatedData = updateKeywordSchema.parse(updateData);

    const client = getSupabaseServerClient();

    // First get the keyword to check organization access
    const { data: keyword } = await client
      .from('keywords')
      .select('organization_id')
      .eq('id', keywordId)
      .is('deleted_at', null)
      .single();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      keyword.organization_id,
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
    const updates: Partial<Database['public']['Tables']['keywords']['Update']> =
      {};
    if (validatedData.keyword !== undefined)
      updates.keyword = validatedData.keyword;
    if (validatedData.searchVolume !== undefined)
      updates.search_volume = validatedData.searchVolume;
    if (validatedData.difficulty !== undefined)
      updates.difficulty = validatedData.difficulty;
    if (validatedData.intent !== undefined)
      updates.intent = validatedData.intent;
    if (validatedData.opportunityScore !== undefined)
      updates.opportunity_score = validatedData.opportunityScore;
    if (validatedData.status !== undefined)
      updates.status = validatedData.status;
    if (validatedData.currentRank !== undefined)
      updates.current_rank = validatedData.currentRank;
    if (validatedData.targetUrl !== undefined)
      updates.target_url = validatedData.targetUrl || null;
    if (validatedData.cpc !== undefined) updates.cpc = validatedData.cpc;
    if (validatedData.competition !== undefined)
      updates.competition = validatedData.competition;
    if (validatedData.notes !== undefined) updates.notes = validatedData.notes;
    if (validatedData.tags !== undefined) updates.tags = validatedData.tags;
    if (validatedData.metadata !== undefined)
      updates.metadata =
        validatedData.metadata as Database['public']['Tables']['keywords']['Update']['metadata'];

    // Always update updated_at
    updates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('keywords')
      .update(updates)
      .eq('id', keywordId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update keyword', details: error.message },
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

    console.error('Error updating keyword:', error);
    return NextResponse.json(
      { error: 'Failed to update keyword' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/keywords/[id]
 * Partial update a keyword by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH behaves the same as PUT for this API
  return PUT(request, { params });
}

/**
 * DELETE /api/keywords/[id]
 * Delete a keyword by ID (soft delete)
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

    const keywordId = (await params).id;

    if (!keywordId) {
      return NextResponse.json(
        { error: 'Keyword ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First get the keyword to check organization access
    const { data: keyword } = await client
      .from('keywords')
      .select('organization_id')
      .eq('id', keywordId)
      .is('deleted_at', null)
      .single();

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      keyword.organization_id,
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
      .from('keywords')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', keywordId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete keyword', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    return NextResponse.json(
      { error: 'Failed to delete keyword' },
      { status: 500 }
    );
  }
}

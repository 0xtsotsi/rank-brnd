// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Internal Link Suggestion by ID API Route
 * Handles operations on a specific internal link suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { updateInternalLinkSuggestionSchema } from '@/lib/schemas/internal-linking';
import { ZodError } from 'zod';
import {
  getInternalLinkSuggestion,
  updateInternalLinkSuggestion,
  softDeleteInternalLinkSuggestion,
} from '@/lib/internal-linking/database';

type Params = Promise<{ id: string }>;

/**
 * GET /api/internal-link-suggestions/[id]
 * Fetch a single internal link suggestion by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = getSupabaseServerClient();

    // Get the suggestion to check organization access
    const suggestionResult = await getInternalLinkSuggestion(client, id);

    if (!suggestionResult.success || !suggestionResult.data) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of the organization
    const isMember = await isOrganizationMember(
      client,
      suggestionResult.data.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get suggestion with article details
    const { data } = await client
      .from('internal_link_suggestions')
      .select(
        `
        *,
        target_article:articles!internal_link_suggestions_target_article_id_fkey(
          id,
          title,
          slug,
          excerpt,
          status
        ),
        source_article:articles!internal_link_suggestions_source_article_id_fkey(
          id,
          title,
          slug,
          excerpt,
          status
        )
      `
      )
      .eq('id', id)
      .single();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestion' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/internal-link-suggestions/[id]
 * Update an internal link suggestion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const validatedData = updateInternalLinkSuggestionSchema.parse(body);

    const client = getSupabaseServerClient();

    // Get the suggestion to check organization access
    const suggestionResult = await getInternalLinkSuggestion(client, id);

    if (!suggestionResult.success || !suggestionResult.data) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Verify user is an admin or owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', suggestionResult.data.organization_id)
      .eq('user_id', userId)
      .single();

    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Forbidden - Must be an admin or owner' },
        { status: 403 }
      );
    }

    // Update the suggestion
    const updateResult = await updateInternalLinkSuggestion(
      client,
      id,
      validatedData
    );

    if (!updateResult.success || !updateResult.data) {
      return NextResponse.json(
        { error: 'Failed to update suggestion', details: updateResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json(updateResult.data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to update suggestion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/internal-link-suggestions/[id]
 * Soft delete an internal link suggestion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const client = getSupabaseServerClient();

    // Get the suggestion to check organization access
    const suggestionResult = await getInternalLinkSuggestion(client, id);

    if (!suggestionResult.success || !suggestionResult.data) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Verify user is an owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', suggestionResult.data.organization_id)
      .eq('user_id', userId)
      .single();

    if (!member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden - Must be an owner' },
        { status: 403 }
      );
    }

    // Soft delete the suggestion
    const deleteResult = await softDeleteInternalLinkSuggestion(client, id);

    if (!deleteResult.success) {
      return NextResponse.json(
        { error: 'Failed to delete suggestion', details: deleteResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to delete suggestion' },
      { status: 500 }
    );
  }
}

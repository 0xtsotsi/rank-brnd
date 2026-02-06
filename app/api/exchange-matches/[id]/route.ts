// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Individual Exchange Match API Route
 * Handles GET, PUT, PATCH, and DELETE operations for a specific exchange match by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  updateExchangeMatchSchema,
  updateExchangeMatchStatusSchema,
} from '@/lib/schemas/exchange-matches';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/exchange-matches/[id]
 * Fetch a single exchange match by ID
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

    const matchId = (await params).id;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Exchange match ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First get the match to check organization access
    const { data: match, error } = await client
      .from('exchange_matches')
      .select('*')
      .eq('id', matchId)
      .is('deleted_at', null)
      .single();

    if (error || !match) {
      return NextResponse.json(
        { error: 'Exchange match not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      match.organization_id,
      userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(match);
  } catch (error) {
    console.error('Error fetching exchange match:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange match' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/exchange-matches/[id]
 * Update an exchange match by ID
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

    const matchId = (await params).id;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Exchange match ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate update data
    const validatedData = updateExchangeMatchSchema.parse(body);

    const client = getSupabaseServerClient();

    // First get the match to check organization access
    const { data: match } = await client
      .from('exchange_matches')
      .select('organization_id')
      .eq('id', matchId)
      .is('deleted_at', null)
      .single();

    if (!match) {
      return NextResponse.json(
        { error: 'Exchange match not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      match.organization_id,
      userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Build the update object
    const updates: Partial<
      Database['public']['Tables']['exchange_matches']['Update']
    > = {};

    if (validatedData.product_id !== undefined)
      updates.product_id = validatedData.product_id;
    if (validatedData.exchange_site_id !== undefined)
      updates.exchange_site_id = validatedData.exchange_site_id;
    if (validatedData.target_url !== undefined)
      updates.target_url = validatedData.target_url;
    if (validatedData.anchor_text !== undefined)
      updates.anchor_text = validatedData.anchor_text;
    if (validatedData.content_title !== undefined)
      updates.content_title = validatedData.content_title;
    if (validatedData.content_id !== undefined)
      updates.content_id = validatedData.content_id;
    if (validatedData.credits_used !== undefined)
      updates.credits_used = validatedData.credits_used;
    if (validatedData.notes !== undefined) updates.notes = validatedData.notes;
    if (validatedData.metadata !== undefined)
      updates.metadata =
        validatedData.metadata as Database['public']['Tables']['exchange_matches']['Update']['metadata'];

    // Always update updated_at
    updates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('exchange_matches')
      .update(updates)
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update exchange match', details: error.message },
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

    console.error('Error updating exchange match:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange match' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/exchange-matches/[id]
 * Partial update an exchange match by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchId = (await params).id;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Exchange match ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const client = getSupabaseServerClient();

    // First get the match to check organization access
    const { data: match } = await client
      .from('exchange_matches')
      .select('organization_id, status')
      .eq('id', matchId)
      .is('deleted_at', null)
      .single();

    if (!match) {
      return NextResponse.json(
        { error: 'Exchange match not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      match.organization_id,
      userId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Check if this is a status update
    if (body.status !== undefined) {
      const validatedData = updateExchangeMatchStatusSchema.parse({
        status: body.status,
      });

      // Build status-specific updates
      const updates: Partial<
        Database['public']['Tables']['exchange_matches']['Update']
      > = {
        status: validatedData.status,
        updated_at: new Date().toISOString(),
      };

      // Set timestamp based on status
      if (validatedData.status === 'approved') {
        updates.approved_at = new Date().toISOString();
      } else if (validatedData.status === 'published') {
        updates.published_at = new Date().toISOString();
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await client
        .from('exchange_matches')
        .update(updates)
        .eq('id', matchId)
        .select()
        .single();

      if (error) {
        console.error('Status update error:', error);
        return NextResponse.json(
          {
            error: 'Failed to update exchange match status',
            details: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    }

    // For other partial updates, use the update schema
    const validatedData = updateExchangeMatchSchema.parse(body);

    // Build the update object
    const updates: Partial<
      Database['public']['Tables']['exchange_matches']['Update']
    > = {};

    if (validatedData.product_id !== undefined)
      updates.product_id = validatedData.product_id;
    if (validatedData.exchange_site_id !== undefined)
      updates.exchange_site_id = validatedData.exchange_site_id;
    if (validatedData.target_url !== undefined)
      updates.target_url = validatedData.target_url;
    if (validatedData.anchor_text !== undefined)
      updates.anchor_text = validatedData.anchor_text;
    if (validatedData.content_title !== undefined)
      updates.content_title = validatedData.content_title;
    if (validatedData.content_id !== undefined)
      updates.content_id = validatedData.content_id;
    if (validatedData.credits_used !== undefined)
      updates.credits_used = validatedData.credits_used;
    if (validatedData.notes !== undefined) updates.notes = validatedData.notes;
    if (validatedData.metadata !== undefined)
      updates.metadata =
        validatedData.metadata as Database['public']['Tables']['exchange_matches']['Update']['metadata'];

    // Always update updated_at
    updates.updated_at = new Date().toISOString();

    const { data, error } = await client
      .from('exchange_matches')
      .update(updates)
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update exchange match', details: error.message },
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

    console.error('Error updating exchange match:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange match' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exchange-matches/[id]
 * Delete an exchange match by ID (soft delete)
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

    const matchId = (await params).id;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Exchange match ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First get the match to check organization access
    const { data: match } = await client
      .from('exchange_matches')
      .select('organization_id')
      .eq('id', matchId)
      .is('deleted_at', null)
      .single();

    if (!match) {
      return NextResponse.json(
        { error: 'Exchange match not found' },
        { status: 404 }
      );
    }

    // Check organization membership
    const isMember = await isOrganizationMember(
      client,
      match.organization_id,
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
      .from('exchange_matches')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', matchId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete exchange match', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exchange match:', error);
    return NextResponse.json(
      { error: 'Failed to delete exchange match' },
      { status: 500 }
    );
  }
}

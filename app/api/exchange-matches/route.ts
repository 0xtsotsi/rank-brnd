// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Exchange Matches API Route
 * Handles CRUD operations for exchange matches data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  exchangeMatchesQuerySchema,
  exchangeMatchPostSchema,
} from '@/lib/schemas/exchange-matches';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/exchange-matches
 * Fetch exchange matches with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams = {
      organization_id: searchParams.get('organization_id') || undefined,
      product_id: searchParams.get('product_id') || undefined,
      exchange_site_id: searchParams.get('exchange_site_id') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      search: searchParams.get('search') || undefined,
      min_credits_used: searchParams.get('min_credits_used')
        ? parseInt(searchParams.get('min_credits_used')!)
        : undefined,
      max_credits_used: searchParams.get('max_credits_used')
        ? parseInt(searchParams.get('max_credits_used')!)
        : undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      sort: (searchParams.get('sort') as any) || 'requested_at',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    };

    const validatedParams = exchangeMatchesQuerySchema.parse(queryParams);

    // If organization_id is provided, verify user is a member
    if (validatedParams.organization_id) {
      const client = getSupabaseServerClient();
      const isMember = await isOrganizationMember(
        client,
        validatedParams.organization_id,
        userId
      );

      if (!isMember) {
        return NextResponse.json(
          { error: 'Forbidden - Not a member of this organization' },
          { status: 403 }
        );
      }
    } else {
      // If no organization_id, return error - must filter by organization
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Build query with filters
    let query = client
      .from('exchange_matches')
      .select('*', { count: 'exact' })
      .eq('organization_id', validatedParams.organization_id)
      .is('deleted_at', null);

    // Apply filters
    if (validatedParams.product_id) {
      query = query.eq('product_id', validatedParams.product_id);
    }

    if (validatedParams.exchange_site_id) {
      query = query.eq('exchange_site_id', validatedParams.exchange_site_id);
    }

    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status);
    }

    if (validatedParams.min_credits_used !== undefined) {
      query = query.gte('credits_used', validatedParams.min_credits_used);
    }

    if (validatedParams.max_credits_used !== undefined) {
      query = query.lte('credits_used', validatedParams.max_credits_used);
    }

    if (validatedParams.date_from) {
      query = query.gte('requested_at', validatedParams.date_from);
    }

    if (validatedParams.date_to) {
      query = query.lte('requested_at', validatedParams.date_to);
    }

    if (validatedParams.search) {
      query = query.or(
        `target_url.ilike.%${validatedParams.search}%,anchor_text.ilike.%${validatedParams.search}%,content_title.ilike.%${validatedParams.search}%`
      );
    }

    // Apply sorting
    query = query.order(validatedParams.sort, {
      ascending: validatedParams.order === 'asc',
      nullsFirst: false,
    });

    // Apply pagination
    const from = validatedParams.offset;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch exchange matches', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exchange_matches: data || [],
      total: count || 0,
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        total: count || 0,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching exchange matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange matches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exchange-matches
 * Create a new exchange match or bulk create
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = exchangeMatchPostSchema.parse(body);

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const isMember = await isOrganizationMember(
      client,
      validatedData.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    if (validatedData.bulk && validatedData.matches) {
      // Bulk create
      const matchesToInsert = validatedData.matches.map((match) => ({
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        exchange_site_id: match.exchange_site_id,
        target_url: match.target_url || null,
        anchor_text: match.anchor_text || null,
        content_title: match.content_title || null,
        credits_used: match.credits_used || 0,
        notes: match.notes || null,
        status: 'pending' as const,
      }));

      const { data, error } = await client
        .from('exchange_matches')
        .insert(matchesToInsert)
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        return NextResponse.json(
          {
            error: 'Failed to create exchange matches',
            details: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          total: matchesToInsert.length,
          successful: data?.length || 0,
          failed: 0,
          errors: [],
        },
        { status: 201 }
      );
    }

    // Single exchange match creation
    const matchToInsert: Database['public']['Tables']['exchange_matches']['Insert'] =
      {
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        exchange_site_id: validatedData.exchange_site_id,
        target_url: validatedData.target_url || null,
        anchor_text: validatedData.anchor_text || null,
        content_title: validatedData.content_title || null,
        content_id: validatedData.content_id || null,
        credits_used: validatedData.credits_used || 0,
        notes: validatedData.notes || null,
        metadata:
          validatedData.metadata as Database['public']['Tables']['exchange_matches']['Insert']['metadata'],
        status: validatedData.status || 'pending',
      };

    const { data, error } = await client
      .from('exchange_matches')
      .insert(matchToInsert)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create exchange match', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating exchange match:', error);
    return NextResponse.json(
      { error: 'Failed to create exchange match' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/exchange-matches?id=<match-id>
 * Delete (soft delete) an exchange match
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Exchange match ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First check if user has access (match must belong to their org)
    const { data: match } = await client
      .from('exchange_matches')
      .select('organization_id')
      .eq('id', id)
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
      .eq('id', id);

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

// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * External Link Opportunities API Route
 * Handles CRUD operations for external link opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  externalLinkOpportunitiesQuerySchema,
  externalLinkOpportunityPostSchema,
} from '@/lib/schemas/external-link-opportunities';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/external-link-opportunities
 * Fetch external link opportunities with filtering, sorting, and pagination
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
      article_id: searchParams.get('article_id') || undefined,
      external_source_id: searchParams.get('external_source_id') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      link_type: (searchParams.get('link_type') as any) || undefined,
      search: searchParams.get('search') || undefined,
      min_relevance: searchParams.get('min_relevance')
        ? parseInt(searchParams.get('min_relevance')!)
        : undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      sort: (searchParams.get('sort') as any) || 'relevance_score',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    };

    const validatedParams =
      externalLinkOpportunitiesQuerySchema.parse(queryParams);

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
      .from('external_link_opportunities')
      .select('*, external_link_sources(*)', { count: 'exact' })
      .eq('organization_id', validatedParams.organization_id)
      .is('deleted_at', null);

    // Apply filters
    if (validatedParams.product_id) {
      query = query.eq('product_id', validatedParams.product_id);
    }

    if (validatedParams.article_id) {
      query = query.eq('article_id', validatedParams.article_id);
    }

    if (validatedParams.external_source_id) {
      query = query.eq(
        'external_source_id',
        validatedParams.external_source_id
      );
    }

    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status);
    }

    if (validatedParams.link_type) {
      query = query.eq('link_type', validatedParams.link_type);
    }

    if (validatedParams.min_relevance !== undefined) {
      query = query.gte('relevance_score', validatedParams.min_relevance);
    }

    if (validatedParams.search) {
      query = query.or(
        `keyword.ilike.%${validatedParams.search}%,suggested_url.ilike.%${validatedParams.search}%,suggested_anchor_text.ilike.%${validatedParams.search}%,context_snippet.ilike.%${validatedParams.search}%`
      );
    }

    if (validatedParams.date_from) {
      query = query.gte('suggested_at', validatedParams.date_from);
    }

    if (validatedParams.date_to) {
      query = query.lte('suggested_at', validatedParams.date_to);
    }

    // Apply sorting
    query = query.order(validatedParams.sort, {
      ascending: validatedParams.order === 'asc',
    });

    // Apply pagination
    const from = validatedParams.offset;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch opportunities', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      opportunities: data || [],
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

    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external-link-opportunities
 * Create a new external link opportunity or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = externalLinkOpportunityPostSchema.parse(body);

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

    if (validatedData.bulk && validatedData.opportunities) {
      // Bulk import
      const opportunitiesToInsert = validatedData.opportunities.map((opp) => ({
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        article_id: validatedData.article_id || null,
        external_source_id: opp.external_source_id || null,
        keyword: opp.keyword || null,
        suggested_url: opp.suggested_url || null,
        suggested_anchor_text: opp.suggested_anchor_text || null,
        context_snippet: opp.context_snippet || null,
        relevance_score: opp.relevance_score || null,
        link_type: opp.link_type || 'external',
        notes: opp.notes || null,
        status: 'pending' as const,
      }));

      const { data, error } = await client
        .from('external_link_opportunities')
        .insert(opportunitiesToInsert)
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        return NextResponse.json(
          { error: 'Failed to import opportunities', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        total: opportunitiesToInsert.length,
        successful: data?.length || 0,
        failed: 0,
        errors: [],
      });
    }

    // Single opportunity creation
    const opportunityToInsert: Database['public']['Tables']['external_link_opportunities']['Insert'] =
      {
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        article_id: validatedData.article_id || null,
        external_source_id: validatedData.external_source_id || null,
        keyword: validatedData.keyword || null,
        suggested_url: validatedData.suggested_url || null,
        suggested_anchor_text: validatedData.suggested_anchor_text || null,
        context_snippet: validatedData.context_snippet || null,
        position_in_content: validatedData.position_in_content || null,
        relevance_score: validatedData.relevance_score || null,
        status: validatedData.status,
        link_type: validatedData.link_type,
        notes: validatedData.notes || null,
        metadata:
          validatedData.metadata as Database['public']['Tables']['external_link_opportunities']['Insert']['metadata'],
      };

    const { data, error } = await client
      .from('external_link_opportunities')
      .insert(opportunityToInsert)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create opportunity', details: error.message },
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

    console.error('Error creating opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to create opportunity' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/external-link-opportunities?id=<opportunity-id>
 * Delete (soft delete) an external link opportunity
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
        { error: 'Opportunity ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First check if user has access (opportunity must belong to their org)
    const { data: opportunity } = await client
      .from('external_link_opportunities')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // Check organization membership and role
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', opportunity.organization_id)
      .eq('user_id', userId)
      .single();

    if (!member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden - Must be an owner' },
        { status: 403 }
      );
    }

    // Soft delete by setting deleted_at
    const { error } = await client
      .from('external_link_opportunities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete opportunity', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to delete opportunity' },
      { status: 500 }
    );
  }
}

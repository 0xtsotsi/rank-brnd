// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Internal Link Suggestions API Route
 * Handles CRUD operations for internal link suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  internalLinkSuggestionsQuerySchema,
  createInternalLinkSuggestionSchema,
} from '@/lib/schemas/internal-linking';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/internal-link-suggestions
 * Fetch internal link suggestions with filtering, sorting, and pagination
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
      source_article_id: searchParams.get('source_article_id') || undefined,
      target_article_id: searchParams.get('target_article_id') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      link_type: (searchParams.get('link_type') as any) || undefined,
      min_relevance_score: searchParams.get('min_relevance_score')
        ? parseInt(searchParams.get('min_relevance_score')!)
        : undefined,
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
      include_deleted: searchParams.get('include_deleted') === 'true',
      include_articles: searchParams.get('include_articles') === 'true',
    };

    const validatedParams =
      internalLinkSuggestionsQuerySchema.parse(queryParams);

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
    let query = validatedParams.include_articles
      ? client
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
          `,
            { count: 'exact' }
          )
          .eq('organization_id', validatedParams.organization_id)
      : client
          .from('internal_link_suggestions')
          .select('*', { count: 'exact' })
          .eq('organization_id', validatedParams.organization_id);

    // Apply soft delete filter
    if (!validatedParams.include_deleted) {
      query = query.is('deleted_at', null);
    }

    // Apply filters
    if (validatedParams.product_id) {
      query = query.eq('product_id', validatedParams.product_id);
    }

    if (validatedParams.article_id) {
      query = query.eq('source_article_id', validatedParams.article_id);
    }

    if (validatedParams.source_article_id) {
      query = query.eq('source_article_id', validatedParams.source_article_id);
    }

    if (validatedParams.target_article_id) {
      query = query.eq('target_article_id', validatedParams.target_article_id);
    }

    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status);
    }

    if (validatedParams.link_type) {
      query = query.eq('link_type', validatedParams.link_type);
    }

    if (validatedParams.min_relevance_score !== undefined) {
      query = query.gte('relevance_score', validatedParams.min_relevance_score);
    }

    // Apply sorting
    query = query.order('relevance_score', { ascending: false });
    query = query.order('suggested_at', { ascending: false });

    // Apply pagination
    const from = validatedParams.offset;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch suggestions', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestions: data || [],
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

    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/internal-link-suggestions
 * Create a new internal link suggestion or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check for bulk import
    if (body.bulk && body.suggestions && Array.isArray(body.suggestions)) {
      const organization_id = body.organization_id;
      if (!organization_id) {
        return NextResponse.json(
          { error: 'organization_id is required' },
          { status: 400 }
        );
      }

      const client = getSupabaseServerClient();

      // Verify user is a member of the organization
      const isMember = await isOrganizationMember(
        client,
        organization_id,
        userId
      );
      if (!isMember) {
        return NextResponse.json(
          { error: 'Forbidden - Not a member of this organization' },
          { status: 403 }
        );
      }

      // Bulk import
      const suggestionsToInsert = body.suggestions.map((sugg: any) => ({
        organization_id,
        product_id: sugg.product_id || body.product_id || null,
        source_article_id: sugg.source_article_id || null,
        target_article_id: sugg.target_article_id,
        keyword: sugg.keyword || null,
        suggested_anchor_text: sugg.suggested_anchor_text || null,
        context_snippet: sugg.context_snippet || null,
        position_in_content: sugg.position_in_content || null,
        relevance_score: sugg.relevance_score || null,
        link_type: sugg.link_type || 'contextual',
        notes: sugg.notes || null,
        metadata: sugg.metadata || {},
        status: 'pending',
      }));

      const { data, error } = await client
        .from('internal_link_suggestions')
        .insert(suggestionsToInsert)
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        return NextResponse.json(
          { error: 'Failed to import suggestions', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        total: suggestionsToInsert.length,
        successful: data?.length || 0,
        failed: 0,
        errors: [],
      });
    }

    // Single suggestion creation
    const validatedData = createInternalLinkSuggestionSchema.parse(body);

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

    const suggestionToInsert: Database['public']['Tables']['internal_link_suggestions']['Insert'] =
      {
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        source_article_id: validatedData.source_article_id || null,
        target_article_id: validatedData.target_article_id,
        keyword: validatedData.keyword || null,
        suggested_anchor_text: validatedData.suggested_anchor_text || null,
        context_snippet: validatedData.context_snippet || null,
        position_in_content: validatedData.position_in_content || null,
        relevance_score: validatedData.relevance_score || null,
        link_type: validatedData.link_type,
        notes: validatedData.notes || null,
        metadata:
          validatedData.metadata as Database['public']['Tables']['internal_link_suggestions']['Insert']['metadata'],
      };

    const { data, error } = await client
      .from('internal_link_suggestions')
      .insert(suggestionToInsert)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create suggestion', details: error.message },
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

    console.error('Error creating suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to create suggestion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/internal-link-suggestions?id=<suggestion-id>
 * Delete (soft delete) an internal link suggestion
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
        { error: 'Suggestion ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First check if user has access (suggestion must belong to their org)
    const { data: suggestion } = await client
      .from('internal_link_suggestions')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    // Check organization membership and role
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', suggestion.organization_id)
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
      .from('internal_link_suggestions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete suggestion', details: error.message },
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

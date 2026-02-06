// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Keyword Research API Route
 * Handles CRUD operations for keyword research data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  keywordsQuerySchema,
  keywordsPostSchema,
} from '@/lib/schemas/keywords';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/keywords
 * Fetch keywords with filtering, sorting, and pagination
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
      search: searchParams.get('search') || undefined,
      intent: (searchParams.get('intent') as any) || undefined,
      difficulty: (searchParams.get('difficulty') as any) || undefined,
      status: (searchParams.get('status') as any) || undefined,
      min_opportunity_score: searchParams.get('min_opportunity_score')
        ? parseInt(searchParams.get('min_opportunity_score')!)
        : undefined,
      max_opportunity_score: searchParams.get('max_opportunity_score')
        ? parseInt(searchParams.get('max_opportunity_score')!)
        : undefined,
      min_search_volume: searchParams.get('min_search_volume')
        ? parseInt(searchParams.get('min_search_volume')!)
        : undefined,
      max_search_volume: searchParams.get('max_search_volume')
        ? parseInt(searchParams.get('max_search_volume')!)
        : undefined,
      tags: searchParams.get('tags') || undefined,
      sort: (searchParams.get('sort') as any) || 'created_at',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    };

    const validatedParams = keywordsQuerySchema.parse(queryParams);

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
      .from('keywords')
      .select('*', { count: 'exact' })
      .eq('organization_id', validatedParams.organization_id)
      .is('deleted_at', null);

    // Apply filters
    if (validatedParams.product_id) {
      query = query.eq('product_id', validatedParams.product_id);
    }

    if (validatedParams.intent) {
      query = query.eq('intent', validatedParams.intent);
    }

    if (validatedParams.difficulty) {
      query = query.eq('difficulty', validatedParams.difficulty);
    }

    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status);
    }

    if (validatedParams.min_opportunity_score !== undefined) {
      query = query.gte(
        'opportunity_score',
        validatedParams.min_opportunity_score
      );
    }

    if (validatedParams.max_opportunity_score !== undefined) {
      query = query.lte(
        'opportunity_score',
        validatedParams.max_opportunity_score
      );
    }

    if (validatedParams.min_search_volume !== undefined) {
      query = query.gte('search_volume', validatedParams.min_search_volume);
    }

    if (validatedParams.max_search_volume !== undefined) {
      query = query.lte('search_volume', validatedParams.max_search_volume);
    }

    if (validatedParams.search) {
      query = query.ilike('keyword', `%${validatedParams.search}%`);
    }

    if (validatedParams.tags) {
      const tagArray = validatedParams.tags.split(',').map((t) => t.trim());
      query = query.contains('tags', tagArray);
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
        { error: 'Failed to fetch keywords', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      keywords: data || [],
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

    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keywords
 * Create a new keyword or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = keywordsPostSchema.parse(body);

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const isMember = await isOrganizationMember(
      client,
      validatedData?.organization_id || '',
      validatedData?.userId || ''
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Not a member of this organization' },
        { status: 403 }
      );
    }

    // Check if this is a bulk operation
    const isBulk = body && 'bulk' in body && body.bulk === true;

    // For bulk operations, validate bulk-specific schema
    if (isBulk) {
      const validatedData = bulkInsertKeywordsSchema.safeParse(body);

      if (!validatedData.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validatedData.error },
          { status: 400 }
        );
      }

      const organizationId = validatedData.data.organization_id;
      const keywords = validatedData.data.keywords;

      // Verify user is a member
      const isMember = await isOrganizationMember(
        client,
        organizationId,
        userId
      );

      if (!isMember) {
        return NextResponse.json(
          { error: 'Forbidden - Not a member of this organization' },
          { status: 403 }
        );
      }

      // Bulk import keywords
      const { data, error } = await client
        .from('keywords')
        .insert(
          keywords.map((kw) => ({
            organization_id: organizationId,
            product_id: validatedData.data.product_id || null,
            keyword: kw.keyword,
            search_volume: kw.searchVolume || null,
            difficulty: kw.difficulty || 'medium',
            intent: kw.intent || 'informational',
            cpc: kw.cpc || null,
            tags: kw.tags ? kw.tags.split(',').map((t) => t.trim()) : [],
            target_url: kw.targetUrl || null,
            notes: kw.notes || null,
            status: 'tracking' as const,
          }))
        )
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        return NextResponse.json(
          { error: 'Failed to import keywords', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        total: keywords.length,
        successful: data?.length || 0,
        failed: 0,
        errors: [],
      });
    }

    // For single keyword creation, use standard schema
    if (!isBulk) {
      // Bulk import
      const keywordsToInsert = validatedData.keywords.map((kw) => ({
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        keyword: kw.keyword,
        search_volume: kw.searchVolume || null,
        difficulty: kw.difficulty || 'medium',
        intent: kw.intent || 'informational',
        cpc: kw.cpc || null,
        tags: kw.tags ? kw.tags.split(',').map((t) => t.trim()) : [],
        target_url: kw.targetUrl || null,
        notes: kw.notes || null,
        status: 'tracking' as const,
      }));

      const { data, error } = await client
        .from('keywords')
        .insert(keywordsToInsert)
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        return NextResponse.json(
          { error: 'Failed to import keywords', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        total: keywordsToInsert.length,
        successful: data?.length || 0,
        failed: 0,
        errors: [],
      });
    }

    // Single keyword creation
    const keywordToInsert: Database['public']['Tables']['keywords']['Insert'] =
      {
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        keyword: validatedData.keyword,
        search_volume: validatedData.searchVolume || null,
        difficulty: validatedData.difficulty || 'medium',
        intent: validatedData.intent || 'informational',
        cpc: validatedData.cpc || null,
        competition: validatedData.competition || null,
        opportunity_score: validatedData.opportunityScore || null,
        status: validatedData.status || 'tracking',
        current_rank: validatedData.currentRank || null,
        target_url: validatedData.targetUrl || null,
        notes: validatedData.notes || null,
        tags: validatedData.tags || [],
        metadata:
          validatedData.metadata as Database['public']['Tables']['keywords']['Insert']['metadata'],
      };

    const { data, error } = await client
      .from('keywords')
      .insert(keywordToInsert)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create keyword', details: error.message },
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

    console.error('Error creating keyword:', error);
    return NextResponse.json(
      { error: 'Failed to create keyword' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/keywords?id=<keyword-id>
 * Delete (soft delete) a keyword
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
        { error: 'Keyword ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First check if user has access (keyword must belong to their org)
    const { data: keyword } = await client
      .from('keywords')
      .select('organization_id')
      .eq('id', id)
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
      .eq('id', id);

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

// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Backlinks API Route
 * Handles CRUD operations for backlink data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  backlinksQuerySchema,
  backlinksPostSchema,
} from '@/lib/schemas/backlinks';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/backlinks
 * Fetch backlinks with filtering, sorting, and pagination
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
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      link_type: (searchParams.get('link_type') as any) || undefined,
      min_domain_authority: searchParams.get('min_domain_authority')
        ? parseInt(searchParams.get('min_domain_authority')!)
        : undefined,
      max_domain_authority: searchParams.get('max_domain_authority')
        ? parseInt(searchParams.get('max_domain_authority')!)
        : undefined,
      min_page_authority: searchParams.get('min_page_authority')
        ? parseInt(searchParams.get('min_page_authority')!)
        : undefined,
      max_page_authority: searchParams.get('max_page_authority')
        ? parseInt(searchParams.get('max_page_authority')!)
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

    const validatedParams = backlinksQuerySchema.parse(queryParams);

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
      .from('backlinks')
      .select('*', { count: 'exact' })
      .eq('organization_id', validatedParams.organization_id)
      .is('deleted_at', null);

    // Apply filters
    if (validatedParams.product_id) {
      query = query.eq('product_id', validatedParams.product_id);
    }

    if (validatedParams.article_id) {
      query = query.eq('article_id', validatedParams.article_id);
    }

    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status);
    }

    if (validatedParams.link_type) {
      query = query.eq('link_type', validatedParams.link_type);
    }

    if (validatedParams.min_domain_authority !== undefined) {
      query = query.gte(
        'domain_authority',
        validatedParams.min_domain_authority
      );
    }

    if (validatedParams.max_domain_authority !== undefined) {
      query = query.lte(
        'domain_authority',
        validatedParams.max_domain_authority
      );
    }

    if (validatedParams.min_page_authority !== undefined) {
      query = query.gte('page_authority', validatedParams.min_page_authority);
    }

    if (validatedParams.max_page_authority !== undefined) {
      query = query.lte('page_authority', validatedParams.max_page_authority);
    }

    if (validatedParams.search) {
      query = query.or(
        `source_url.ilike.%${validatedParams.search}%,target_url.ilike.%${validatedParams.search}%,anchor_text.ilike.%${validatedParams.search}%`
      );
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
        { error: 'Failed to fetch backlinks', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      backlinks: data || [],
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

    console.error('Error fetching backlinks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backlinks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backlinks
 * Create a new backlink or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = backlinksPostSchema.parse(body);

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

    if (validatedData.bulk && validatedData.backlinks) {
      // Bulk import
      const backlinksToInsert = validatedData.backlinks.map((bl) => ({
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        article_id: validatedData.article_id || null,
        source_url: bl.sourceUrl,
        target_url: bl.targetUrl,
        domain_authority: bl.domainAuthority || null,
        page_authority: bl.pageAuthority || null,
        spam_score: bl.spamScore || null,
        link_type: bl.linkType || null,
        anchor_text: bl.anchorText || null,
        tags: bl.tags ? bl.tags.split(',').map((t) => t.trim()) : [],
        notes: bl.notes || null,
        status: 'pending' as const,
      }));

      const { data, error } = await client
        .from('backlinks')
        .insert(backlinksToInsert)
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        return NextResponse.json(
          { error: 'Failed to import backlinks', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        total: backlinksToInsert.length,
        successful: data?.length || 0,
        failed: 0,
        errors: [],
      });
    }

    // Single backlink creation
    const backlinkToInsert: Database['public']['Tables']['backlinks']['Insert'] =
      {
        organization_id: validatedData.organization_id,
        product_id: validatedData.product_id || null,
        article_id: validatedData.article_id || null,
        source_url: validatedData.sourceUrl,
        target_url: validatedData.targetUrl,
        domain_authority: validatedData.domainAuthority || null,
        page_authority: validatedData.pageAuthority || null,
        spam_score: validatedData.spamScore || null,
        link_type: validatedData.linkType || null,
        anchor_text: validatedData.anchorText || null,
        status: validatedData.status || 'pending',
        notes: validatedData.notes || null,
        tags: validatedData.tags || [],
        metadata:
          validatedData.metadata as Database['public']['Tables']['backlinks']['Insert']['metadata'],
      };

    const { data, error } = await client
      .from('backlinks')
      .insert(backlinkToInsert)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create backlink', details: error.message },
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

    console.error('Error creating backlink:', error);
    return NextResponse.json(
      { error: 'Failed to create backlink' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backlinks?id=<backlink-id>
 * Delete (soft delete) a backlink
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
        { error: 'Backlink ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First check if user has access (backlink must belong to their org)
    const { data: backlink } = await client
      .from('backlinks')
      .select('organization_id')
      .eq('id', id)
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
      .eq('id', id);

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

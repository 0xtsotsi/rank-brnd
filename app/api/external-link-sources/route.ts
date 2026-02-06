// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * External Link Sources API Route
 * Handles CRUD operations for external link sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import {
  externalLinkSourcesQuerySchema,
  externalLinkSourcePostSchema,
} from '@/lib/schemas/external-link-sources';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/external-link-sources
 * Fetch external link sources with filtering, sorting, and pagination
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
      category: (searchParams.get('category') as any) || undefined,
      status: (searchParams.get('status') as any) || undefined,
      search: searchParams.get('search') || undefined,
      topics: searchParams.get('topics') || undefined,
      min_domain_authority: searchParams.get('min_domain_authority')
        ? parseInt(searchParams.get('min_domain_authority')!)
        : undefined,
      min_trustworthiness: searchParams.get('min_trustworthiness')
        ? parseInt(searchParams.get('min_trustworthiness')!)
        : undefined,
      is_global:
        searchParams.get('is_global') === 'true'
          ? true
          : searchParams.get('is_global') === 'false'
            ? false
            : undefined,
      language: searchParams.get('language') || undefined,
      sort: (searchParams.get('sort') as any) || 'trustworthiness_score',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit')
        ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!)))
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    };

    const validatedParams = externalLinkSourcesQuerySchema.parse(queryParams);

    const client = getSupabaseServerClient();

    // Build query with filters
    let query = client
      .from('external_link_sources')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // If organization_id is provided, show global + organization sources
    // Otherwise, show only global active sources
    if (validatedParams.organization_id) {
      // Verify user is a member
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

      // Show global sources OR sources belonging to this organization
      query = client
        .from('external_link_sources')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .or(
          `is_global.eq.true,organization_id.eq.${validatedParams.organization_id}`
        );
    } else {
      // No organization specified - show only global active sources
      query = query.eq('is_global', true).eq('status', 'active');
    }

    // Re-apply filters after the OR condition
    if (validatedParams.organization_id) {
      const baseQuery = client
        .from('external_link_sources')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .or(
          `is_global.eq.true,organization_id.eq.${validatedParams.organization_id}`
        );

      if (validatedParams.category) {
        query = baseQuery.eq('category', validatedParams.category);
      }
      if (validatedParams.status) {
        query = baseQuery.eq('status', validatedParams.status);
      }
      if (validatedParams.language) {
        query = baseQuery.eq('language', validatedParams.language);
      }
      if (validatedParams.min_domain_authority !== undefined) {
        query = baseQuery.gte(
          'domain_authority',
          validatedParams.min_domain_authority
        );
      }
      if (validatedParams.min_trustworthiness !== undefined) {
        query = baseQuery.gte(
          'trustworthiness_score',
          validatedParams.min_trustworthiness
        );
      }
      if (validatedParams.search) {
        query = baseQuery.or(
          `name.ilike.%${validatedParams.search}%,domain.ilike.%${validatedParams.search}%,description.ilike.%${validatedParams.search}%`
        );
      }
      if (validatedParams.topics) {
        const topicArray = validatedParams.topics
          .split(',')
          .map((t) => t.trim());
        query = baseQuery.contains('topics', topicArray);
      }

      // Apply sorting
      query = baseQuery.order(validatedParams.sort, {
        ascending: validatedParams.order === 'asc',
      });
    } else {
      // Apply filters for global sources query
      if (validatedParams.category) {
        query = query.eq('category', validatedParams.category);
      }
      if (validatedParams.status) {
        query = query.eq('status', validatedParams.status);
      }
      if (validatedParams.language) {
        query = query.eq('language', validatedParams.language);
      }
      if (validatedParams.min_domain_authority !== undefined) {
        query = query.gte(
          'domain_authority',
          validatedParams.min_domain_authority
        );
      }
      if (validatedParams.min_trustworthiness !== undefined) {
        query = query.gte(
          'trustworthiness_score',
          validatedParams.min_trustworthiness
        );
      }
      if (validatedParams.search) {
        query = query.or(
          `name.ilike.%${validatedParams.search}%,domain.ilike.%${validatedParams.search}%,description.ilike.%${validatedParams.search}%`
        );
      }
      if (validatedParams.topics) {
        const topicArray = validatedParams.topics
          .split(',')
          .map((t) => t.trim());
        query = query.contains('topics', topicArray);
      }

      // Apply sorting
      query = query.order(validatedParams.sort, {
        ascending: validatedParams.order === 'asc',
      });
    }

    // Apply pagination
    const from = validatedParams.offset;
    const to = from + validatedParams.limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch external link sources',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sources: data || [],
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

    console.error('Error fetching external link sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external link sources' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external-link-sources
 * Create a new external link source or bulk import
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = externalLinkSourcePostSchema.parse(body);

    const client = getSupabaseServerClient();

    // Verify user is an admin of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', validatedData.organization_id)
      .eq('user_id', userId)
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be an owner or admin' },
        { status: 403 }
      );
    }

    if (validatedData.bulk && validatedData.sources) {
      // Bulk import
      const sourcesToInsert = validatedData.sources.map((s) => ({
        organization_id: validatedData.organization_id,
        domain: s.domain,
        name: s.name,
        url: s.url || null,
        description: s.description || null,
        category: s.category || 'other',
        domain_authority: s.domain_authority || null,
        trustworthiness_score: s.trustworthiness_score || null,
        topics: s.topics || [],
        language: s.language || 'en',
        is_global: false,
        status: 'active' as const,
      }));

      const { data, error } = await client
        .from('external_link_sources')
        .insert(sourcesToInsert)
        .select();

      if (error) {
        console.error('Bulk insert error:', error);
        return NextResponse.json(
          { error: 'Failed to import sources', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        total: sourcesToInsert.length,
        successful: data?.length || 0,
        failed: 0,
        errors: [],
      });
    }

    // Single source creation
    const sourceToInsert: Database['public']['Tables']['external_link_sources']['Insert'] =
      {
        organization_id: validatedData.is_global
          ? null
          : validatedData.organization_id,
        domain: validatedData.domain,
        name: validatedData.name,
        url: validatedData.url || null,
        description: validatedData.description || null,
        category: validatedData.category,
        status: validatedData.status,
        domain_authority: validatedData.domain_authority || null,
        page_authority: validatedData.page_authority || null,
        spam_score: validatedData.spam_score || null,
        trustworthiness_score: validatedData.trustworthiness_score || null,
        is_global: validatedData.is_global ?? false,
        topics: validatedData.topics,
        language: validatedData.language,
        metadata:
          validatedData.metadata as Database['public']['Tables']['external_link_sources']['Insert']['metadata'],
      };

    const { data, error } = await client
      .from('external_link_sources')
      .insert(sourceToInsert)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        {
          error: 'Failed to create external link source',
          details: error.message,
        },
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

    console.error('Error creating external link source:', error);
    return NextResponse.json(
      { error: 'Failed to create external link source' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/external-link-sources?id=<source-id>
 * Delete (soft delete) an external link source
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
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // First check if user has access (source must belong to their org)
    const { data: source } = await client
      .from('external_link_sources')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.is_global) {
      return NextResponse.json(
        { error: 'Cannot delete global sources' },
        { status: 403 }
      );
    }

    // Check organization membership and role
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', source.organization_id)
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
      .from('external_link_sources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        {
          error: 'Failed to delete external link source',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting external link source:', error);
    return NextResponse.json(
      { error: 'Failed to delete external link source' },
      { status: 500 }
    );
  }
}

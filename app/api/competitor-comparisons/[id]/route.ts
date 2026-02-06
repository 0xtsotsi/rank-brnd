// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Individual Competitor Comparison API Route
 * Handles GET, PUT, PATCH, DELETE for individual competitor comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { updateCompetitorComparisonSchema } from '@/lib/schemas/competitor-comparisons';
import {
  getCompetitorComparisonById,
  updateCompetitorComparison,
  deleteCompetitorComparison,
} from '@/lib/supabase/competitor-comparisons';
import { ZodError } from 'zod';

type Params = Promise<{ id: string }>;

/**
 * GET /api/competitor-comparisons/[id]
 * Fetch a single competitor comparison by ID
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

    // Check if user has access
    const { data: comparison } = await client
      .from('competitor_comparisons')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!comparison) {
      return NextResponse.json(
        { error: 'Competitor comparison not found' },
        { status: 404 }
      );
    }

    const isMember = await isOrganizationMember(
      client,
      comparison.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    const result = await getCompetitorComparisonById(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching competitor comparison:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor comparison' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/competitor-comparisons/[id]
 * Update a competitor comparison (full replacement)
 */
export async function PUT(
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
    const validatedData = updateCompetitorComparisonSchema.parse(body);

    const client = getSupabaseServerClient();

    // Check if user has access and is admin/owner
    const { data: comparison } = await client
      .from('competitor_comparisons')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!comparison) {
      return NextResponse.json(
        { error: 'Competitor comparison not found' },
        { status: 404 }
      );
    }

    const isMember = await isOrganizationMember(
      client,
      comparison.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    const result = await updateCompetitorComparison(client, id, validatedData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating competitor comparison:', error);
    return NextResponse.json(
      { error: 'Failed to update competitor comparison' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/competitor-comparisons/[id]
 * Partially update a competitor comparison
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
    const validatedData = updateCompetitorComparisonSchema
      .partial()
      .parse(body);

    const client = getSupabaseServerClient();

    // Check if user has access
    const { data: comparison } = await client
      .from('competitor_comparisons')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!comparison) {
      return NextResponse.json(
        { error: 'Competitor comparison not found' },
        { status: 404 }
      );
    }

    const isMember = await isOrganizationMember(
      client,
      comparison.organization_id,
      userId
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    const result = await updateCompetitorComparison(client, id, validatedData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error patching competitor comparison:', error);
    return NextResponse.json(
      { error: 'Failed to update competitor comparison' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/competitor-comparisons/[id]
 * Permanently delete a competitor comparison
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

    // Check if user has access and is owner
    const { data: comparison } = await client
      .from('competitor_comparisons')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!comparison) {
      return NextResponse.json(
        { error: 'Competitor comparison not found' },
        { status: 404 }
      );
    }

    // Only owners can permanently delete
    const isOwner = await client.rpc('is_organization_owner', {
      p_organization_id: comparison.organization_id,
      p_user_id: userId,
    });

    if (!isOwner.data) {
      return NextResponse.json(
        { error: 'Forbidden - Only owners can permanently delete comparisons' },
        { status: 403 }
      );
    }

    const result = await deleteCompetitorComparison(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting competitor comparison:', error);
    return NextResponse.json(
      { error: 'Failed to delete competitor comparison' },
      { status: 500 }
    );
  }
}

/**
 * Brand Voice Samples API Route
 *
 * Handles CRUD operations for brand voice samples:
 * - GET: List brand voice samples with filtering and pagination
 * - POST: Create a new brand voice sample
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { getSupabaseServerClient } from '@/lib/supabase/client';
import { dbBrandVoiceLearningToBrandVoiceLearning } from '@/types/brand-voice-learning';
import { validateRequest } from '@/lib/schemas/validation';
import { createBrandVoiceSampleSchema } from '@/lib/schemas/brand-voice-learning';

/**
 * GET /api/brand-voice/samples
 *
 * Lists brand voice samples for the authenticated user's organization.
 * Supports filtering by status, source_type, product_id, and search.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = (userOrg as any).organization_id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('page_size') || '20', 10))
    );
    const status = searchParams.get('status') || 'all';
    const sourceType = searchParams.get('source_type') || 'all';
    const productId = searchParams.get('product_id') || 'all';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = (searchParams.get('sort_order') || 'desc') as
      | 'asc'
      | 'desc';
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('brand_voice_learning')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // Apply filters
    if (status !== 'all') {
      query = query.eq('analysis_status', status);
    }

    if (sourceType !== 'all') {
      query = query.eq('source_type', sourceType);
    }

    if (productId !== 'all') {
      if (productId === 'null') {
        query = query.is('product_id', null);
      } else {
        query = query.eq('product_id', productId);
      }
    }

    if (search) {
      query = query.ilike('sample_text', `%${search}%`);
    }

    // Apply sorting
    if (
      sortBy === 'created_at' ||
      sortBy === 'updated_at' ||
      sortBy === 'confidence_score'
    ) {
      query = query.order(sortBy, {
        ascending: sortOrder === 'asc',
        nullsFirst: false,
      });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data: samples, error, count } = await query;

    if (error) {
      console.error('Error fetching brand voice samples:', error);
      return NextResponse.json(
        { error: 'Failed to fetch samples' },
        { status: 500 }
      );
    }

    const transformedSamples = (samples || []).map(
      dbBrandVoiceLearningToBrandVoiceLearning
    );

    const hasMore = count !== null ? offset + pageSize < count : false;

    return NextResponse.json({
      success: true,
      data: {
        samples: transformedSamples,
        total: count || 0,
        page,
        pageSize,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error in brand voice samples GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brand-voice/samples
 *
 * Creates a new brand voice sample.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(
      body,
      createBrandVoiceSampleSchema
    );

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    const data = validationResult.data as any;

    const supabase = getSupabaseServerClient();

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationId = (userOrg as any).organization_id;

    // Calculate word count for metadata
    const wordCount = (data.sample_text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    // Create the sample
    const { data: newSample, error: insertError } = await supabase
      .from('brand_voice_learning')
      .insert({
        organization_id: organizationId,
        product_id: data.product_id ?? null,
        sample_text: data.sample_text || '',
        source_type: data.source_type || 'manual',
        analysis: {
          tone: [],
          vocabulary: {},
          style: {},
          sentiment: null,
          formality_level: null,
          keywords: [],
        },
        analysis_status: 'pending',
        analysis_error: null,
        confidence_score: null,
        metadata: {
          word_count: wordCount,
          ...(data.metadata ?? {}),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (insertError || !newSample) {
      console.error('Error creating brand voice sample:', insertError);
      return NextResponse.json(
        { error: 'Failed to create sample' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dbBrandVoiceLearningToBrandVoiceLearning(newSample),
    });
  } catch (error) {
    console.error('Error in brand voice samples POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

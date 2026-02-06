/**
 * Article Outline Generator API Route
 * Handles article outline generation with keyword, SERP, and brand voice integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  generateArticleOutlineSchema,
  listOutlinesQuerySchema,
  deleteOutlineSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas';
import {
  generateArticleOutline,
  listOrganizationOutlines,
  deleteOutline as deleteOutlineService,
} from '@/lib/article-outline-generator/service';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { APIErrors, handleAPIError } from '@/lib/api-error-handler';

/**
 * GET /api/article-outline-generator
 * Fetch article outlines with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      listOutlinesQuerySchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const params = validationResult.data;

    if (!params.organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('id')
      .eq('organization_id', params.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get outlines using the service
    const outlines = await listOrganizationOutlines(params.organization_id, {
      productId: params.product_id,
      keywordId: params.keyword_id,
      contentType: params.content_type,
      status: params.status,
      limit: params.limit,
      offset: params.offset,
    });

    return NextResponse.json({
      outlines,
      total: outlines.length,
    });
  } catch (error) {
    return handleAPIError(error, 'GET /api/article-outline-generator');
  }
}

/**
 * POST /api/article-outline-generator
 * Generate a new article outline
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
      generateArticleOutlineSchema
    );

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const data = validationResult.data;

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('id')
      .eq('organization_id', data.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Map Zod schema to service request
    const outlineRequest = {
      organizationId: data.organization_id,
      productId: data.product_id,
      keywordId: data.keyword_id,
      keyword: data.keyword,
      contentType: data.content_type,
      targetAudience: data.target_audience,
      detailLevel: data.detail_level,
      targetWordCount: data.target_word_count,
      sectionCount: data.section_count,
      serpIntegration: data.serp_integration,
      brandVoice: data.brand_voice,
      userId,
      additionalContext: data.additional_context,
    };

    // Generate the outline
    const result = await generateArticleOutline(outlineRequest);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'POST /api/article-outline-generator');
  }
}

/**
 * DELETE /api/article-outline-generator
 * Delete an article outline
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      deleteOutlineSchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { id, organization_id } = validationResult.data;

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the outline using the service
    await deleteOutlineService(id, organization_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'DELETE /api/article-outline-generator');
  }
}

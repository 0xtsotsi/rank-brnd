/**
 * Brand Voice Sample by ID API Route
 *
 * Handles operations for a specific brand voice sample:
 * - GET: Get a single sample by ID
 * - PATCH: Update a sample
 * - DELETE: Delete a sample
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { getSupabaseServerClient } from '@/lib/supabase/client';
import { dbBrandVoiceLearningToBrandVoiceLearning } from '@/types/brand-voice-learning';
import { validateRequest } from '@/lib/schemas/validation';
import {
  updateBrandVoiceSampleSchema,
  deleteBrandVoiceSampleSchema,
} from '@/lib/schemas/brand-voice-learning';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/brand-voice/samples/[id]
 *
 * Gets a single brand voice sample by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const sampleId = params.id;

    const supabase = getSupabaseServerClient();

    // Get user's organizations for access check
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);

    if (!userOrgs || userOrgs.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organizationIds = userOrgs.map((org) => (org as any).organization_id);

    // Fetch the sample
    const { data: sample, error } = await supabase
      .from('brand_voice_learning')
      .select('*')
      .eq('id', sampleId)
      .in('organization_id', organizationIds)
      .single();

    if (error || !sample) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: dbBrandVoiceLearningToBrandVoiceLearning(sample),
    });
  } catch (error) {
    console.error('Error in brand voice sample GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/brand-voice/samples/[id]
 *
 * Updates a brand voice sample.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const sampleId = params.id;

    const body = await request.json();
    const validationResult = validateRequest(
      body,
      updateBrandVoiceSampleSchema
    );

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const data = validationResult.data;

    const supabase = getSupabaseServerClient();

    // Check user's role in the organization
    const { data: sample } = await supabase
      .from('brand_voice_learning')
      .select('organization_id')
      .eq('id', sampleId)
      .single();

    if (!sample) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    const { data: memberRole } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (sample as any).organization_id)
      .eq('user_id', userId)
      .single();

    if (!memberRole || !['owner', 'admin'].includes((memberRole as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.sample_text !== undefined) {
      updateData.sample_text = data.sample_text;
      updateData.analysis_status = 'pending'; // Reset to pending if text changed
      updateData.analysis = {
        tone: [],
        vocabulary: {},
        style: {},
        sentiment: null,
        formality_level: null,
        keywords: [],
      };
      updateData.confidence_score = null;
      updateData.analysis_error = null;
    }

    if (data.source_type !== undefined) {
      updateData.source_type = data.source_type;
    }

    if (data.analysis !== undefined) {
      updateData.analysis = data.analysis;
    }

    if (data.analysis_status !== undefined) {
      updateData.analysis_status = data.analysis_status;
    }

    if (data.analysis_error !== undefined) {
      updateData.analysis_error = data.analysis_error;
    }

    if (data.confidence_score !== undefined) {
      updateData.confidence_score = data.confidence_score;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    const updateResult = await (supabase as any)
      .from('brand_voice_learning')
      .update(updateData)
      .eq('id', sampleId)
      .select()
      .single();

    const updatedSample = updateResult.data;
    const updateError = updateResult.error;

    if (updateError || !updatedSample) {
      console.error('Error updating brand voice sample:', updateError);
      return NextResponse.json(
        { error: 'Failed to update sample' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dbBrandVoiceLearningToBrandVoiceLearning(updatedSample as any),
    });
  } catch (error) {
    console.error('Error in brand voice sample PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brand-voice/samples/[id]
 *
 * Deletes a brand voice sample.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const sampleId = params.id;

    // Validate ID
    const validationResult = validateRequest(
      { id: sampleId },
      deleteBrandVoiceSampleSchema
    );
    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check user's role in the organization
    const { data: sample } = await supabase
      .from('brand_voice_learning')
      .select('organization_id')
      .eq('id', sampleId)
      .single();

    if (!sample) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    const { data: memberRole } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (sample as any).organization_id)
      .eq('user_id', userId)
      .single();

    if (!memberRole || !['owner', 'admin'].includes((memberRole as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('brand_voice_learning')
      .delete()
      .eq('id', sampleId);

    if (deleteError) {
      console.error('Error deleting brand voice sample:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete sample' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: sampleId },
    });
  } catch (error) {
    console.error('Error in brand voice sample DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Brand Voice Analysis API Route
 *
 * Handles brand voice analysis operations:
 * - POST: Trigger analysis for a sample or batch of samples
 * - GET: Get aggregated brand voice analysis for an organization/product
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { getSupabaseServerClient } from '@/lib/supabase/client';
import { dbBrandVoiceLearningToBrandVoiceLearning } from '@/types/brand-voice-learning';
import { validateRequest } from '@/lib/schemas/validation';
import {
  requestBrandVoiceAnalysisSchema,
  batchRequestBrandVoiceAnalysisSchema,
  getAggregatedBrandVoiceAnalysisSchema,
} from '@/lib/schemas/brand-voice-learning';
import {
  analyzeSampleById,
  batchAnalyzeSamples,
  generateStyleGuide,
  getAggregatedAnalysis,
  BrandVoiceAnalyzerError,
} from '@/lib/brand-voice/analyzer';

/**
 * POST /api/brand-voice/analyze
 *
 * Triggers analysis for brand voice samples.
 * Supports single sample analysis, batch analysis, and style guide generation.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...requestData } = body;

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

    // Handle different analysis actions
    if (action === 'analyze_sample') {
      // Validate request
      const validationResult = validateRequest(
        requestData,
        requestBrandVoiceAnalysisSchema
      );
      if (!validationResult.success) {
        return NextResponse.json(validationResult.error, { status: 400 });
      }

      // Type guard for successful validation
      if (!validationResult.data) {
        return NextResponse.json(
          { error: 'Validation failed' },
          { status: 400 }
        );
      }

      const { sample_id, force_refresh = false } = validationResult.data;

      // Verify user has access to this sample
      const { data: sample } = await supabase
        .from('brand_voice_learning')
        .select('id')
        .eq('id', sample_id)
        .eq('organization_id', organizationId)
        .single();

      if (!sample) {
        return NextResponse.json(
          { error: 'Sample not found' },
          { status: 404 }
        );
      }

      try {
        const result = await analyzeSampleById(sample_id, force_refresh);

        return NextResponse.json({
          success: true,
          data: {
            sample_id,
            analysis: result.analysis,
            confidence: result.confidence,
          },
        });
      } catch (analysisError) {
        if (analysisError instanceof BrandVoiceAnalyzerError) {
          return NextResponse.json(
            {
              error: analysisError.message,
              type: analysisError.type,
            },
            { status: 400 }
          );
        }
        throw analysisError;
      }
    }

    if (action === 'batch_analyze') {
      // Validate request
      const validationResult = validateRequest(
        requestData,
        batchRequestBrandVoiceAnalysisSchema
      );
      if (!validationResult.success) {
        return NextResponse.json(validationResult.error, { status: 400 });
      }

      if (!validationResult.data) {
        return NextResponse.json(
          { error: 'Validation failed' },
          { status: 400 }
        );
      }

      const { sample_ids } = validationResult.data;

      // Verify user has access to all samples
      const { data: samples } = await supabase
        .from('brand_voice_learning')
        .select('id')
        .eq('organization_id', organizationId)
        .in('id', sample_ids);

      if (!samples || samples.length !== sample_ids.length) {
        return NextResponse.json(
          { error: 'Some samples not found or access denied' },
          { status: 404 }
        );
      }

      const results = await batchAnalyzeSamples(sample_ids);

      return NextResponse.json({
        success: true,
        data: results,
      });
    }

    if (action === 'generate_style_guide') {
      // Validate request (only organization_id is required, product_id is optional)
      const dataToValidate = {
        organization_id: organizationId,
        ...requestData,
      };
      const validationResult = validateRequest(
        dataToValidate,
        getAggregatedBrandVoiceAnalysisSchema
      );
      if (!validationResult.success) {
        return NextResponse.json(validationResult.error, { status: 400 });
      }

      if (!validationResult.data) {
        return NextResponse.json(
          { error: 'Validation failed' },
          { status: 400 }
        );
      }

      const { product_id } = validationResult.data;

      try {
        const result = await generateStyleGuide(organizationId, product_id);

        return NextResponse.json({
          success: true,
          data: result,
        });
      } catch (analysisError) {
        if (analysisError instanceof BrandVoiceAnalyzerError) {
          return NextResponse.json(
            {
              error: analysisError.message,
              type: analysisError.type,
            },
            { status: 400 }
          );
        }
        throw analysisError;
      }
    }

    return NextResponse.json(
      {
        error:
          'Invalid action. Use: analyze_sample, batch_analyze, or generate_style_guide',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in brand voice analysis POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/brand-voice/analyze
 *
 * Gets aggregated brand voice analysis for an organization or product.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');

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

    // Get aggregated analysis
    const analysis = await getAggregatedAnalysis(
      organizationId,
      productId || undefined
    );

    if (!analysis) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No completed analyses found. Add and analyze more samples.',
          analysis: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error in brand voice analysis GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

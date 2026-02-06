/**
 * SERP Analysis API Routes
 *
 * Handles SERP (Search Engine Results Page) analysis operations
 * including fetching SERP data via SerpAPI and analyzing competitors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import {
  fetchTop10Results,
  analyzeSerp,
  isSerpApiConfigured,
  SerpApiException,
} from '@/lib/serpapi';
import {
  createSerpAnalysis,
  saveSerpAnalysisResults,
  updateSerpAnalysisStatus,
  getSerpAnalysisById,
  canUserAccessSerpAnalysis,
} from '@/lib/supabase/serp-analyses';

/**
 * GET /api/serp
 * Fetch SERP analysis results for a keyword or query
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('id');
    const keywordId = searchParams.get('keywordId');

    // Check if SerpAPI is configured
    if (!isSerpApiConfigured()) {
      return NextResponse.json(
        {
          error:
            'SerpAPI is not configured. Please set SERPAPI_API_KEY environment variable.',
        },
        { status: 503 }
      );
    }

    if (analysisId) {
      // Get existing analysis by ID
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Check access
      const hasAccess = await canUserAccessSerpAnalysis(
        supabase,
        analysisId,
        userId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const result = await getSerpAnalysisById(supabase, analysisId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }

      return NextResponse.json(result.data);
    }

    if (keywordId) {
      // Get latest analysis for keyword
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get keyword to check organization access
      const { data: keyword } = await supabase
        .from('keywords')
        .select('organization_id')
        .eq('id', keywordId)
        .single();

      if (!keyword) {
        return NextResponse.json(
          { error: 'Keyword not found' },
          { status: 404 }
        );
      }

      // Check if user is member of organization
      const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', (keyword as any).organization_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { data: analyses } = await supabase
        .from('serp_analyses')
        .select('*')
        .eq('keyword_id', keywordId)
        .eq('status', 'completed')
        .order('analyzed_at', { ascending: false })
        .limit(1);

      return NextResponse.json({
        analysis: (analyses as any)?.[0] || null,
        hasAnalysis: (analyses?.length || 0) > 0,
      });
    }

    return NextResponse.json(
      { error: 'Either id or keywordId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching SERP analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SERP analysis' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/serp
 * Create a new SERP analysis or analyze a query
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if SerpAPI is configured
    if (!isSerpApiConfigured()) {
      return NextResponse.json(
        {
          error:
            'SerpAPI is not configured. Please set SERPAPI_API_KEY environment variable.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      action,
      keywordId,
      query,
      organizationId,
      productId,
      device,
      location,
    } = body;

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'create') {
      // Create a pending SERP analysis record
      if (!keywordId || !query || !organizationId) {
        return NextResponse.json(
          { error: 'keywordId, query, and organizationId are required' },
          { status: 400 }
        );
      }

      // Check if user is member of organization
      const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const result = await createSerpAnalysis(supabase, {
        organization_id: organizationId,
        product_id: productId,
        keyword_id: keywordId,
        query,
        device: device || 'desktop',
        location: location || 'United States',
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json(result.data, { status: 201 });
    }

    if (action === 'analyze') {
      // Perform live SERP analysis
      if (!query) {
        return NextResponse.json(
          { error: 'Query is required' },
          { status: 400 }
        );
      }

      // Fetch SERP data
      const response = await fetchTop10Results(query, {
        device: device || 'desktop',
        location: location || 'United States',
      });

      // Analyze results
      const analysis = analyzeSerp(response, { query });

      return NextResponse.json(analysis);
    }

    if (action === 'analyze-and-save') {
      // Perform SERP analysis and save to database
      if (!keywordId || !query || !organizationId) {
        return NextResponse.json(
          { error: 'keywordId, query, and organizationId are required' },
          { status: 400 }
        );
      }

      // Check if user is member of organization
      const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Create pending analysis record
      const createResult = await createSerpAnalysis(supabase, {
        organization_id: organizationId,
        product_id: productId,
        keyword_id: keywordId,
        query,
        device: device || 'desktop',
        location: location || 'United States',
      });

      if (!createResult.success) {
        return NextResponse.json(
          { error: createResult.error },
          { status: 500 }
        );
      }

      const analysisId = createResult.data.id;

      // Update status to analyzing
      await updateSerpAnalysisStatus(supabase, analysisId, 'analyzing');

      // Fetch SERP data
      try {
        const response = await fetchTop10Results(query, {
          device: device || 'desktop',
          location: location || 'United States',
        });

        // Save results
        const saveResult = await saveSerpAnalysisResults(
          supabase,
          analysisId,
          response,
          {
            query,
            device: device || 'desktop',
            location: location || 'United States',
          }
        );

        if (!saveResult.success) {
          await updateSerpAnalysisStatus(
            supabase,
            analysisId,
            'failed',
            saveResult.error
          );
          return NextResponse.json(
            { error: saveResult.error },
            { status: 500 }
          );
        }

        return NextResponse.json(saveResult.data, { status: 201 });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        await updateSerpAnalysisStatus(
          supabase,
          analysisId,
          'failed',
          errorMessage
        );
        throw error;
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error creating SERP analysis:', error);

    if (error instanceof SerpApiException) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create SERP analysis' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/serp
 * Update a SERP analysis
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId, status } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check access
    const hasAccess = await canUserAccessSerpAnalysis(
      supabase,
      analysisId,
      userId
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update status
    if (status) {
      const result = await updateSerpAnalysisStatus(
        supabase,
        analysisId,
        status
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  } catch (error) {
    console.error('Error updating SERP analysis:', error);
    return NextResponse.json(
      { error: 'Failed to update SERP analysis' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/serp
 * Delete a SERP analysis
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
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check access
    const hasAccess = await canUserAccessSerpAnalysis(supabase, id, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('serp_analyses')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SERP analysis:', error);
    return NextResponse.json(
      { error: 'Failed to delete SERP analysis' },
      { status: 500 }
    );
  }
}

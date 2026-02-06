// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Exchange Requests API Route
 * Handles CRUD operations for backlink exchange requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { ZodError } from 'zod';

/**
 * GET /api/marketplace/requests
 * Fetch user's exchange requests
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get('organization_id') || undefined;
    const status = searchParams.get('status') || undefined;

    const client = getSupabaseServerClient();

    // If organization_id is provided, verify user is a member
    if (organization_id) {
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
    }

    // Mock data for demonstration - in production, query the exchange_requests table
    const mockRequests: any[] = [
      {
        id: 'req-1',
        organization_id: organization_id || 'org-1',
        product_id: null,
        article_id: 'art-1',
        source_url: 'https://mysite.com/article-1',
        source_domain_authority: 35,
        marketplace_site_id: 'site-1',
        marketplace_site: {
          domain: 'techblog.example.com',
          title: 'Tech Insights Blog',
          url: 'https://techblog.example.com',
        },
        target_url: 'https://mysite.com/ai-article',
        anchor_text: 'AI technology trends',
        status: 'pending',
        credits_used: 50,
        created_at: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
        approved_at: null,
        completed_at: null,
        notes: 'Looking for a backlink for our latest AI article',
        rejection_reason: null,
      },
      {
        id: 'req-2',
        organization_id: organization_id || 'org-1',
        product_id: null,
        article_id: 'art-2',
        source_url: 'https://mysite.com/article-2',
        source_domain_authority: 35,
        marketplace_site_id: 'site-2',
        marketplace_site: {
          domain: 'healthwise.example.com',
          title: 'Healthwise Magazine',
          url: 'https://healthwise.example.com',
        },
        target_url: 'https://mysite.com/nutrition-guide',
        anchor_text: 'healthy eating tips',
        status: 'approved',
        credits_used: 75,
        created_at: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        approved_at: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        completed_at: null,
        notes: null,
        rejection_reason: null,
      },
      {
        id: 'req-3',
        organization_id: organization_id || 'org-1',
        product_id: null,
        article_id: 'art-3',
        source_url: 'https://mysite.com/article-3',
        source_domain_authority: 35,
        marketplace_site_id: 'site-3',
        marketplace_site: {
          domain: 'financeguru.example.com',
          title: 'Finance Guru Daily',
          url: 'https://financeguru.example.com',
        },
        target_url: 'https://mysite.com/investment-tips',
        anchor_text: 'investment strategies',
        status: 'completed',
        credits_used: 40,
        created_at: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date(
          Date.now() - 20 * 24 * 60 * 60 * 1000
        ).toISOString(),
        approved_at: new Date(
          Date.now() - 28 * 24 * 60 * 60 * 1000
        ).toISOString(),
        completed_at: new Date(
          Date.now() - 20 * 24 * 60 * 60 * 1000
        ).toISOString(),
        notes: null,
        rejection_reason: null,
      },
    ];

    // Filter by status if provided
    let filteredRequests = mockRequests;
    if (status) {
      filteredRequests = mockRequests.filter((r) => r.status === status);
    }

    return NextResponse.json({
      requests: filteredRequests,
      total: filteredRequests.length,
    });
  } catch (error) {
    console.error('Error fetching exchange requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/requests
 * Create a new exchange request
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const { marketplace_site_id, target_url, article_id, anchor_text, notes } =
      body;

    if (!marketplace_site_id || !target_url) {
      return NextResponse.json(
        { error: 'marketplace_site_id and target_url are required' },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();

    // Get user's organization (simplified - in production, handle multiple orgs)
    const { data: orgMemberships } = await client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1);

    const organization_id = orgMemberships?.[0]?.organization_id;

    if (!organization_id) {
      return NextResponse.json(
        { error: 'User must belong to an organization' },
        { status: 400 }
      );
    }

    // In production, you would:
    // 1. Verify the site exists and is available
    // 2. Check user has enough credits
    // 3. Create the exchange request record
    // 4. Deduct credits

    // For demo, return a mock successful response
    const newRequest = {
      id: `req-${Date.now()}`,
      organization_id,
      product_id: null,
      article_id: article_id || null,
      source_url: 'https://mysite.com',
      source_domain_authority: 35,
      marketplace_site_id,
      marketplace_site: {
        domain: 'techblog.example.com',
        title: 'Tech Insights Blog',
        url: 'https://techblog.example.com',
      },
      target_url,
      anchor_text: anchor_text || null,
      status: 'pending',
      credits_used: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_at: null,
      completed_at: null,
      notes: notes || null,
      rejection_reason: null,
    };

    return NextResponse.json({
      request: newRequest,
      credits_remaining: 50, // Mock value
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating exchange request:', error);
    return NextResponse.json(
      { error: 'Failed to create exchange request' },
      { status: 500 }
    );
  }
}

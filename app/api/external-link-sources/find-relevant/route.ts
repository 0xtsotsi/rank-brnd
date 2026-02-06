// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Find Relevant External Link Sources
 * Analyzes content keywords and finds relevant external sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { findRelevantExternalSourcesSchema } from '@/lib/schemas/external-link-sources';
import { ZodError } from 'zod';

/**
 * POST /api/external-link-sources/find-relevant
 * Find relevant external sources for given keywords
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = findRelevantExternalSourcesSchema.parse(body);

    const client = getSupabaseServerClient();

    // If organization_id is provided, verify user is a member
    if (validatedData.organization_id) {
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
    }

    // Build query to find relevant sources
    let query = client
      .from('external_link_sources')
      .select('*')
      .eq('status', 'active')
      .is('deleted_at', null);

    // Filter by global or organization sources
    if (validatedData.organization_id) {
      query = query.or(
        `is_global.eq.true,organization_id.eq.${validatedData.organization_id}`
      );
    } else {
      query = query.eq('is_global', true);
    }

    // Filter by category if specified
    if (validatedData.category) {
      query = query.eq('category', validatedData.category);
    }

    // Filter by minimum authority if specified
    if (validatedData.min_authority) {
      query = query.gte('domain_authority', validatedData.min_authority);
    }

    const { data: sources, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch external sources', details: error.message },
        { status: 500 }
      );
    }

    // Calculate relevance scores for each source
    const scoredSources = (sources || [])
      .map((source) => {
        let relevanceScore = 0;
        const keywords = validatedData.content_keywords.map((k) =>
          k.toLowerCase()
        );
        const topics = (source.topics || []).map((t) => t.toLowerCase());
        const sourceName = source.name.toLowerCase();
        const sourceDesc = (source.description || '').toLowerCase();

        for (const keyword of keywords) {
          // Check for exact or partial matches
          if (sourceName.includes(keyword) || keyword.includes(sourceName)) {
            relevanceScore += 20;
          }
          if (sourceDesc.includes(keyword)) {
            relevanceScore += 15;
          }
          if (topics.some((t) => t.includes(keyword) || keyword.includes(t))) {
            relevanceScore += 10;
          }
        }

        // Authority bonus
        if (source.domain_authority) {
          if (source.domain_authority >= 80) {
            relevanceScore += 15;
          } else if (source.domain_authority >= 60) {
            relevanceScore += 10;
          } else if (source.domain_authority >= 40) {
            relevanceScore += 5;
          }
        }

        return {
          ...source,
          relevance_score: Math.min(100, relevanceScore),
        };
      })
      .filter((s) => s.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, validatedData.limit);

    return NextResponse.json({
      sources: scoredSources,
      total: scoredSources.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error finding relevant external sources:', error);
    return NextResponse.json(
      { error: 'Failed to find relevant external sources' },
      { status: 500 }
    );
  }
}

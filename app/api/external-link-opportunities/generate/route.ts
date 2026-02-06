// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Generate External Link Opportunities
 * Analyzes content and generates external link suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { generateExternalLinkOpportunitiesSchema } from '@/lib/schemas/external-link-opportunities';
import { ZodError } from 'zod';
import {
  analyzeContentForExternalLinks,
  matchContentWithSources,
} from '@/lib/external-linking';

/**
 * POST /api/external-link-opportunities/generate
 * Generate external link opportunities for content
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = generateExternalLinkOpportunitiesSchema.parse(body);

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

    // Analyze the content
    const contentAnalysis = analyzeContentForExternalLinks(
      validatedData.content,
      validatedData.keywords
    );

    // Fetch available external sources
    let query = client
      .from('external_link_sources')
      .select('*')
      .eq('status', 'active')
      .is('deleted_at', null)
      .or(
        'is_global.eq.true,organization_id.eq.' + validatedData.organization_id
      );

    // Filter by categories if specified
    if (validatedData.categories && validatedData.categories.length > 0) {
      query = query.in('category', validatedData.categories);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
      return NextResponse.json(
        {
          error: 'Failed to fetch external sources',
          details: sourcesError.message,
        },
        { status: 500 }
      );
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json({
        opportunities: [],
        contentAnalysis,
        message: 'No external sources available for matching',
      });
    }

    // Get existing external URLs from content to avoid duplicates
    const existingUrls = contentAnalysis.existingExternalLinks.map(
      (link) => link.url
    );

    // Match content with sources
    const suggestions = matchContentWithSources(contentAnalysis, sources, {
      minRelevanceScore: validatedData.min_relevance_score,
      maxSuggestions: validatedData.max_suggestions,
      linkType: validatedData.link_type,
      excludeExistingLinks: true,
      existingUrls,
      categories: validatedData.categories,
    });

    // Create opportunities in database
    const opportunitiesToInsert = suggestions.map((suggestion) => ({
      organization_id: validatedData.organization_id,
      product_id: validatedData.product_id || null,
      article_id: validatedData.article_id || null,
      external_source_id: suggestion.source.id,
      keyword: suggestion.keywords[0] || null,
      suggested_url: suggestion.suggestedUrl,
      suggested_anchor_text: suggestion.suggestedAnchorText,
      context_snippet: suggestion.contextSnippet || null,
      position_in_content: suggestion.positionInContent || null,
      relevance_score: suggestion.relevanceScore,
      link_type: suggestion.linkType,
      status: 'pending' as const,
    }));

    let createdOpportunities: any[] = [];
    if (opportunitiesToInsert.length > 0) {
      const { data, error: insertError } = await client
        .from('external_link_opportunities')
        .insert(opportunitiesToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting opportunities:', insertError);
        // Return suggestions even if database insert fails
        return NextResponse.json({
          opportunities: suggestions.map((s, i) => ({
            ...s,
            id: `temp-${i}`,
          })),
          contentAnalysis,
          savedToDatabase: false,
        });
      }

      createdOpportunities = data || [];
    }

    return NextResponse.json({
      opportunities: createdOpportunities.map((opp, i) => ({
        ...opp,
        source: suggestions[i]?.source,
      })),
      contentAnalysis,
      savedToDatabase: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error generating opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to generate opportunities' },
      { status: 500 }
    );
  }
}

// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Generate Internal Link Suggestions API Route
 * Analyzes article content and generates internal link suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { generateInternalLinkSuggestionsSchema } from '@/lib/schemas/internal-linking';
import { ZodError } from 'zod';
import {
  generateInternalLinkSuggestions,
  type ArticleForMatching,
} from '@/lib/internal-linking';
import {
  createInternalLinkSuggestions,
  getCandidateArticles,
} from '@/lib/internal-linking/database';

/**
 * POST /api/internal-link-suggestions/generate
 * Generate internal link suggestions for an article
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = generateInternalLinkSuggestionsSchema.parse(body);

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

    // Get the source article
    const { data: sourceArticle, error: articleError } = await client
      .from('articles')
      .select('*')
      .eq('id', validatedData.article_id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    if (articleError || !sourceArticle) {
      return NextResponse.json(
        { error: 'Source article not found' },
        { status: 404 }
      );
    }

    // Get candidate articles for matching
    const productId = validatedData.product_id || sourceArticle.product_id;

    const candidatesResult = await getCandidateArticles(
      client,
      validatedData.organization_id,
      productId,
      {
        status: ['published'],
        excludeArticleIds: [validatedData.article_id],
      }
    );

    if (!candidatesResult.success || !candidatesResult.data) {
      return NextResponse.json(
        {
          error: 'Failed to get candidate articles',
          details: candidatesResult.error,
        },
        { status: 500 }
      );
    }

    // Filter to preferred articles if specified
    let candidateArticles = candidatesResult.data;
    if (
      validatedData.preferred_article_ids &&
      validatedData.preferred_article_ids.length > 0
    ) {
      const preferredSet = new Set(validatedData.preferred_article_ids);
      const preferred = candidateArticles.filter((a) => preferredSet.has(a.id));
      const others = candidateArticles.filter((a) => !preferredSet.has(a.id));
      // Sort preferred first
      candidateArticles = [...preferred, ...others];
    }

    // Generate suggestions
    const suggestions = generateInternalLinkSuggestions(
      {
        id: sourceArticle.id,
        title: sourceArticle.title,
        content: sourceArticle.content,
        slug: sourceArticle.slug,
      },
      candidateArticles,
      {
        minRelevanceScore: validatedData.min_relevance_score,
        maxSuggestions: validatedData.max_suggestions,
        excludeKeywords: validatedData.exclude_keywords,
        linkType: validatedData.link_type,
        onlyPublishedArticles: true,
      }
    );

    if (suggestions.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        total_suggestions: 0,
        message: 'No relevant internal link suggestions found',
      });
    }

    // Save suggestions to database
    const suggestionsToInsert = suggestions.map((sugg) => ({
      organization_id: validatedData.organization_id,
      product_id: productId,
      source_article_id: validatedData.article_id,
      target_article_id: sugg.target_article_id,
      keyword: sugg.keywords[0] || null,
      suggested_anchor_text: sugg.suggested_anchor_text,
      context_snippet: sugg.context_snippet,
      position_in_content: sugg.position_in_content,
      relevance_score: sugg.relevance_score,
      link_type: sugg.link_type,
      metadata: {
        target_article_title: sugg.target_article_title,
        matching_keywords: sugg.keywords,
      },
    }));

    const saveResult = await createInternalLinkSuggestions(
      client,
      suggestionsToInsert
    );

    if (!saveResult.success) {
      console.error('Failed to save suggestions:', saveResult.error);
      // Return suggestions even if save failed
      return NextResponse.json({
        success: true,
        suggestions,
        total_suggestions: suggestions.length,
        save_error: saveResult.error,
      });
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions.map((s, i) => ({
        ...s,
        id: saveResult.data?.[i]?.id,
      })),
      total_suggestions: suggestions.length,
      saved_count: saveResult.data?.length || 0,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

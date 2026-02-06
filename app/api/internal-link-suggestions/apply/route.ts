// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Apply Internal Links API Route
 * Applies internal link suggestions to article content
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { isOrganizationMember } from '@/lib/supabase/organizations';
import { applyInternalLinksSchema } from '@/lib/schemas/internal-linking';
import { ZodError } from 'zod';
import { applyInternalLinksToContent } from '@/lib/internal-linking';
import { updateInternalLinkSuggestionStatuses } from '@/lib/internal-linking/database';

/**
 * POST /api/internal-link-suggestions/apply
 * Apply internal links to article content
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = applyInternalLinksSchema.parse(body);

    const client = getSupabaseServerClient();

    // Get the article to check organization access
    const { data: article } = await client
      .from('articles')
      .select('organization_id, product_id, content')
      .eq('id', validatedData.article_id)
      .single();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Verify user is an admin or owner of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', article.organization_id)
      .eq('user_id', userId)
      .single();

    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Forbidden - Must be an admin or owner' },
        { status: 403 }
      );
    }

    // Get the suggestions with target article details
    const { data: suggestions, error: suggestionsError } = await client
      .from('internal_link_suggestions')
      .select(
        `
        *,
        target_article:articles!internal_link_suggestions_target_article_id_fkey(
          id,
          title,
          slug
        )
      `
      )
      .in('id', validatedData.suggestion_ids)
      .eq('source_article_id', validatedData.article_id);

    if (suggestionsError || !suggestions || suggestions.length === 0) {
      return NextResponse.json(
        { error: 'No valid suggestions found' },
        { status: 404 }
      );
    }

    // Convert suggestions to the format expected by applyInternalLinksToContent
    const suggestionsToApply = suggestions.map((s: any) => ({
      target_article_id: s.target_article_id,
      target_article_title: s.target_article.title,
      target_article_slug: s.target_article.slug,
      target_article_excerpt: null,
      suggested_anchor_text: s.suggested_anchor_text || s.target_article.title,
      context_snippet: s.context_snippet || '',
      position_in_content: s.position_in_content,
      relevance_score: s.relevance_score || 50,
      keywords: s.keyword ? [s.keyword] : [],
      link_type: s.link_type,
    }));

    // Apply links to content
    const applyResult = applyInternalLinksToContent(
      article.content || '',
      suggestionsToApply,
      {
        maxLinks: suggestionsToApply.length,
        respectExistingLinks: true,
      }
    );

    // Update suggestion statuses to 'applied'
    const statusResult = await updateInternalLinkSuggestionStatuses(
      client,
      validatedData.suggestion_ids,
      'applied'
    );

    if (!statusResult.success) {
      console.error(
        'Failed to update suggestion statuses:',
        statusResult.error
      );
    }

    // Update article content if requested
    let updatedArticle = null;
    if (validatedData.update_content) {
      const { data: updated, error: updateError } = await client
        .from('articles')
        .update({ content: applyResult.updatedContent })
        .eq('id', validatedData.article_id)
        .select()
        .single();

      if (!updateError && updated) {
        updatedArticle = updated;
      }
    }

    return NextResponse.json({
      success: true,
      updated_content: applyResult.updatedContent,
      links_applied: applyResult.linksApplied,
      suggestions_updated: statusResult.data || [],
      errors: applyResult.errors,
      article_updated: updatedArticle !== null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error applying links:', error);
    return NextResponse.json(
      { error: 'Failed to apply links' },
      { status: 500 }
    );
  }
}

/**
 * Article Versions Cleanup API Route
 * Handles cleaning up old auto-save versions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cleanupVersionsSchema, validateRequest } from '@/lib/schemas';
import { getSupabaseServerClient } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/articles/[id]/versions/cleanup
 * Clean up old auto-save versions, keeping only the most recent N
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const articleId = params.id;

    const client = getSupabaseServerClient();

    // Check if user has access to the article
    const { data: article, error: articleError } = await client
      .from('articles')
      .select(
        `
        id,
        organization_id
      `
      )
      .eq('id', articleId)
      .filter('deleted_at', 'is', null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Cast article to proper type
    const articleData = article as { id: string; organization_id: string };

    // Check organization membership (only owner or admin can cleanup)
    const { data: member, error: memberError } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', articleData.organization_id)
      .eq('user_id', userId)
      .single();

    if (
      memberError ||
      !member ||
      !['owner', 'admin'].includes((member as any).role)
    ) {
      return NextResponse.json(
        { error: 'Forbidden - Only owners and admins can cleanup versions' },
        { status: 403 }
      );
    }

    // Parse request body for keep_auto_saves parameter
    let keepAutoSaves = 5;
    try {
      const body = await request.json();
      const validationResult = validateRequest(body, cleanupVersionsSchema);
      if (validationResult.success && validationResult.data) {
        keepAutoSaves = validationResult.data.keep_auto_saves;
      }
    } catch {
      // Use default value
    }

    // Get all auto-save versions ordered by date
    const { data: allAutoSaves, error: fetchError } = await client
      .from('article_versions')
      .select('id, changed_at')
      .eq('article_id', articleId)
      .eq('is_auto_save', true)
      .order('changed_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching auto-save versions:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      );
    }

    if (!allAutoSaves || allAutoSaves.length <= keepAutoSaves) {
      return NextResponse.json({
        deleted_count: 0,
        message: `No versions to delete. Found ${allAutoSaves?.length || 0} auto-save versions, keeping ${keepAutoSaves}.`,
      });
    }

    // Determine which versions to delete (keep the most recent N)
    const versionsToDelete = allAutoSaves.slice(keepAutoSaves);
    const idsToDelete = versionsToDelete.map((v: any) => v.id);

    // Delete the old auto-save versions
    const { error: deleteError, count } = await client
      .from('article_versions')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting versions:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete versions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deleted_count: idsToDelete.length,
      message: `Deleted ${idsToDelete.length} old auto-save versions, keeping the most recent ${keepAutoSaves}.`,
    });
  } catch (error) {
    console.error('Error cleaning up article versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Unpublish Article API Route
 * Handles unpublishing of published articles (reverts to draft)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { unpublishArticleSchema, validateRequest } from '@/lib/schemas';
import { unpublishArticle as unpublishArticleRecord } from '@/lib/supabase/articles';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/articles/unpublish
 * Unpublish a published article (revert to draft)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, unpublishArticleSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { id } = validationResult.data;

    const client = getSupabaseServerClient();

    // Check if user has admin/owner access to the article
    const { data: article } = await client
      .from('articles')
      .select('organization_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if ((article as any).status !== 'published') {
      return NextResponse.json(
        { error: 'Only published articles can be unpublished' },
        { status: 400 }
      );
    }

    const { data: memberRole } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', (article as any).organization_id)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .maybeSingle();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Only organization admins and owners can unpublish articles' },
        { status: 403 }
      );
    }

    const result = await unpublishArticleRecord(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'POST /api/articles/unpublish');
  }
}

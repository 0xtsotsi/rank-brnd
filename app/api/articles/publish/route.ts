/**
 * Publish Article API Route
 * Handles publishing of draft articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { publishArticleSchema, validateRequest } from '@/lib/schemas';
import { publishArticle as publishArticleRecord } from '@/lib/supabase/articles';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/articles/publish
 * Publish a draft article
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, publishArticleSchema);

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

    if ((article as any).status === 'published') {
      return NextResponse.json(
        { error: 'Article is already published' },
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
        { error: 'Only organization admins and owners can publish articles' },
        { status: 403 }
      );
    }

    const result = await publishArticleRecord(client, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleAPIError(error, 'POST /api/articles/publish');
  }
}

/**
 * Generate Slug API Route
 * Handles generating unique slugs for articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateSlugSchema, validateRequest } from '@/lib/schemas';
import { generateUniqueSlug } from '@/lib/supabase/articles';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import { handleAPIError } from '@/lib/api-error-handler';

/**
 * POST /api/articles/generate-slug
 * Generate a unique slug for an article based on the title
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, generateSlugSchema);

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        validationResult.error || { error: 'Validation failed' },
        { status: 400 }
      );
    }

    const { title, organization_id } = validationResult.data;

    const client = getSupabaseServerClient();

    // Verify user is a member of the organization
    const { data: member } = await client
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a member of the organization to generate slugs' },
        { status: 403 }
      );
    }

    const slug = await generateUniqueSlug(client, organization_id, title);

    return NextResponse.json({ slug });
  } catch (error) {
    return handleAPIError(error, 'POST /api/articles/generate-slug');
  }
}

// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Organizations API Route
 *
 * Handles organization creation during signup flow.
 * This creates an organization with a default product and links the user as owner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  createOrganization,
  generateUniqueSlug,
  DEFAULT_ORGANIZATION_SETTINGS,
} from '@/lib/supabase/organizations';
import {
  createProduct,
  generateUniqueProductSlug,
  DEFAULT_BRAND_COLORS,
  DEFAULT_TONE_PREFERENCES,
  DEFAULT_ANALYTICS_CONFIG,
} from '@/lib/supabase/products';

/**
 * POST /api/organizations
 *
 * Creates a new organization with:
 * - Organization name and slug
 * - Initial tier set to 'free'
 * - User linked as owner
 * - A default product created
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Validate name length
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Organization name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    // Get or generate slug
    let finalSlug =
      slug
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '') || '';
    if (!finalSlug) {
      // Generate slug from name
      finalSlug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    // Get Supabase client
    const supabase = getSupabaseServerClient();

    // Ensure slug is unique
    finalSlug = await generateUniqueSlug(supabase, finalSlug);

    // Get user from Clerk to sync to our database
    const clerkUser = await (
      await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      })
    ).json();

    // Create or update user in our database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          clerk_id: userId,
          email: clerkUser.email_addresses?.[0]?.email_address || '',
          name:
            `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() ||
            clerkUser.username ||
            'User',
          avatar_url: clerkUser.image_url || null,
          role: 'member',
          is_active: true,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'clerk_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (userError) {
      console.error('Error syncing user:', userError);
      return NextResponse.json(
        { error: 'Failed to sync user data' },
        { status: 500 }
      );
    }

    const dbUserId = userData.id;

    // Create the organization
    const orgResult = await createOrganization(supabase, {
      name: trimmedName,
      slug: finalSlug,
      clerk_id: null, // We manage organizations locally, not through Clerk
      tier: 'free',
      settings: DEFAULT_ORGANIZATION_SETTINGS,
      ownerId: dbUserId,
    });

    if (!orgResult.success) {
      console.error('Error creating organization:', orgResult.error);
      return NextResponse.json(
        { error: orgResult.error || 'Failed to create organization' },
        { status: 500 }
      );
    }

    const organization = orgResult.data;

    // Create a default product for the organization
    const defaultProductSlug = await generateUniqueProductSlug(
      supabase,
      organization.id,
      `${trimmedName.toLowerCase().replace(/\s+/g, '-')}-website`
    );

    const productResult = await createProduct(supabase, {
      organization_id: organization.id,
      name: `${trimmedName} Website`,
      slug: defaultProductSlug,
      url: null,
      description: `Default product for ${trimmedName}`,
      status: 'active',
      brand_colors: DEFAULT_BRAND_COLORS,
      tone_preferences: DEFAULT_TONE_PREFERENCES,
      analytics_config: DEFAULT_ANALYTICS_CONFIG,
      metadata: {
        is_default: true,
        created_during_onboarding: true,
      },
    });

    if (!productResult.success) {
      console.error('Error creating default product:', productResult.error);
      // Don't fail the request if product creation fails, just log it
    }

    return NextResponse.json(
      {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          tier: organization.tier,
        },
        product: productResult.success
          ? {
              id: productResult.data.id,
              name: productResult.data.name,
              slug: productResult.data.slug,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations
 *
 * Fetch all organizations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // First get the user's internal ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      // User might not exist in our database yet
      return NextResponse.json({ organizations: [] }, { status: 200 });
    }

    // Get user's organizations via the database function
    const { data: orgData, error: orgError } = await supabase.rpc(
      'get_user_organizations' as never,
      {
        p_user_id: user.id,
      } as never
    );

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      organizations: orgData || [],
    });
  } catch (error) {
    console.error('Error in GET /api/organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

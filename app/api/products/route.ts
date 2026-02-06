// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Products API Route
 * Handles CRUD operations for products/websites with proper organization isolation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getOrganizationProducts,
  createProduct,
  generateUniqueProductSlug,
  DEFAULT_BRAND_COLORS,
  DEFAULT_TONE_PREFERENCES,
  DEFAULT_ANALYTICS_CONFIG,
} from '@/lib/supabase/products';
import {
  createProductSchema,
  productQuerySchema,
} from '@/lib/schemas/products';
import { validateRequest, validateQueryParams } from '@/lib/schemas/validation';
import type { Database } from '@/types/database';

/**
 * GET /api/products
 * Fetch all products for the user's organization with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const validationResult = validateQueryParams(
      searchParams,
      productQuerySchema
    );
    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    const { search, status, page, limit, sort, order } = validationResult.data;

    const supabase = getSupabaseServerClient();

    // Get the user's organizations
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        products: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      });
    }

    // Get user's organizations
    const { data: orgData, error: orgError } = await supabase.rpc(
      'get_user_organizations' as never,
      { p_user_id: user.id } as never
    );

    if (orgError || !orgData || orgData.length === 0) {
      return NextResponse.json({
        products: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      });
    }

    // Get products from all user's organizations
    const organizationIds = orgData.map((org: any) => org.id);
    let allProducts: Database['public']['Tables']['products']['Row'][] = [];

    for (const orgId of organizationIds) {
      const result = await getOrganizationProducts(supabase, orgId, {
        status: status === 'all' ? undefined : (status as any),
      });
      if (result.success && result.data) {
        allProducts = [...allProducts, ...result.data];
      }
    }

    // Filter by search term if provided
    let filteredProducts = allProducts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = allProducts.filter(
        (p: Database['public']['Tables']['products']['Row']) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.url && p.url.toLowerCase().includes(searchLower)) ||
          (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort products
    filteredProducts.sort((a, b) => {
      const aValue =
        a[sort as keyof Database['public']['Tables']['products']['Row']];
      const bValue =
        b[sort as keyof Database['public']['Tables']['products']['Row']];
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const total = filteredProducts.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    return NextResponse.json({
      products: paginatedProducts,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product in the user's organization
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, createProductSchema);
    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    const data = validationResult.data;

    const supabase = getSupabaseServerClient();

    // Get the user's internal ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Get user's first organization (or allow org_id to be passed)
    const { data: orgData, error: orgError } = await supabase.rpc(
      'get_user_organizations' as never,
      { p_user_id: user.id } as never
    );

    if (orgError || !orgData || orgData.length === 0) {
      return NextResponse.json(
        { error: 'User must belong to an organization to create products' },
        { status: 403 }
      );
    }

    // Use provided organization_id or default to first organization
    const organizationId = body.organization_id || orgData[0].id;

    // Verify user belongs to the specified organization
    if (!orgData.find((org: any) => org.id === organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization' },
        { status: 403 }
      );
    }

    // Generate unique slug if not provided
    const slug =
      data.slug ||
      (await generateUniqueProductSlug(supabase, organizationId, data.name));

    // Build brand colors
    const brandColors = data.brand_colors || {
      primary: data.primaryColor || DEFAULT_BRAND_COLORS.primary,
      secondary: data.secondaryColor || DEFAULT_BRAND_COLORS.secondary,
      accent: data.accentColor || DEFAULT_BRAND_COLORS.accent,
    };

    // Build tone preferences
    const tonePreferences = data.tone_preferences || {
      ...DEFAULT_TONE_PREFERENCES,
      ...(data.tone && { tone: data.tone }),
    };

    // Build analytics config
    const analyticsConfig = data.analytics_config || DEFAULT_ANALYTICS_CONFIG;

    // Build metadata
    const metadata = {
      ...data.metadata,
      ...(data.logoUrl && { logo: data.logoUrl }),
      ...(data.industry && { industry: data.industry }),
      ...(data.targetAudience && { target_audience: data.targetAudience }),
    };

    // Create the product
    const result = await createProduct(supabase, {
      organization_id: organizationId,
      name: data.name,
      slug,
      url: data.url,
      description: data.description,
      status: data.status,
      brand_colors: brandColors as any,
      tone_preferences: tonePreferences as any,
      analytics_config: analyticsConfig as any,
      metadata: metadata as any,
    });

    if (!result.success) {
      console.error('Error creating product:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to create product' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products
 * Update an existing product (by ID in request body)
 * Note: For path-based updates, use /api/products/[id]
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Check if user can access this product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, organization_members!inner(user_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify user belongs to the product's organization
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: memberCheck } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', product.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberCheck) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this product' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: Database['public']['Tables']['products']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    // Map request body fields to database fields
    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.url !== undefined) updates.url = body.url || null;
    if (body.description !== undefined)
      updates.description = body.description || null;
    if (body.status !== undefined) updates.status = body.status;

    // Handle nested objects
    if (
      body.primaryColor ||
      body.secondaryColor ||
      body.accentColor ||
      body.brand_colors
    ) {
      updates.brand_colors = {
        primary: body.primaryColor || product.brand_colors.primary,
        secondary: body.secondaryColor || product.brand_colors.secondary,
        accent: body.accentColor || product.brand_colors.accent,
        ...(body.brand_colors || {}),
      } as any;
    }

    if (body.tone || body.tone_preferences) {
      updates.tone_preferences = {
        ...product.tone_preferences,
        ...(body.tone && { tone: body.tone }),
        ...(body.tone_preferences || {}),
      } as any;
    }

    if (body.analytics_config) {
      updates.analytics_config = {
        ...product.analytics_config,
        ...body.analytics_config,
      } as any;
    }

    if (body.logoUrl || body.industry || body.targetAudience || body.metadata) {
      updates.metadata = {
        ...product.metadata,
        ...(body.logoUrl && { logo: body.logoUrl }),
        ...(body.industry && { industry: body.industry }),
        ...(body.targetAudience && { target_audience: body.targetAudience }),
        ...(body.metadata || {}),
      } as any;
    }

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating product:', updateError);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products
 * Delete a product by ID (soft delete)
 * Note: For path-based deletion, use /api/products/[id]
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify user belongs to the product's organization
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: memberCheck } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', product.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberCheck) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this product' },
        { status: 403 }
      );
    }

    // Soft delete the product
    const { error: deleteError } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting product:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

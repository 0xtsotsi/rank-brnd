// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Individual Product API Route
 * Handles GET, PUT, PATCH, and DELETE operations for a specific product by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseServerClient } from '@/lib/supabase/client';
import {
  getProductById,
  updateProduct,
  softDeleteProduct,
} from '@/lib/supabase/products';
import { updateProductSchema } from '@/lib/schemas/products';
import { validateRequest } from '@/lib/schemas/validation';
import { ZodError } from 'zod';
import type { Database } from '@/types/database';

/**
 * GET /api/products/[id]
 * Fetch a single product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productId = (await params).id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the user's internal ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can access this product via organization membership
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .is('deleted_at', null)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify user belongs to the product's organization
    const { data: memberCheck } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', product.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberCheck) {
      return NextResponse.json(
        { error: 'Forbidden - Product not found or access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]
 * Fully replace a product by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productId = (await params).id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate update data
    const validatedData = updateProductSchema.parse(body);

    const supabase = getSupabaseServerClient();

    // Get the user's internal ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .is('deleted_at', null)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify user belongs to the product's organization
    const { data: memberCheck } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', product.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberCheck) {
      return NextResponse.json(
        { error: 'Forbidden - Product not found or access denied' },
        { status: 403 }
      );
    }

    // Build the update object, only including fields that were provided
    const updates: Database['public']['Tables']['products']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.name !== undefined) updates.name = validatedData.name;
    if (validatedData.slug !== undefined) updates.slug = validatedData.slug;
    if (validatedData.url !== undefined) updates.url = validatedData.url;
    if (validatedData.description !== undefined)
      updates.description = validatedData.description;
    if (validatedData.status !== undefined)
      updates.status = validatedData.status;
    if (validatedData.brand_colors !== undefined)
      updates.brand_colors = validatedData.brand_colors as any;
    if (validatedData.tone_preferences !== undefined)
      updates.tone_preferences = validatedData.tone_preferences as any;
    if (validatedData.analytics_config !== undefined)
      updates.analytics_config = validatedData.analytics_config as any;
    if (validatedData.metadata !== undefined)
      updates.metadata = validatedData.metadata as any;

    const result = await updateProduct(supabase, productId, updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Partially update a product by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH behaves the same as PUT for this API (both allow partial updates)
  return PUT(request, { params });
}

/**
 * DELETE /api/products/[id]
 * Delete a product by ID (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productId = (await params).id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Get the user's internal ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .is('deleted_at', null)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify user belongs to the product's organization
    const { data: memberCheck } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', product.organization_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberCheck) {
      return NextResponse.json(
        { error: 'Forbidden - Product not found or access denied' },
        { status: 403 }
      );
    }

    const result = await softDeleteProduct(supabase, productId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
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

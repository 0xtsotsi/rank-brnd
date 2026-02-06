// @ts-nocheck - Database types need to be regenerated with Supabase CLI

/**
 * Images Utilities
 *
 * Helper functions for working with images owned by organizations.
 * These functions wrap Supabase queries with proper typing and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Json } from '@/types/database';

type Image = Database['public']['Tables']['images']['Row'];
type ImageInsert = Database['public']['Tables']['images']['Insert'];
type ImageUpdate = Database['public']['Tables']['images']['Update'];

type ImageStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Result type for image operations
 */
export type ImageResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Image metadata interface
 */
export interface ImageMetadata {
  prompt?: string;
  generation_source?: 'ai' | 'upload' | 'url';
  ai_model?: string;
  revised_prompt?: string;
  brand_colors_applied?: boolean;
  [key: string]: unknown;
}

/**
 * Default metadata for images
 */
export const DEFAULT_IMAGE_METADATA: ImageMetadata = {};

/**
 * Get an image by ID
 */
export async function getImageById(
  client: SupabaseClient<Database>,
  imageId: string
): Promise<ImageResult<Image>> {
  try {
    const { data, error } = await client
      .from('images')
      .select('*')
      .eq('id', imageId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Image not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch image',
    };
  }
}

/**
 * Get all images for an organization
 */
export async function getOrganizationImages(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: {
    includeDeleted?: boolean;
    productId?: string;
    articleId?: string;
    status?: ImageStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ImageResult<Image[]>> {
  try {
    let query = client
      .from('images')
      .select('*')
      .eq('organization_id', organizationId);

    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.articleId) {
      query = query.eq('article_id', options.articleId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false });

    if (options.limit) {
      query = query.range(
        options.offset || 0,
        (options.offset || 0) + options.limit - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) throw new Error('No images found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch images',
    };
  }
}

/**
 * Get images for a specific article
 */
export async function getArticleImages(
  client: SupabaseClient<Database>,
  articleId: string
): Promise<ImageResult<Image[]>> {
  try {
    const { data, error } = await client
      .from('images')
      .select('*')
      .eq('article_id', articleId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data) throw new Error('No images found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch article images',
    };
  }
}

/**
 * Get images for a specific product
 */
export async function getProductImages(
  client: SupabaseClient<Database>,
  productId: string
): Promise<ImageResult<Image[]>> {
  try {
    const { data, error } = await client
      .from('images')
      .select('*')
      .eq('product_id', productId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) throw new Error('No images found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch product images',
    };
  }
}

/**
 * Create a new image
 */
export async function createImage(
  client: SupabaseClient<Database>,
  image: ImageInsert
): Promise<ImageResult<Image>> {
  try {
    const { data, error } = await client
      .from('images')
      .insert({
        organization_id: image.organization_id,
        product_id: image.product_id || null,
        article_id: image.article_id || null,
        url: image.url,
        storage_path: image.storage_path || null,
        alt_text: image.alt_text || null,
        caption: image.caption || null,
        title: image.title || null,
        description: image.description || null,
        style: image.style || null,
        width: image.width || null,
        height: image.height || null,
        file_size: image.file_size || null,
        mime_type: image.mime_type || null,
        format: image.format || null,
        status: image.status || 'completed',
        metadata: (image.metadata || DEFAULT_IMAGE_METADATA) as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create image');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create image',
    };
  }
}

/**
 * Create multiple images (bulk insert)
 */
export async function createImages(
  client: SupabaseClient<Database>,
  images: ImageInsert[]
): Promise<ImageResult<Image[]>> {
  try {
    const processedImages = images.map((image) => ({
      organization_id: image.organization_id,
      product_id: image.product_id || null,
      article_id: image.article_id || null,
      url: image.url,
      storage_path: image.storage_path || null,
      alt_text: image.alt_text || null,
      caption: image.caption || null,
      title: image.title || null,
      description: image.description || null,
      style: image.style || null,
      width: image.width || null,
      height: image.height || null,
      file_size: image.file_size || null,
      mime_type: image.mime_type || null,
      format: image.format || null,
      status: image.status || 'completed',
      metadata: (image.metadata || DEFAULT_IMAGE_METADATA) as unknown as Json,
    }));

    const { data, error } = await client
      .from('images')
      .insert(processedImages)
      .select();

    if (error) throw error;
    if (!data) throw new Error('Failed to create images');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create images',
    };
  }
}

/**
 * Update an image
 */
export async function updateImage(
  client: SupabaseClient<Database>,
  imageId: string,
  updates: ImageUpdate
): Promise<ImageResult<Image>> {
  try {
    const { data, error } = await client
      .from('images')
      .update(updates)
      .eq('id', imageId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Image not found');

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update image',
    };
  }
}

/**
 * Soft delete an image
 */
export async function softDeleteImage(
  client: SupabaseClient<Database>,
  imageId: string
): Promise<ImageResult<void>> {
  try {
    const { error } = await client
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', imageId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    };
  }
}

/**
 * Permanently delete an image (use with caution)
 */
export async function deleteImage(
  client: SupabaseClient<Database>,
  imageId: string
): Promise<ImageResult<void>> {
  try {
    const { error } = await client.from('images').delete().eq('id', imageId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    };
  }
}

/**
 * Update image status
 */
export async function updateImageStatus(
  client: SupabaseClient<Database>,
  imageId: string,
  status: ImageStatus
): Promise<ImageResult<Image>> {
  return updateImage(client, imageId, { status });
}

/**
 * Link an image to an article
 */
export async function linkImageToArticle(
  client: SupabaseClient<Database>,
  imageId: string,
  articleId: string
): Promise<ImageResult<Image>> {
  return updateImage(client, imageId, { article_id: articleId });
}

/**
 * Link an image to a product
 */
export async function linkImageToProduct(
  client: SupabaseClient<Database>,
  imageId: string,
  productId: string
): Promise<ImageResult<Image>> {
  return updateImage(client, imageId, { product_id: productId });
}

/**
 * Unlink an image from an article
 */
export async function unlinkImageFromArticle(
  client: SupabaseClient<Database>,
  imageId: string
): Promise<ImageResult<Image>> {
  return updateImage(client, imageId, { article_id: null });
}

/**
 * Unlink an image from a product
 */
export async function unlinkImageFromProduct(
  client: SupabaseClient<Database>,
  imageId: string
): Promise<ImageResult<Image>> {
  return updateImage(client, imageId, { product_id: null });
}

/**
 * Check if a user can access an image (via organization membership)
 */
export async function canUserAccessImage(
  client: SupabaseClient<Database>,
  imageId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await client.rpc('can_access_image', {
      p_image_id: imageId,
      p_user_id: userId,
    });

    return result.data === true;
  } catch {
    return false;
  }
}

/**
 * Get image count for an organization
 */
export async function getOrganizationImageCount(
  client: SupabaseClient<Database>,
  organizationId: string,
  options: { productId?: string; articleId?: string } = {}
): Promise<ImageResult<number>> {
  try {
    let query = client
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }

    if (options.articleId) {
      query = query.eq('article_id', options.articleId);
    }

    const { count, error } = await query;

    if (error) throw error;

    return { success: true, data: count || 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to count images',
    };
  }
}

/**
 * Supabase Storage Utilities
 *
 * This module provides utility functions for uploading and managing images
 * in Supabase Storage.
 */

import { getSupabaseBrowserClient, getSupabaseServerClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Default bucket name for image storage
 */
export const DEFAULT_IMAGE_BUCKET = 'images';

/**
 * Supported image file types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/**
 * Maximum file size (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Image upload options
 */
export interface UploadOptions {
  bucket?: string;
  upsert?: boolean;
  cacheControl?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Upload result
 */
export interface UploadResult {
  path: string;
  fullPath: string;
  url: string;
  publicUrl: string;
}

/**
 * Error types
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Validates an image file before upload
 *
 * @param file - The file to validate
 * @throws {StorageError} If the file is invalid
 */
export function validateImageFile(file: File): void {
  // Check if file exists
  if (!file) {
    throw new StorageError('No file provided', 'NO_FILE');
  }

  // Check file type
  if (!file.type) {
    throw new StorageError('File type not detected', 'NO_FILE_TYPE');
  }

  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
    throw new StorageError(
      `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(', ')}`,
      'UNSUPPORTED_TYPE'
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError(
      `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      'FILE_TOO_LARGE'
    );
  }
}

/**
 * Generates a unique file path for uploaded images
 *
 * @param file - The file being uploaded
 * @param userId - Optional user ID for organizing files
 * @returns A unique file path
 */
export function generateFilePath(file: File, userId?: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop() || 'jpg';
  const userPrefix = userId ? `${userId}/` : '';

  return `${userPrefix}${timestamp}-${randomString}.${extension}`;
}

/**
 * Uploads an image to Supabase Storage (browser/client-side)
 *
 * @param file - The image file to upload
 * @param options - Upload options
 * @returns The upload result with public URL
 * @throws {StorageError} If upload fails
 */
export async function uploadImage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    bucket = DEFAULT_IMAGE_BUCKET,
    upsert = false,
    cacheControl = '3600',
    metadata = {},
  } = options;

  // Validate the file
  validateImageFile(file);

  try {
    const supabase = getSupabaseBrowserClient();
    const filePath = generateFilePath(file);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert,
        cacheControl,
        contentType: file.type,
        metadata,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      fullPath: data.path,
      url: urlData.publicUrl,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }

    throw new StorageError(
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UPLOAD_FAILED'
    );
  }
}

/**
 * Uploads an image to Supabase Storage (server-side)
 *
 * @param file - The image file to upload
 * @param options - Upload options
 * @returns The upload result with public URL
 * @throws {StorageError} If upload fails
 */
export async function uploadImageServer(
  file: File | Buffer,
  filename: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    bucket = DEFAULT_IMAGE_BUCKET,
    upsert = false,
    cacheControl = '3600',
    contentType,
    metadata = {},
  } = options;

  try {
    const supabase = getSupabaseServerClient();
    const filePath = generateFilePath({
      name: filename,
    } as File);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert,
        cacheControl,
        contentType,
        metadata,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      fullPath: data.path,
      url: urlData.publicUrl,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    throw new StorageError(
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UPLOAD_FAILED'
    );
  }
}

/**
 * Deletes an image from Supabase Storage
 *
 * @param path - The path of the image to delete
 * @param bucket - The bucket name (defaults to DEFAULT_IMAGE_BUCKET)
 * @throws {StorageError} If deletion fails
 */
export async function deleteImage(
  path: string,
  bucket: string = DEFAULT_IMAGE_BUCKET
): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw new StorageError(
      `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DELETE_FAILED'
    );
  }
}

/**
 * Lists all images in a bucket for a specific user
 *
 * @param userId - The user ID to filter by
 * @param bucket - The bucket name (defaults to DEFAULT_IMAGE_BUCKET)
 * @returns Array of image metadata
 * @throws {StorageError} If listing fails
 */
export async function listUserImages(
  userId: string,
  bucket: string = DEFAULT_IMAGE_BUCKET
): Promise<any[]> {
  try {
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.storage.from(bucket).list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw new StorageError(
      `Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'LIST_FAILED'
    );
  }
}

/**
 * Gets the public URL for an image
 *
 * @param path - The path of the image
 * @param bucket - The bucket name (defaults to DEFAULT_IMAGE_BUCKET)
 * @returns The public URL
 */
export function getImagePublicUrl(
  path: string,
  bucket: string = DEFAULT_IMAGE_BUCKET
): string {
  const supabase = getSupabaseBrowserClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

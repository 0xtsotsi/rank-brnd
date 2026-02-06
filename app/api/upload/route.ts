/**
 * Image Upload API Route
 *
 * This API route handles image uploads to Supabase Storage.
 * It accepts multipart/form-data uploads and returns the public URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import {
  uploadImageServer,
  validateImageFile,
  StorageError,
} from '@/lib/supabase/storage';

// export const runtime = 'edge';

/**
 * POST /api/upload
 *
 * Uploads an image to Supabase Storage
 *
 * Request body (multipart/form-data):
 * - file: The image file to upload
 * - bucket: (optional) The bucket name (defaults to 'images')
 *
 * Response:
 * - success: boolean
 * - url: string (public URL of the uploaded image)
 * - path: string (storage path)
 * - error: string (if upload failed)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate the file
    try {
      validateImageFile(file);
    } catch (error) {
      if (error instanceof StorageError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }

    // Convert file to buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const result = await uploadImageServer(buffer, file.name, {
      bucket: bucket || undefined,
      upsert: false,
      metadata: {
        uploadedBy: userId,
        originalName: file.name,
      },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      url: result.publicUrl,
      path: result.path,
      fullPath: result.fullPath,
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to upload image',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 *
 * Returns information about the upload endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/upload',
    method: 'POST',
    description: 'Upload images to Supabase Storage',
    supportedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    maxSize: '5MB',
    authentication: 'Required (Clerk)',
  });
}

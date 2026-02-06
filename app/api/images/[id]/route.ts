/**
 * Individual Image API Route
 *
 * GET /api/images/[id] - Gets a single generated image
 * DELETE /api/images/[id] - Deletes a generated image
 *
 * Query parameters:
 * - organizationId: string (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getImage,
  deleteImage as deleteImageService,
} from '@/lib/image-generation';
import { ImageGenerationError } from '@/types/image-generation';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET handler for retrieving a single image
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Get the image
    const image = await getImage(id, organizationId);

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error('Error getting image:', error);

    if (error instanceof ImageGenerationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorType: error.type,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get image',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting an image
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Delete the image
    await deleteImageService(id, organizationId);

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting image:', error);

    if (error instanceof ImageGenerationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorType: error.type,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete image',
      },
      { status: 500 }
    );
  }
}

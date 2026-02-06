/**
 * Images API Route
 *
 * Handles CRUD operations for image metadata linked to organizations,
 * products, and articles.
 *
 * GET /api/images - Lists images for an organization
 * POST /api/images - Creates a new image or bulk imports
 * PATCH /api/images - Updates an existing image
 * DELETE /api/images - Soft deletes an image
 *
 * Query parameters for GET:
 * - organization_id: string (UUID)
 * - product_id: string (UUID, optional)
 * - article_id: string (UUID, optional)
 * - status: 'pending' | 'processing' | 'completed' | 'failed' (optional)
 * - style: string (optional)
 * - search: string (optional) - searches in title, alt_text, description
 * - sort: 'created_at' | 'updated_at' | 'title' | 'url' | 'file_size' (default: created_at)
 * - order: 'asc' | 'desc' (default: desc)
 * - limit: number (1-100, default: 50)
 * - offset: number (default: 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  imagesQuerySchema,
  imagesPostSchema,
  validateRequest,
  validateQueryParams,
} from '@/lib/schemas';

export const runtime = 'nodejs';

// Image type definition for mock data
type MockImage = {
  id: string;
  organization_id: string;
  product_id: string | null;
  article_id: string | null;
  url: string;
  storage_path: string | null;
  alt_text: string | null;
  caption: string | null;
  title: string | null;
  description: string | null;
  style: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
  format: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

// Mock image data - replace with actual database queries using lib/supabase/images
const mockImages: MockImage[] = [
  {
    id: 'img-1',
    organization_id: 'org-123',
    product_id: 'prod-1',
    article_id: 'art-1',
    url: 'https://example.com/images/hero.jpg',
    storage_path: 'images/hero.jpg',
    alt_text: 'Hero image showing a modern workspace',
    caption: 'Modern office setup',
    title: 'Hero Image',
    description: 'A beautiful hero image for the homepage',
    style: 'modern',
    width: 1920,
    height: 1080,
    file_size: 245000,
    mime_type: 'image/jpeg',
    format: 'jpeg',
    status: 'completed',
    metadata: {},
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
    deleted_at: null,
  },
  {
    id: 'img-2',
    organization_id: 'org-123',
    product_id: 'prod-1',
    article_id: null,
    url: 'https://example.com/images/product-1.png',
    storage_path: 'images/product-1.png',
    alt_text: 'Product screenshot',
    caption: null,
    title: 'Product Screenshot',
    description: null,
    style: 'minimal',
    width: 800,
    height: 600,
    file_size: 125000,
    mime_type: 'image/png',
    format: 'png',
    status: 'completed',
    metadata: {},
    created_at: new Date('2024-01-14'),
    updated_at: new Date('2024-01-14'),
    deleted_at: null,
  },
  {
    id: 'img-3',
    organization_id: 'org-123',
    product_id: null,
    article_id: 'art-2',
    url: 'https://example.com/images/blog-featured.jpg',
    storage_path: 'images/blog-featured.jpg',
    alt_text: 'Featured blog image',
    caption: 'Blog post illustration',
    title: 'Blog Featured Image',
    description: 'Featured image for blog posts',
    style: 'editorial',
    width: 1200,
    height: 630,
    file_size: 180000,
    mime_type: 'image/jpeg',
    format: 'jpeg',
    status: 'completed',
    metadata: {},
    created_at: new Date('2024-01-13'),
    updated_at: new Date('2024-01-13'),
    deleted_at: null,
  },
];

/**
 * GET /api/images - Lists images with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validationResult = validateQueryParams(
      request.nextUrl.searchParams,
      imagesQuerySchema
    );

    const search =
      validationResult.success && validationResult.data
        ? validationResult.data.search
        : request.nextUrl.searchParams.get('search') || '';
    const productId =
      validationResult.success && validationResult.data
        ? validationResult.data.product_id
        : request.nextUrl.searchParams.get('product_id') || undefined;
    const articleId =
      validationResult.success && validationResult.data
        ? validationResult.data.article_id
        : request.nextUrl.searchParams.get('article_id') || undefined;
    const statusFilter =
      validationResult.success && validationResult.data
        ? validationResult.data.status
        : request.nextUrl.searchParams.get('status') || undefined;
    const style =
      validationResult.success && validationResult.data
        ? validationResult.data.style
        : request.nextUrl.searchParams.get('style') || undefined;
    const sortField =
      validationResult.success && validationResult.data
        ? validationResult.data.sort
        : request.nextUrl.searchParams.get('sort') || 'created_at';
    const sortDirection =
      validationResult.success && validationResult.data
        ? validationResult.data.order
        : request.nextUrl.searchParams.get('order') || 'desc';
    const limit =
      validationResult.success && validationResult.data
        ? validationResult.data.limit
        : 50;
    const offset =
      validationResult.success && validationResult.data
        ? validationResult.data.offset
        : 0;

    // Filter images
    let filtered = [...mockImages];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.title?.toLowerCase().includes(searchLower) ||
          img.alt_text?.toLowerCase().includes(searchLower) ||
          img.description?.toLowerCase().includes(searchLower) ||
          img.url.toLowerCase().includes(searchLower)
      );
    }

    if (productId) {
      filtered = filtered.filter((img) => img.product_id === productId);
    }

    if (articleId) {
      filtered = filtered.filter((img) => img.article_id === articleId);
    }

    if (statusFilter) {
      filtered = filtered.filter((img) => img.status === statusFilter);
    }

    if (style) {
      filtered = filtered.filter((img) => img.style === style);
    }

    // Sort images
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'created_at':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          comparison =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'url':
          comparison = a.url.localeCompare(b.url);
          break;
        case 'file_size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'width':
          comparison = (a.width || 0) - (b.width || 0);
          break;
        case 'height':
          comparison = (a.height || 0) - (b.height || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      images: paginated,
      total: filtered.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/images - Creates a new image or bulk imports
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = validateRequest(body, imagesPostSchema);

    if (!validationResult.success) {
      return NextResponse.json(validationResult.error, { status: 400 });
    }

    if (!validationResult.data) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const data = validationResult.data;

    // Handle bulk import
    if (data.bulk) {
      const results = {
        total: data.images.length,
        successful: 0,
        failed: 0,
        errors: [] as Array<{ row: number; url: string; error: string }>,
      };

      const newImages = [];

      for (let i = 0; i < data.images.length; i++) {
        const imgData = data.images[i];
        try {
          const newImage = {
            id: `img-${Date.now()}-${i}`,
            organization_id: data.organization_id,
            product_id: data.product_id || null,
            article_id: data.article_id || null,
            url: imgData.url,
            storage_path: null,
            alt_text: imgData.alt_text || null,
            caption: null,
            title: imgData.title || null,
            description: null,
            style: imgData.style || null,
            width: imgData.width || null,
            height: imgData.height || null,
            file_size: null,
            mime_type: imgData.mime_type || null,
            format: imgData.format || null,
            status: 'completed' as const,
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          };

          newImages.push(newImage);
          mockImages.push(newImage);
          results.successful++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            url: imgData.url || 'unknown',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        ...results,
        images: newImages,
      });
    }

    // Single image creation
    const newImage = {
      id: `img-${Date.now()}`,
      organization_id: data.organization_id,
      product_id: data.product_id || null,
      article_id: data.article_id || null,
      url: data.url,
      storage_path: data.storage_path || null,
      alt_text: data.alt_text || null,
      caption: data.caption || null,
      title: data.title || null,
      description: data.description || null,
      style: data.style || null,
      width: data.width || null,
      height: data.height || null,
      file_size: data.file_size || null,
      mime_type: data.mime_type || null,
      format: data.format || null,
      status: data.status || 'completed',
      metadata: data.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    mockImages.push(newImage);

    return NextResponse.json(newImage, { status: 201 });
  } catch (error) {
    console.error('Error creating image:', error);
    return NextResponse.json(
      { error: 'Failed to create image' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/images - Updates an existing image
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const index = mockImages.findIndex((img) => img.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Update only provided fields
    const updatedImage = {
      ...mockImages[index],
      ...body,
      updated_at: new Date(),
    };

    mockImages[index] = updatedImage;

    return NextResponse.json(updatedImage);
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images - Soft deletes an image
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const index = mockImages.findIndex((img) => img.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Soft delete by setting deleted_at
    mockImages[index].deleted_at = new Date();
    mockImages[index].updated_at = new Date();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}

/**
 * Medium CMS API Route
 *
 * This route handles publishing posts to Medium via the Medium API.
 *
 * @endpoint POST /api/cms/medium
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createMediumAdapter, CMSError, CMSPost } from '@/lib/cms';

/**
 * Request validation schema
 */
const publishRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(250, 'Title must be 250 characters or less'),
  content: z.string().min(1, 'Content is required'),
  contentHtml: z.string().optional(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional(),
  publishStatus: z
    .enum(['draft', 'public', 'unlisted'])
    .optional()
    .default('draft'),
  canonicalUrl: z.string().url().optional(),
  notifyFollowers: z.boolean().optional(),
  publicationId: z.string().optional(),
  accessToken: z.string().optional(),
});

/**
 * GET handler - Get user info and publications
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token from query params or environment
    const searchParams = request.nextUrl.searchParams;
    const accessToken =
      searchParams.get('accessToken') || process.env.MEDIUM_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Medium access token is required' },
        { status: 400 }
      );
    }

    const adapter = createMediumAdapter(accessToken);
    const user = await adapter.getUser();
    const publications = await adapter.getPublications();

    return NextResponse.json({
      success: true,
      user,
      publications,
    });
  } catch (error) {
    console.error('Medium GET error:', error);

    if (error instanceof CMSError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get Medium user info' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Publish a post to Medium
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = publishRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      title,
      content,
      contentHtml,
      tags,
      publishStatus,
      canonicalUrl,
      notifyFollowers,
      publicationId,
      accessToken,
    } = validationResult.data;

    // Create adapter with provided or environment token
    const token = accessToken || process.env.MEDIUM_ACCESS_TOKEN;
    const pubId = publicationId || process.env.MEDIUM_PUBLICATION_ID;

    if (!token) {
      return NextResponse.json(
        { error: 'Medium access token is required' },
        { status: 400 }
      );
    }

    const adapter = createMediumAdapter(token, pubId);

    // Build the post object
    const post: CMSPost = {
      title,
      content,
      contentHtml,
      tags,
      publishStatus,
      canonicalUrl,
      notifyFollowers,
    };

    // Publish to Medium
    const result = await adapter.publish(post);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Medium POST error:', error);

    if (error instanceof CMSError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to publish to Medium' },
      { status: 500 }
    );
  }
}

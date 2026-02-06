/**
 * Image Generation API Route
 *
 * POST /api/images/generate
 *
 * Generates images using OpenAI's DALL-E 3 model with optional brand color application.
 *
 * Request body:
 * {
 *   "prompt": string,
 *   "style?: "realistic" | "watercolor" | "illustration" | "sketch" | "brand_text_overlay",
 *   "size?: "1024x1024" | "1792x1024" | "1024x1792",
 *   "quality?: "standard" | "hd",
 *   "applyBrandColors?: boolean,
 *   "organizationId": string,
 *   "userId": string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateImage,
  validateApiKey,
  IMAGE_GENERATION_STYLES,
  IMAGE_SIZES,
  IMAGE_QUALITIES,
} from '@/lib/image-generation';
import type { ImageGenerationRequest } from '@/types/image-generation';
import { ImageGenerationError } from '@/types/image-generation';

export const runtime = 'nodejs';
export const maxDuration = 60; // Max 60 seconds for image generation

/**
 * POST handler for image generation
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as Partial<ImageGenerationRequest>;

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate prompt is not empty after trimming
    if (body.prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt cannot be empty' },
        { status: 400 }
      );
    }

    // Validate style if provided
    if (
      body.style &&
      !Object.values(IMAGE_GENERATION_STYLES).includes(body.style)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid style. Must be one of: ${Object.values(IMAGE_GENERATION_STYLES).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate size if provided
    if (body.size && !IMAGE_SIZES.includes(body.size)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid size. Must be one of: ${IMAGE_SIZES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate quality if provided
    if (body.quality && !IMAGE_QUALITIES.includes(body.quality)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid quality. Must be one of: ${IMAGE_QUALITIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check API key availability
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: OpenAI API key not found',
        },
        { status: 500 }
      );
    }

    // Generate the image
    const result = await generateImage({
      prompt: body.prompt,
      style: body.style,
      size: body.size,
      quality: body.quality,
      model: body.model,
      applyBrandColors: body.applyBrandColors,
      organizationId: body.organizationId,
      userId: body.userId,
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle ImageGenerationError
    if (error instanceof ImageGenerationError) {
      // Map error types to HTTP status codes
      const statusMap: Record<string, number> = {
        INVALID_PROMPT: 400,
        INVALID_STYLE: 400,
        INVALID_SIZE: 400,
        API_KEY_MISSING: 500,
        RATE_LIMIT_EXCEEDED: 429,
        CONTENT_POLICY_VIOLATION: 400,
        STORAGE_ERROR: 503,
        DATABASE_ERROR: 500,
        API_ERROR: 500,
        UNKNOWN_ERROR: 500,
      };

      const status = statusMap[error.type] || 500;

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorType: error.type,
        },
        { status }
      );
    }

    // Handle unexpected errors
    console.error('Unexpected error in image generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for API health check
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        message: 'OpenAI API key not configured',
        available: false,
      },
      { status: 503 }
    );
  }

  // Optionally validate the API key
  const isValid = await validateApiKey(apiKey);

  return NextResponse.json({
    success: true,
    status: isValid ? 'ok' : 'error',
    message: isValid
      ? 'DALL-E 3 image generation is available'
      : 'OpenAI API key appears to be invalid',
    available: isValid,
    model: 'dall-e-3',
    supportedSizes: IMAGE_SIZES,
    supportedQualities: IMAGE_QUALITIES,
    supportedStyles: Object.values(IMAGE_GENERATION_STYLES),
  });
}

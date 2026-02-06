/**
 * OAuth Validation API Route
 *
 * Validates OAuth connections and checks connection status.
 *
 * @endpoint POST /api/oauth/validate - Validate a connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  validateIntegrationConnection,
  validateConnection,
  supportsOAuth,
} from '@/lib/oauth';
import { z } from 'zod';

/**
 * Request schema for connection validation
 */
const validateRequestSchema = z.object({
  platform: z.string().min(1),
  authToken: z.string().min(1),
  integrationId: z.string().optional(),
  config: z
    .object({
      baseUrl: z.string().optional(),
      shopDomain: z.string().optional(),
      adminUrl: z.string().optional(),
      siteUrl: z.string().optional(),
    })
    .optional(),
});

/**
 * POST handler - Validate connection
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to validate connections',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = validateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { platform, authToken, integrationId, config } =
      validationResult.data;

    let result;

    if (integrationId) {
      // Validate stored connection
      result = await validateConnection(platform, integrationId, config);
    } else {
      // Validate with provided token
      result = await validateIntegrationConnection(platform, authToken, config);
    }

    return NextResponse.json({
      platform,
      ...result,
    });
  } catch (error) {
    console.error('OAuth validation error:', error);

    return NextResponse.json(
      {
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

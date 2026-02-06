/**
 * API Middleware Helpers
 *
 * Reusable middleware functions for Next.js API routes.
 * Provides CSRF validation and other security utilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFToken } from './csrf';

// State-changing methods that require CSRF protection
export const STATE_CHANGING_METHODS = new Set([
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
]);

/**
 * Validate CSRF token for a request
 * Returns an error response if validation fails, null if it passes
 */
export async function validateCSRF(
  request: NextRequest
): Promise<NextResponse | null> {
  // Skip validation for safe methods
  if (!STATE_CHANGING_METHODS.has(request.method)) {
    return null;
  }

  // Get the CSRF token from headers
  const csrfToken = request.headers.get('x-csrf-token');

  if (!csrfToken) {
    return NextResponse.json(
      {
        error: 'CSRF token missing',
        message: 'x-csrf-token header is required for state-changing requests',
      },
      { status: 403 }
    );
  }

  // Validate the CSRF token
  const isValid = await validateCSRFToken(csrfToken);

  if (!isValid) {
    return NextResponse.json(
      {
        error: 'CSRF token invalid',
        message:
          'The provided CSRF token is invalid or expired. Please refresh and try again.',
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Wrapper for API route handlers with CSRF validation
 *
 * Usage:
 * ```ts
 * export const POST = withCSRFValidation(async (request) => {
 *   // Your handler logic - CSRF already validated
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCSRFValidation<
  T extends (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse> | NextResponse,
>(handler: T): T {
  return (async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    // Validate CSRF token
    const errorResponse = await validateCSRF(request);
    if (errorResponse) {
      return errorResponse;
    }

    // Call the original handler
    return handler(request, context);
  }) as T;
}

/**
 * Type-safe response helpers
 */
export class APIErrorResponse extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'APIErrorResponse';
  }
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  statusCode: number = 400,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(code ? { code } : {}),
    },
    { status: statusCode }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

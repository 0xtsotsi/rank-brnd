/**
 * Example Protected API Route with CSRF Validation
 *
 * This demonstrates the pattern for implementing CSRF validation
 * in API routes for state-changing operations.
 *
 * POST /api/example-protected
 *
 * Protected by:
 * 1. Authentication (via Clerk middleware)
 * 2. CSRF token validation
 * 3. Origin header validation (via middleware)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCSRFToken, CSRFError } from '@/lib/csrf';

/**
 * POST handler - Demonstrates CSRF validation for state-changing operations
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Get the CSRF token from headers
    const csrfToken = request.headers.get('x-csrf-token');

    if (!csrfToken) {
      return NextResponse.json(
        {
          error: 'CSRF token missing',
          message: 'x-csrf-token header is required',
        },
        { status: 403 }
      );
    }

    // Step 2: Validate the CSRF token
    const isValid = await validateCSRFToken(csrfToken);

    if (!isValid) {
      return NextResponse.json(
        {
          error: 'CSRF token invalid',
          message: 'The provided CSRF token is invalid or expired',
        },
        { status: 403 }
      );
    }

    // Step 3: Process the request (CSRF validation passed)
    const body = await request.json().catch(() => ({}));

    // Your business logic here
    return NextResponse.json({
      success: true,
      message: 'Request processed successfully',
      data: body,
    });
  } catch (error) {
    console.error('Error in protected route:', error);

    if (error instanceof CSRFError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Read-only operations don't require CSRF
 */
export async function GET() {
  return NextResponse.json({
    message: 'This is a public GET endpoint',
    note: 'GET requests are read-only and do not require CSRF protection',
  });
}

/**
 * CSRF Token API Route
 *
 * GET /api/csrf-token
 *
 * Returns a fresh CSRF token for the client to use in state-changing requests.
 * The token is generated server-side and validated on subsequent requests.
 */

import { NextResponse } from 'next/server';
import { createCSRFSession } from '@/lib/csrf';

export async function GET() {
  try {
    // Generate a new CSRF token and set it as a cookie
    const token = await createCSRFSession();

    // Return the token to the client
    return NextResponse.json(
      { token, headerName: 'x-csrf-token' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

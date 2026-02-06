/**
 * Logging Middleware Utilities
 *
 * Helper functions to integrate structured logging with Next.js middleware
 * and API route handlers.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  generateCorrelationId,
  getCorrelationId,
  CORRELATION_HEADER,
  CORRELATION_COOKIE,
} from './correlation';

/**
 * Middleware configuration options
 */
export interface LoggingMiddlewareOptions {
  /** Whether to set correlation ID cookie */
  setCookie?: boolean;
  /** Whether to add correlation ID to response headers */
  addResponseHeader?: boolean;
  /** Custom cookie options */
  cookieOptions?: {
    maxAge?: number;
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
    secure?: boolean;
    httpOnly?: boolean;
  };
}

/**
 * Ensure correlation ID exists for the request
 * - Generates one if not present in headers
 * - Optionally sets it as a cookie for client-side access
 * - Adds it to response headers for tracing
 *
 * Use this in your Next.js middleware:
 *
 * ```ts
 * import { withMiddlewareCorrelationId } from '@/lib/logger';
 *
 * export default clerkMiddleware(async (auth, request) => {
 *   const correlationId = await withMiddlewareCorrelationId(request);
 *   // ... rest of your middleware logic
 * });
 * ```
 */
export async function withMiddlewareCorrelationId(
  request: NextRequest,
  options: LoggingMiddlewareOptions = {}
): Promise<string> {
  const {
    setCookie = true,
    addResponseHeader = true,
    cookieOptions = {},
  } = options;

  // Get existing correlation ID or generate new one
  let correlationId = request.headers.get(CORRELATION_HEADER);

  if (!correlationId) {
    // Check cookie
    const cookieList = await cookies();
    const cookieValue = cookieList.get(CORRELATION_COOKIE)?.value;

    if (cookieValue) {
      correlationId = cookieValue;
    } else {
      correlationId = generateCorrelationId();
    }
  }

  // Create response with correlation ID
  const response = NextResponse.next();

  // Add to response headers for tracing
  if (addResponseHeader) {
    response.headers.set(CORRELATION_HEADER, correlationId);
  }

  // Set cookie for client-side access
  if (setCookie && !request.cookies.get(CORRELATION_COOKIE)?.value) {
    const cookieHeader = serializeCookie(
      CORRELATION_COOKIE,
      correlationId,
      cookieOptions
    );
    response.headers.append('Set-Cookie', cookieHeader);
  }

  return correlationId;
}

/**
 * Serialize a cookie value for Set-Cookie header
 */
function serializeCookie(
  name: string,
  value: string,
  options: LoggingMiddlewareOptions['cookieOptions'] = {}
): string {
  const {
    maxAge = 60 * 60 * 24 * 7, // 7 days
    path = '/',
    sameSite = 'lax',
    secure = process.env.NODE_ENV === 'production',
    httpOnly = true,
  } = options;

  const parts = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  if (httpOnly) {
    parts.push('HttpOnly');
  }

  return parts.join('; ');
}

/**
 * Create a response with correlation ID headers
 *
 * Use this in API routes to add correlation ID to responses:
 *
 * ```ts
 * import { withLoggingHeaders } from '@/lib/logger';
 *
 * export async function GET(request: Request) {
 *   const correlationId = request.headers.get('x-correlation-id') ?? 'unknown';
 *   const data = { message: 'Hello' };
 *
 *   return withLoggingHeaders(
 *     NextResponse.json(data),
 *     correlationId
 *   );
 * }
 * ```
 */
export function withLoggingHeaders<T extends Response>(
  response: T,
  correlationId: string
): T {
  const newResponse = new Response(response.body, response) as T;
  newResponse.headers.set(CORRELATION_HEADER, correlationId);
  return newResponse;
}

/**
 * Wrapper for API route handlers with automatic correlation ID handling
 *
 * ```ts
 * import { withLogging } from '@/lib/logger';
 * import { createRequestLogger } from '@/lib/logger';
 *
 * export const GET = withLogging(async (request, correlationId) => {
 *   const log = createRequestLogger('MyRoute').withCorrelationId(correlationId);
 *   log.info('Processing request');
 *
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withLogging(
  handler: (request: Request, correlationId: string) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    // Get or generate correlation ID
    let correlationId = request.headers.get(CORRELATION_HEADER);

    if (!correlationId) {
      correlationId = generateCorrelationId();
    }

    // Call handler
    const response = await handler(request, correlationId);

    // Add correlation ID to response headers
    return withLoggingHeaders(response, correlationId);
  };
}

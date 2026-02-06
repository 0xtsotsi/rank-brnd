/**
 * Request-Aware Logger
 *
 * Logger factory for API routes that automatically extracts
 * correlation ID and user information from the request context.
 */

import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import type { ILogger } from './types';
import { createLogger } from './structured';
import { getCorrelationId } from './correlation';

/**
 * Create a logger instance with context from the current API request
 * Automatically includes:
 * - Correlation ID (from headers, cookies, or generated)
 * - User ID (from Clerk auth)
 * - Organization ID (from Clerk org)
 * - Request metadata (method, path, user agent, IP)
 */
export async function createRequestLogger(context?: string): Promise<ILogger> {
  // Get correlation ID
  const correlationId = await getCorrelationId();

  // Get user info from Clerk
  let userId: string | undefined;
  let organizationId: string | undefined;
  try {
    const authData = await auth();
    userId = authData.userId ?? undefined;
    organizationId = authData.orgId ?? undefined;
  } catch {
    // Auth might not be available for all routes
  }

  // Get request metadata
  const headerList = await headers();
  const requestMetadata: Record<string, unknown> = {
    method: headerList.get('x-method') || 'UNKNOWN',
    path: headerList.get('x-path') || headerList.get('next-url') || 'unknown',
    userAgent: headerList.get('user-agent') || undefined,
    ip:
      headerList.get('x-forwarded-for') ||
      headerList.get('x-real-ip') ||
      headerList.get('cf-connecting-ip') ||
      undefined,
  };

  // Create logger with all context
  return createLogger({
    context,
    getCorrelationId: () => correlationId,
  })
    .withCorrelationId(correlationId)
    .withUser(userId ?? '', organizationId)
    .withData({ request: requestMetadata });
}

/**
 * Extract request metadata from a Request object
 */
export function extractRequestMetadata(
  request: Request
): Record<string, unknown> {
  return {
    method: request.method,
    url: request.url,
    path: new URL(request.url).pathname,
    userAgent: request.headers.get('user-agent') || undefined,
    ip:
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      undefined,
  };
}

/**
 * Create a logger with metadata from a Request object
 * Use this when you have access to the raw Request object
 */
export function createRequestLoggerFromRequest(
  request: Request,
  context?: string
): ILogger {
  // Get correlation ID from headers
  const correlationId = request.headers.get('x-correlation-id') ?? undefined;

  const metadata = extractRequestMetadata(request);

  return createLogger({
    context,
    getCorrelationId: () => correlationId,
  })
    .withCorrelationId(correlationId ?? '')
    .withData({ request: metadata });
}

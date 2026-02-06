/**
 * Correlation ID Utilities
 *
 * Provides functions for generating and managing correlation IDs
 * for distributed tracing across requests.
 */

import { cookies, headers } from 'next/headers';

/**
 * Header name for correlation ID in HTTP requests
 */
export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Cookie name for correlation ID persistence
 */
export const CORRELATION_COOKIE = 'correlation_id';

/**
 * Generate a new unique correlation ID
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateCorrelationId(): string {
  // Generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create correlation ID for the current request
 * Checks headers first, then cookies, then generates a new one
 */
export async function getCorrelationId(): Promise<string> {
  // Try to get from header first
  const headerList = await headers();
  const headerCorrelationId = headerList.get(CORRELATION_HEADER);
  if (headerCorrelationId) {
    return headerCorrelationId;
  }

  // Try to get from cookie
  const cookieList = await cookies();
  const cookieCorrelationId = cookieList.get(CORRELATION_COOKIE)?.value;
  if (cookieCorrelationId) {
    return cookieCorrelationId;
  }

  // Generate a new one
  return generateCorrelationId();
}

/**
 * Extract correlation ID from a Request object
 */
export function extractCorrelationIdFromRequest(
  request: Request
): string | undefined {
  return request.headers.get(CORRELATION_HEADER) ?? undefined;
}

/**
 * Create a RequestHeaders object with correlation ID
 */
export function withCorrelationId(
  headers: HeadersInit,
  correlationId: string
): HeadersInit {
  if (headers instanceof Headers) {
    headers.set(CORRELATION_HEADER, correlationId);
    return headers;
  }

  if (Array.isArray(headers)) {
    return [...headers, [CORRELATION_HEADER, correlationId]];
  }

  return {
    ...headers,
    [CORRELATION_HEADER]: correlationId,
  };
}

/**
 * Create a child correlation ID for nested operations
 * Appends a suffix to track sub-operations
 */
export function createChildCorrelationId(
  parentId: string,
  operation: string
): string {
  const shortHash = Math.random().toString(36).substring(2, 6);
  return `${parentId}/${operation}:${shortHash}`;
}

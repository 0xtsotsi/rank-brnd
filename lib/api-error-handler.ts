/**
 * API Error Handler with Sentry Integration
 *
 * Provides standardized error handling for API routes with automatic
 * Sentry error tracking and consistent error responses.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/nextjs';

/**
 * Standard error response structure
 */
export interface APIErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, any>;
  requestId?: string;
}

/**
 * Error types for better error categorization
 */
export enum ErrorType {
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  VALIDATION = 'validation_error',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit_exceeded',
  INTERNAL = 'internal_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  message?: string,
  details?: Record<string, any>,
  statusCode: number = 500
): NextResponse<APIErrorResponse> {
  const response: APIErrorResponse = {
    error,
    ...(message && { message }),
    ...(details && { details }),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle and report API errors to Sentry
 *
 * Usage in API routes:
 *   try {
 *     // Your API logic
 *   } catch (error) {
 *     return handleAPIError(error, 'MyOperation');
 *   }
 */
export function handleAPIError(
  error: unknown,
  context: string,
  additionalContext?: Record<string, any>
): NextResponse<APIErrorResponse> {
  // Capture error to Sentry
  let SentryError: Error;
  let statusCode: number;
  let errorType: ErrorType;
  let userMessage: string;

  if (error instanceof APIError) {
    SentryError = error;
    statusCode = error.statusCode;
    errorType = error.type;
    userMessage = error.message;
  } else if (error instanceof ZodError) {
    SentryError = new Error(`Validation error: ${error.message}`);
    statusCode = 400;
    errorType = ErrorType.VALIDATION;
    userMessage = 'Invalid request data';
  } else if (error instanceof Error) {
    SentryError = error;
    statusCode = 500;
    errorType = ErrorType.INTERNAL;
    userMessage = 'An unexpected error occurred';
  } else {
    SentryError = new Error(String(error));
    statusCode = 500;
    errorType = ErrorType.INTERNAL;
    userMessage = 'An unexpected error occurred';
  }

  // Send to Sentry with context
  Sentry.captureException(SentryError, {
    tags: {
      errorType,
      context,
    },
    extra: {
      ...additionalContext,
      originalError: error,
    },
  });

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, SentryError);
  }

  return createErrorResponse(
    errorType,
    userMessage,
    process.env.NODE_ENV === 'development'
      ? {
          context,
          details: additionalContext,
          stack: SentryError.stack,
        }
      : undefined,
    statusCode
  );
}

/**
 * Wrapper for API route handlers with automatic error handling
 *
 * Usage:
 *   export const GET = withErrorHandling('GetKeywords', async (request) => {
 *     // Your handler logic
 *     return NextResponse.json(data);
 *   });
 */
export function withErrorHandling(
  context: string,
  handler: (
    request: Request,
    extra?: { userId?: string }
  ) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    userId?: string;
  }
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      return await handler(request, options);
    } catch (error) {
      return handleAPIError(error, context, {
        url: request.url,
        method: (request as any).method || 'unknown',
        userId: options?.userId,
      });
    }
  };
}

/**
 * Predefined error creators for common scenarios
 */
export const APIErrors = {
  unauthorized: (message: string = 'Unauthorized') =>
    new APIError(ErrorType.AUTHENTICATION, message, 401),

  forbidden: (message: string = 'Forbidden') =>
    new APIError(ErrorType.AUTHORIZATION, message, 403),

  notFound: (resource: string = 'Resource') =>
    new APIError(ErrorType.NOT_FOUND, `${resource} not found`, 404),

  validation: (
    message: string = 'Invalid request data',
    details?: Record<string, any>
  ) => new APIError(ErrorType.VALIDATION, message, 400, details),

  conflict: (message: string = 'Resource conflict') =>
    new APIError(ErrorType.CONFLICT, message, 409),

  rateLimited: (message: string = 'Rate limit exceeded') =>
    new APIError(ErrorType.RATE_LIMIT, message, 429),

  internal: (message: string = 'Internal server error') =>
    new APIError(ErrorType.INTERNAL, message, 500),

  serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
    new APIError(ErrorType.SERVICE_UNAVAILABLE, message, 503),
};

/**
 * Add request context to Sentry scope
 */
export function setRequestContext(
  request: Request,
  userId?: string,
  additional?: Record<string, any>
): void {
  Sentry.setContext('api_request', {
    url: request.url,
    method: (request as any).method || 'unknown',
    userId,
    ...additional,
  });
}

/**
 * Performance tracking wrapper for API routes
 */
export async function withAPITracking<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: operation,
      op: 'api.request',
    },
    async (span: any) => {
      try {
        const result = await fn();
        span?.setStatus({ code: 1, message: 'success' });
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: 'internal_error' });
        throw error;
      }
    }
  );
}

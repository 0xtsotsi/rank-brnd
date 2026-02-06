/**
 * Structured Logging Module
 *
 * A comprehensive logging system with correlation IDs for distributed tracing.
 *
 * Usage:
 *
 * ```ts
 * import { createLogger, createRequestLogger } from '@/lib/logger';
 *
 * // In API routes - automatically gets correlation ID and user info
 * export async function GET(request: Request) {
 *   const log = await createRequestLogger('MyRoute');
 *   log.info('Processing request');
 *
 *   // For errors
 *   log.error('Something went wrong', error);
 *
 *   return NextResponse.json({ success: true });
 * }
 *
 * // In other modules
 * const log = createLogger({ context: 'MyService' });
 * log.info('Service started');
 * ```
 *
 * Log Levels:
 * - debug: Detailed diagnostic information
 * - info: General informational messages
 * - warn: Warning messages for potentially harmful situations
 * - error: Error events for runtime errors
 * - critical: Critical situations requiring immediate attention
 *
 * Environment Variables:
 * - LOG_LEVEL: Minimum log level to output (default: info)
 * - LOG_PRETTY: Enable pretty-printed logs (default: true in dev, false in prod)
 */

// Public API
export { createLogger, getRootLogger, StructuredLogger } from './structured';
export {
  createRequestLogger,
  createRequestLoggerFromRequest,
  extractRequestMetadata,
} from './request';
export {
  generateCorrelationId,
  getCorrelationId,
  extractCorrelationIdFromRequest,
  withCorrelationId,
  createChildCorrelationId,
  CORRELATION_HEADER,
  CORRELATION_COOKIE,
} from './correlation';
export {
  withLoggingHeaders,
  withLogging,
  withMiddlewareCorrelationId,
} from './middleware';

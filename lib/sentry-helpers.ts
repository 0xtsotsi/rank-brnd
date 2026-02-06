// @ts-nocheck - Sentry Span type mismatch
import * as Sentry from '@sentry/nextjs';

/**
 * Start a server-side performance span
 */
export function startServerSpan<T>(
  name: string,
  operation: (span: Sentry.Span) => T
): T {
  return Sentry.startSpan(
    {
      name: name,
      op: operation,
    },
    (span) => operation(span)
  );
}

/**
 * Start a server-side transaction
 */
export function startServerTransaction(
  name: string,
  operation: string
): Sentry.Transaction {
  return Sentry.startSpan(
    {
      name: name,
      op: operation,
    },
    (span) => span.transaction
  );
}

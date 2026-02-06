// @ts-nocheck - logger export issue
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

// Initialize Sentry with best practices
Sentry.init({
  dsn: 'https://ce970e832683f2a35589782817b9edce@o450926477023641.ingest.de.sentry.io/451082553164800',
  environment:
    process.env.NODE_ENV === 'production' ? 'production' : 'development',

  // Performance Monitoring
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 1.0,

  // Integrations
  integrations: [
    // Console logging - send console.log/warn/error to Sentry
    new Sentry.consoleLoggingIntegration({
      levels: ['log', 'warn', 'error'],
    }),
    // HTTP client tracing
    new Sentry.BrowserTracing(),
    // Replay for user sessions
    new Sentry.Replay({
      sessionSampleRate: 0.1, // Sample 10% of sessions for replay
    }),
    // Browser profiling (performance monitoring)
    new Sentry.BrowserProfilingIntegration(),
  ],

  // Filter out errors we don't want to capture
  beforeSend(event, hint) {
    // Don't send certain errors to Sentry
    const error = event.exception?.values?.[0];

    // Skip network errors in development
    if (process.env.NODE_ENV === 'development') {
      if (
        event.level === 'error' &&
        error?.mechanism?.data?.description?.includes('ERR_NETWORK')
      ) {
        return null;
      }
    }

    // Skip React hydration warnings in development
    if (
      process.env.NODE_ENV === 'development' &&
      error?.mechanism?.data?.includes('Minified React error')
    ) {
      return null;
    }

    // Skip errors from third-party scripts that we can't control
    const url = event.request?.url;
    if (
      url &&
      (url.includes('third-party-script.com') ||
        url.includes('analytics-script.com'))
    ) {
      return null;
    }

    return event;
  },

  // Before send - enrich events with additional context
  beforeSend(event, hint) {
    // Add release information
    event.release = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';

    // Add environment tag
    event.tags = event.tags || [];
    event.tags.push(`env:${process.env.NODE_ENV}`);

    // Add user context if available (will be set in API middleware)
    if (!event.contexts) {
      event.contexts = {};
    }

    return event;
  },
});

// Export Sentry for use in application
export { Sentry };

// Export performance monitoring helpers
export function startPerformanceSpan<T>(
  name: string,
  operation: (span: Sentry.Span) => T,
  attributes?: Record<string, string | number>
): T {
  return Sentry.startSpan(
    {
      name: name,
      op: operation,
    },
    (span) => {
      // Add custom attributes if provided
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }
      return operation(span);
    }
  );
}

// Export transaction helper
export function startTransaction(
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

// Export custom exception capture
export function captureCustomException(
  error: Error,
  context?: Record<string, any>
): void {
  Sentry.withScope((scope) => {
    // Add custom context
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    scope.captureException(error);
  });
}

// Export custom message
export function captureCustomMessage(
  message: string,
  level: 'log' | 'warning' | 'error' | 'fatal' = 'info',
  context?: Record<string, any>
): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    scope.captureMessage(message, level);
  });
}

// Export logger that integrates with Sentry
export const sentryLogger = {
  fmt: (message: string, params: Record<string, any> = {}) => {
    const formatted = message.replace(/\{\s*(\w+)\s*\}/g, (_, key) => {
      const value = params[key];
      return value !== undefined ? value : key;
    });
    return formatted;
  },

  log: (message: string, params: Record<string, any> = {}) => {
    logger.log(message, params);
    // Sentry automatically captures console.log via consoleLoggingIntegration
  },

  warn: (message: string, params: Record<string, any> = {}) => {
    logger.warn(message, params);
    // Sentry automatically captures console.warn via consoleLoggingIntegration
  },

  error: (message: string, error?: Error, params: Record<string, any> = {}) => {
    logger.error(message, error, params);
    // Sentry automatically captures console.error via consoleLoggingIntegration
    // Also capture explicitly if needed
    Sentry.captureException(error || new Error(message));
  },

  fatal: (message: string, error?: Error, params: Record<string, any> = {}) => {
    logger.fatal(message, error, params);
    Sentry.captureException(error || new Error(message), {
      level: 'fatal',
    });
  },
};

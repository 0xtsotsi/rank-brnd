// @ts-nocheck - LogLevel enum/type collision issue
/**
 * Structured Logger Implementation
 *
 * A JSON-based structured logging system with correlation IDs for distributed tracing.
 * Supports multiple log levels and works in both Node.js and Edge runtime environments.
 */

import type { LogEntry, LogLevel, LoggerOptions, ILogger } from './types';
import { LOG_LEVEL_VALUES } from './types';

/**
 * Default log level from environment or INFO
 */
function getDefaultLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (
    envLevel &&
    ['debug', 'info', 'warn', 'error', 'critical'].includes(envLevel)
  ) {
    return envLevel as LogLevel;
  }
  return 'info';
}

/**
 * Determine if pretty printing should be used
 */
function isPrettyPrint(): boolean {
  if (process.env.LOG_PRETTY === 'false') return false;
  if (process.env.LOG_PRETTY === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

/**
 * Check if a log level should be output based on configured minimum level
 */
function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[minLevel];
}

/**
 * Extract error information for logging
 */
function extractError(error: Error | unknown): {
  name?: string;
  message: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    // Only include stack traces in non-production environments
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      name: error.name,
      message: error.message,
      stack: isDev ? error.stack : undefined,
      code: (error as any).code,
    };
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return {
      message: String(error.message),
      name: 'Error',
    };
  }

  return {
    message: String(error ?? 'Unknown error'),
  };
}

/**
 * Format a log entry for output
 */
function formatLogEntry(entry: LogEntry, pretty: boolean): string {
  if (pretty) {
    // Pretty-printed format for development
    const levelColor = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      critical: '\x1b[35m', // magenta
    }[entry.level];

    const reset = '\x1b[0m';
    const correlation = entry.correlationId
      ? ` [${entry.correlationId.slice(0, 8)}]`
      : '';
    const context = entry.context ? ` [${entry.context}]` : '';
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const errorStr = entry.error ? ` Error: ${entry.error.message}` : '';

    return `${levelColor}[${entry.level.toUpperCase()}]${reset}${correlation}${context} ${entry.message}${dataStr}${errorStr}`;
  }

  // Structured JSON format for production
  return JSON.stringify(entry);
}

/**
 * Output a log entry to the console
 */
function outputLog(entry: LogEntry, pretty: boolean): void {
  const formatted = formatLogEntry(entry, pretty);

  switch (entry.level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
    case 'critical':
      console.error(formatted);
      break;
  }
}

/**
 * Structured Logger Class
 */
export class StructuredLogger implements ILogger {
  private readonly minLevel: LogLevel;
  private readonly context?: string;
  private readonly includeTimestamp: boolean;
  private readonly pretty: boolean;
  private readonly getCorrelationId?: () => string | undefined;
  private readonly userId?: string;
  private readonly organizationId?: string;
  private readonly baseData?: Record<string, unknown>;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.level ?? getDefaultLogLevel();
    this.context = options.context;
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.pretty = options.pretty ?? isPrettyPrint();
    this.getCorrelationId = options.getCorrelationId;
    this.userId = undefined;
    this.organizationId = undefined;
    this.baseData = undefined;
  }

  private withDefaults(
    overrides: Partial<StructuredLoggerOptions>
  ): StructuredLoggerOptions {
    return {
      minLevel: this.minLevel,
      context: overrides.context ?? this.context,
      includeTimestamp: this.includeTimestamp,
      pretty: this.pretty,
      getCorrelationId: overrides.getCorrelationId ?? this.getCorrelationId,
      userId: overrides.userId ?? this.userId,
      organizationId: overrides.organizationId ?? this.organizationId,
      baseData: { ...this.baseData, ...overrides.baseData },
    };
  }

  private log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ): void {
    if (!shouldLog(level, this.minLevel)) {
      return;
    }

    const correlationId = this.getCorrelationId?.();

    const entry: LogEntry = {
      timestamp: this.includeTimestamp ? new Date().toISOString() : '',
      level,
      message,
      correlationId,
      context: this.context,
      userId: this.userId,
      organizationId: this.organizationId,
      data: { ...this.baseData, ...data },
    };

    if (error) {
      entry.error = extractError(error);
    }

    outputLog(entry, this.pretty);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, undefined, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, undefined, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, undefined, data);
  }

  error(
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ): void {
    this.log('error', message, error, data);
  }

  critical(
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ): void {
    this.log('critical', message, error, data);
  }

  withContext(context: string): ILogger {
    return new StructuredLogger(this.withDefaults({ context }));
  }

  withData(data: Record<string, unknown>): ILogger {
    return new StructuredLogger(this.withDefaults({ baseData: data }));
  }

  withCorrelationId(correlationId: string): ILogger {
    return new StructuredLogger(
      this.withDefaults({ getCorrelationId: () => correlationId })
    );
  }

  withUser(userId: string, organizationId?: string): ILogger {
    return new StructuredLogger(this.withDefaults({ userId, organizationId }));
  }
}

/**
 * Internal constructor options
 */
interface StructuredLoggerOptions {
  minLevel: LogLevel;
  context?: string;
  includeTimestamp: boolean;
  pretty: boolean;
  getCorrelationId?: () => string | undefined;
  userId?: string;
  organizationId?: string;
  baseData?: Record<string, unknown>;
}

/**
 * Default root logger instance
 */
let rootLogger: ILogger | null = null;

/**
 * Get or create the root logger instance
 */
export function getRootLogger(): ILogger {
  if (!rootLogger) {
    rootLogger = new StructuredLogger({
      context: 'app',
    });
  }
  return rootLogger;
}

/**
 * Create a new logger with the specified options
 */
export function createLogger(options?: LoggerOptions): ILogger {
  return new StructuredLogger(options);
}

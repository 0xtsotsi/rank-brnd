/**
 * Structured Logging Types
 *
 * Defines the core types for the structured logging system with correlation IDs
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Numeric values for log level comparison
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 10,
  [LogLevel.INFO]: 20,
  [LogLevel.WARN]: 30,
  [LogLevel.ERROR]: 40,
  [LogLevel.CRITICAL]: 50,
};

/**
 * Structured log entry that will be output as JSON
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Message describing the event */
  message: string;
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** User ID if available */
  userId?: string;
  /** Organization ID if available */
  organizationId?: string;
  /** Context/service name */
  context?: string;
  /** Additional structured data */
  data?: Record<string, unknown>;
  /** Error details if applicable */
  error?: {
    name?: string;
    message: string;
    stack?: string;
    code?: string;
  };
  /** HTTP request details */
  request?: {
    method?: string;
    url?: string;
    path?: string;
    userAgent?: string;
    ip?: string;
  };
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Context/service name for this logger instance */
  context?: string;
  /** Whether to include timestamps */
  includeTimestamp?: boolean;
  /** Whether to output pretty-printed logs in development */
  pretty?: boolean;
  /** Custom correlation ID getter */
  getCorrelationId?: () => string | undefined;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ): void;
  critical(
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ): void;
  withContext(context: string): ILogger;
  withData(data: Record<string, unknown>): ILogger;
  withCorrelationId(correlationId: string): ILogger;
  withUser(userId: string, organizationId?: string): ILogger;
}

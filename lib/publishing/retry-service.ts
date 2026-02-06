/**
 * Publishing Retry Service
 *
 * Handles retry logic with exponential backoff for failed publishes.
 * Classifies errors and determines whether they should be retried.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { PublishingErrorType } from '@/types/publishing-queue';
import { RETRY_CONFIG, calculateRetryDelay } from '@/types/publishing-queue';

/**
 * Error classification result
 */
export interface ErrorClassification {
  type: PublishingErrorType;
  retriable: boolean;
  shouldRetry: boolean;
  suggestedBackoffMs: number;
}

/**
 * Retry state for a publishing item
 */
export interface RetryState {
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  errorType: PublishingErrorType | null;
  retryAfter: string | null;
  canRetry: boolean;
  nextRetryIn: number; // milliseconds until next retry
}

/**
 * Classify an error for retry purposes
 */
export function classifyError(error: unknown): ErrorClassification {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  // Network errors
  if (
    errorLower.includes('network') ||
    errorLower.includes('econnrefused') ||
    errorLower.includes('enotfound') ||
    errorLower.includes('etimedout') ||
    errorLower.includes('connection') ||
    errorLower.includes('fetch failed')
  ) {
    return {
      type: 'network',
      retriable: true,
      shouldRetry: true,
      suggestedBackoffMs: RETRY_CONFIG.BASE_DELAY_MS,
    };
  }

  // Timeout errors
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      type: 'timeout',
      retriable: true,
      shouldRetry: true,
      suggestedBackoffMs: RETRY_CONFIG.BASE_DELAY_MS * 2,
    };
  }

  // Rate limit errors
  if (
    errorLower.includes('rate limit') ||
    errorLower.includes('rate-limit') ||
    errorLower.includes('429') ||
    errorLower.includes('too many requests')
  ) {
    return {
      type: 'rate_limit',
      retriable: true,
      shouldRetry: true,
      suggestedBackoffMs: RETRY_CONFIG.MAX_DELAY_MS, // Longer backoff for rate limits
    };
  }

  // Auth errors - not retriable without user intervention
  if (
    errorLower.includes('unauthorized') ||
    errorLower.includes('authentication') ||
    errorLower.includes('401') ||
    errorLower.includes('invalid token') ||
    errorLower.includes('access denied') ||
    errorLower.includes('forbidden')
  ) {
    return {
      type: 'auth',
      retriable: false,
      shouldRetry: false,
      suggestedBackoffMs: 0,
    };
  }

  // Validation errors - not retriable without fixing the data
  if (
    errorLower.includes('validation') ||
    errorLower.includes('invalid') ||
    errorLower.includes('required') ||
    errorLower.includes('malformed') ||
    errorLower.includes('400')
  ) {
    return {
      type: 'validation',
      retriable: false,
      shouldRetry: false,
      suggestedBackoffMs: 0,
    };
  }

  // Server errors (5xx) - retriable
  if (
    errorLower.includes('500') ||
    errorLower.includes('502') ||
    errorLower.includes('503') ||
    errorLower.includes('504') ||
    errorLower.includes('internal server error') ||
    errorLower.includes('bad gateway') ||
    errorLower.includes('service unavailable')
  ) {
    return {
      type: 'server_error',
      retriable: true,
      shouldRetry: true,
      suggestedBackoffMs: RETRY_CONFIG.BASE_DELAY_MS * 2,
    };
  }

  // Unknown error - treat as retriable with caution
  return {
    type: 'unknown',
    retriable: true,
    shouldRetry: true,
    suggestedBackoffMs: RETRY_CONFIG.BASE_DELAY_MS * 2,
  };
}

/**
 * Calculate the next retry timestamp with exponential backoff
 */
export function calculateNextRetry(retryCount: number): Date {
  const delayMs = calculateRetryDelay(retryCount);
  return new Date(Date.now() + delayMs);
}

/**
 * Get time in milliseconds until a retry is due
 */
export function getTimeUntilRetry(retryAfter: string | null): number {
  if (!retryAfter) return 0;
  const retryDate = new Date(retryAfter);
  const now = new Date();
  const diff = retryDate.getTime() - now.getTime();
  return Math.max(0, diff);
}

/**
 * Format milliseconds as a human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? RETRY_CONFIG.MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? RETRY_CONFIG.BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? RETRY_CONFIG.MAX_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classification = classifyError(error);

      if (attempt < maxRetries && classification.retriable) {
        const delayMs = Math.min(
          baseDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );

        options.onRetry?.(attempt + 1, error);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Get retry state for a publishing queue item
 */
export async function getRetryState(
  client: SupabaseClient<Database>,
  itemId: string
): Promise<RetryState | null> {
  const { data, error } = await (client as any)
    .from('publishing_queue')
    .select('retry_count, max_retries, last_error, error_type, retry_after')
    .eq('id', itemId)
    .single();

  if (error || !data) return null;

  const canRetry =
    (data.retry_count ?? 0) < (data.max_retries ?? RETRY_CONFIG.MAX_RETRIES);
  const nextRetryIn = getTimeUntilRetry(data.retry_after);

  return {
    retryCount: data.retry_count ?? 0,
    maxRetries: data.max_retries ?? RETRY_CONFIG.MAX_RETRIES,
    lastError: data.last_error,
    errorType: data.error_type as PublishingErrorType | null,
    retryAfter: data.retry_after,
    canRetry,
    nextRetryIn,
  };
}

/**
 * Get items that are ready to be retried
 */
export async function getItemsReadyForRetry(
  client: SupabaseClient<Database>,
  options: {
    platform?: string;
    limit?: number;
  } = {}
) {
  const result = await (client as any).rpc('get_items_ready_for_retry', {
    p_platform: options.platform || null,
    p_limit: options.limit || 50,
  });

  if (result.error) {
    return {
      success: false,
      error: result.error.message,
    } as const;
  }

  return {
    success: true,
    data: result.data || [],
  } as const;
}

/**
 * Retry configuration types
 */
export type RetryStrategy = 'exponential' | 'linear' | 'immediate';

export interface RetryOptions {
  maxRetries?: number;
  strategy?: RetryStrategy;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retriableErrors?: PublishingErrorType[];
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  strategy: 'exponential',
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  retriableErrors: [
    'network',
    'timeout',
    'rate_limit',
    'server_error',
    'unknown',
  ],
};

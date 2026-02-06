'use client';

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Async Error Boundary
 *
 * Specifically designed to catch errors from async operations,
 * useEffect hooks, and event handlers that occur after initial render.
 *
 * Note: React error boundaries don't catch errors in:
 * - Event handlers
 * - Async code (setTimeout, promises)
 * - Server-side rendering
 *
 * For those cases, use the useAsyncError hook along with this boundary.
 *
 * Usage:
 *   <AsyncErrorBoundary>
 *     <YourComponent />
 *   </AsyncErrorBoundary>
 */
export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: 'async',
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Async error caught by boundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            An error occurred during an asynchronous operation. Please try
            refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-2 text-xs bg-red-100 dark:bg-red-950/50 p-2 rounded overflow-auto max-h-32">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async errors in components
 * Throws the error so it can be caught by the error boundary
 *
 * Usage:
 *   const throwError = useAsyncError();
 *
 *   useEffect(() => {
 *     async function fetchData() {
 *       try {
 *         // async operation
 *       } catch (error) {
 *         throwError(error);
 *       }
 *     }
 *     fetchData();
 *   }, [throwError]);
 */
export function useAsyncError() {
  return (error: Error) => {
    throw error;
  };
}

/**
 * Hook for catching errors in async operations
 * Returns a function that safely handles async errors
 *
 * Usage:
 *   const handleAsync = useAsyncHandler();
 *
 *   const onClick = () => handleAsync(async () => {
 *     // async operation that might throw
 *   });
 */
export function useAsyncHandler() {
  return async <T,>(
    operation: () => Promise<T>,
    onError?: (error: Error) => void
  ): Promise<T | undefined> => {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log to Sentry
      Sentry.captureException(err, {
        tags: {
          errorBoundary: 'async-handler',
        },
      });

      // Call custom error handler
      if (onError) {
        onError(err);
      }

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Async error caught by handler:', err);
      }

      return undefined;
    }
  };
}

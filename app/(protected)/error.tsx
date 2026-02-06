'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Protected Route Error Boundary
 *
 * Catches errors in all pages under the (protected) route group.
 * This handles errors for authenticated pages including dashboard, settings, etc.
 *
 * https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry with protected route context
    Sentry.captureException(error, {
      tags: {
        route: 'protected',
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription className="text-base mt-2">
            We encountered an error while loading this page. The error has been
            logged and our team will look into it.
          </CardDescription>
        </CardHeader>

        {error.digest && (
          <CardContent className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Error ID:{' '}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                {error.digest}
              </code>
            </p>
          </CardContent>
        )}

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </CardFooter>

        {process.env.NODE_ENV === 'development' && (
          <CardContent className="pt-0">
            <details className="text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-xs bg-gray-100 dark:bg-gray-950 p-3 rounded-lg overflow-auto max-h-48 text-red-600 dark:text-red-400">
                {error.message}
                {'\n'}
                {error.stack}
              </pre>
            </details>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

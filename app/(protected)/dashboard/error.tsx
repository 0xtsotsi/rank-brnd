'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle, RefreshCw } from 'lucide-react';
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
 * Dashboard Error Boundary
 *
 * Catches errors in all dashboard pages.
 * Provides a dashboard-specific error UI that allows users to retry or navigate to other sections.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        route: 'dashboard',
      },
    });
  }, [error]);

  return (
    <div className="p-6">
      <Card className="max-w-lg mx-auto border-red-200 dark:border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-2">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle>Dashboard Error</CardTitle>
              <CardDescription>
                Something went wrong while loading the dashboard
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {error.digest && (
          <CardContent>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Error ID:{' '}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {error.digest}
              </code>
            </p>
          </CardContent>
        )}

        <CardFooter className="flex gap-3">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/dashboard')}
          >
            Dashboard Home
          </Button>
        </CardFooter>

        {process.env.NODE_ENV === 'development' && (
          <CardContent className="pt-0">
            <details className="text-left">
              <summary className="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Details
              </summary>
              <pre className="text-xs bg-gray-100 dark:bg-gray-950 p-2 rounded overflow-auto max-h-32 text-red-600 dark:text-red-400">
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

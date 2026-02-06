'use client';

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

/**
 * Page Error Boundary
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors to Sentry, and displays a user-friendly error UI.
 * Best suited for entire page layouts.
 *
 * Usage:
 *   <PageErrorBoundary>
 *     <YourPage />
 *   </PageErrorBoundary>
 */
export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      eventId: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error to Sentry
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: 'page',
      },
    });

    this.setState({ eventId });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by PageErrorBoundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      eventId: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
                  <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription className="text-base mt-2">
                We apologize for the inconvenience. The error has been logged
                and our team will look into it.
              </CardDescription>
            </CardHeader>

            {this.state.eventId && (
              <CardContent className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Error ID:{' '}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                    {this.state.eventId}
                  </code>
                </p>
              </CardContent>
            )}

            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </CardFooter>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <CardContent className="pt-0">
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Error Details (Development Only)
                  </summary>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-950 p-3 rounded-lg overflow-auto max-h-48 text-red-600 dark:text-red-400">
                    {this.state.error.toString()}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              </CardContent>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for adding page error boundaries to components
 *
 * Usage:
 *   export default withPageErrorBoundary(MyPageComponent);
 */
export function withPageErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithPageErrorBoundaryWrapper(props: P) {
    return (
      <PageErrorBoundary fallback={fallback}>
        <Component {...props} />
      </PageErrorBoundary>
    );
  };
}

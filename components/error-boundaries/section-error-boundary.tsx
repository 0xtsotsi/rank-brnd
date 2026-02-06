'use client';

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Section Error Boundary
 *
 * A smaller error boundary designed for sections of a page.
 * Displays an inline error card that doesn't break the entire page.
 * Best suited for widgets, cards, and page sections.
 *
 * Usage:
 *   <SectionErrorBoundary title="Analytics" description="Traffic overview">
 *     <AnalyticsWidget />
 *   </SectionErrorBoundary>
 */
export class SectionErrorBoundary extends Component<Props, State> {
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
    // Log error to Sentry with lower severity for section errors
    Sentry.captureException(error, {
      level: 'warning',
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
        section: {
          title: this.props.title || 'Unknown Section',
        },
      },
      tags: {
        errorBoundary: 'section',
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `Error caught by SectionErrorBoundary (${this.props.title}):`,
        error
      );
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.title || 'Section Error';
      const description =
        this.props.description || 'This section encountered an error.';

      return (
        <Card
          className={cn(
            'border-amber-200 dark:border-amber-900/50',
            this.props.className
          )}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full p-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <CardContent className="pt-0">
              <details className="text-left">
                <summary className="cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Error Details
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-950 p-2 rounded overflow-auto max-h-32 text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            </CardContent>
          )}

          <CardFooter>
            <Button size="sm" variant="outline" onClick={this.handleReset}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline Error Boundary for smaller components
 * Displays an even more compact error UI
 */
interface InlineProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

interface InlineState {
  hasError: boolean;
}

export class InlineErrorBoundary extends Component<InlineProps, InlineState> {
  constructor(props: InlineProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): InlineState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    Sentry.captureException(error, {
      level: 'warning',
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: 'inline',
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by InlineErrorBoundary:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            'flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md',
            this.props.className
          )}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Unable to load content</span>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for adding section error boundaries to components
 */
export function withSectionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: { title?: string; description?: string; fallback?: ReactNode }
) {
  return function WithSectionErrorBoundaryWrapper(props: P) {
    return (
      <SectionErrorBoundary
        title={options?.title}
        description={options?.description}
        fallback={options?.fallback}
      >
        <Component {...props} />
      </SectionErrorBoundary>
    );
  };
}

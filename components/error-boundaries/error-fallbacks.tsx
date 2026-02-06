'use client';

import { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Loader2, WifiOff } from 'lucide-react';
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

/**
 * Pre-built error fallback components for different scenarios
 */

/**
 * Loading fallback - shown while content is being fetched
 */
interface LoadingFallbackProps {
  message?: string;
  className?: string;
}

export function LoadingFallback({
  message = 'Loading...',
  className,
}: LoadingFallbackProps) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

/**
 * Network error fallback - shown when network requests fail
 */
interface NetworkErrorFallbackProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkErrorFallback({
  onRetry,
  className,
}: NetworkErrorFallbackProps) {
  return (
    <Card
      className={cn('border-amber-200 dark:border-amber-900/50', className)}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full p-2">
            <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Connection Error</CardTitle>
            <CardDescription>
              Unable to connect to the server. Please check your internet
              connection.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {onRetry && (
        <CardFooter>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * Not found fallback - shown when content is not found
 */
interface NotFoundFallbackProps {
  title?: string;
  description?: string;
  className?: string;
}

export function NotFoundFallback({
  title = 'Not Found',
  description = 'The requested content could not be found.',
  className,
}: NotFoundFallbackProps) {
  return (
    <Card className={cn('border-gray-200 dark:border-gray-800', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-2">
            <AlertCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * Permission denied fallback - shown when user lacks access
 */
interface PermissionDeniedFallbackProps {
  className?: string;
}

export function PermissionDeniedFallback({
  className,
}: PermissionDeniedFallbackProps) {
  return (
    <Card className={cn('border-red-200 dark:border-red-900/50', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view this content.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * Generic error card - customizable error display
 */
interface ErrorCardProps {
  title?: string;
  message: string;
  severity?: 'info' | 'warning' | 'error';
  onRetry?: () => void;
  onDismiss?: () => void;
  eventId?: string;
  className?: string;
  children?: ReactNode;
}

export function ErrorCard({
  title,
  message,
  severity = 'error',
  onRetry,
  onDismiss,
  eventId,
  className,
  children,
}: ErrorCardProps) {
  const severityStyles = {
    info: {
      border: 'border-blue-200 dark:border-blue-900/50',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      icon: AlertCircle,
    },
    warning: {
      border: 'border-amber-200 dark:border-amber-900/50',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
    },
    error: {
      border: 'border-red-200 dark:border-red-900/50',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      icon: AlertCircle,
    },
  };

  const styles = severityStyles[severity];
  const Icon = styles.icon;

  return (
    <Card className={cn(styles.border, className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', styles.iconBg)}>
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
          </div>
          <div className="flex-1">
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            <CardDescription>{message}</CardDescription>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      {children && <CardContent>{children}</CardContent>}

      {eventId && (
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Error ID:{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {eventId}
            </code>
          </p>
        </CardContent>
      )}

      {onRetry && (
        <CardFooter>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * Inline error message - compact error display
 */
interface InlineErrorProps {
  message: string;
  severity?: 'info' | 'warning' | 'error';
  className?: string;
}

export function InlineError({
  message,
  severity = 'error',
  className,
}: InlineErrorProps) {
  const severityStyles = {
    info: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
    warning:
      'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
    error:
      'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm px-3 py-2 rounded-md border',
        severityStyles[severity],
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

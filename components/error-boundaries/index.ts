/**
 * Error Boundary Components
 *
 * A comprehensive set of error boundary components for handling React errors
 * at different levels of the application.
 *
 * Components:
 * - PageErrorBoundary: Full-page error handling
 * - SectionErrorBoundary: Section/widget error handling
 * - InlineErrorBoundary: Compact inline error handling
 * - AsyncErrorBoundary: Async operation error handling
 * - Error Fallbacks: Pre-built error UI components
 */

// Page-level error boundary
export {
  PageErrorBoundary,
  withPageErrorBoundary,
} from './page-error-boundary';

// Section-level error boundary
export {
  SectionErrorBoundary,
  InlineErrorBoundary,
  withSectionErrorBoundary,
} from './section-error-boundary';

// Async error boundary
export {
  AsyncErrorBoundary,
  useAsyncError,
  useAsyncHandler,
} from './async-error-boundary';

// Error fallback components
export {
  LoadingFallback,
  NetworkErrorFallback,
  NotFoundFallback,
  PermissionDeniedFallback,
  ErrorCard,
  InlineError,
} from './error-fallbacks';

// Re-export the original error boundary for backward compatibility
export { ErrorBoundary, useSentry, withErrorBoundary } from '../error-boundary';

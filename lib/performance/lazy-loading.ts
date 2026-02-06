import dynamic, { DynamicOptionsLoadingProps } from 'next/dynamic';
import { ComponentType, ReactElement } from 'react';

/**
 * Lazy Loading Utilities for Core Web Vitals Optimization
 *
 * These utilities help reduce initial bundle size and improve:
 * - FID (First Input Delay): Less JavaScript to parse on initial load
 * - LCP (Largest Contentful Paint): Faster initial page render
 *
 * @example
 * // Lazy load a heavy component
 * const HeavyChart = lazyLoadComponent(() => import('@/components/Chart'));
 *
 * // Lazy load with custom loading
 * const Editor = lazyLoadComponent(
 *   () => import('@/components/Editor'),
 *   { loading: () => <EditorSkeleton /> }
 * );
 */

interface LazyLoadOptions {
  /** Component to show while loading */
  loading?: (loadingProps: DynamicOptionsLoadingProps) => ReactElement | null;
  /** Use SSR for this component */
  ssr?: boolean;
}

/**
 * Creates a lazy-loaded component with proper loading states
 * Automatically handles code splitting via dynamic imports
 *
 * @param importFn - Dynamic import function for the component
 * @param options - Loading and SSR options
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const { loading, ssr = true } = options;

  return dynamic(importFn, {
    loading: loading ?? (() => null),
    ssr,
  });
}

/**
 * Creates a lazy-loaded component that only renders on the client
 * Useful for components that use browser-only APIs
 *
 * @param importFn - Dynamic import function for the component
 * @param options - Loading options (SSR is disabled)
 */
export function clientOnlyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: Omit<LazyLoadOptions, 'ssr'> = {}
) {
  return lazyLoadComponent(importFn, { ...options, ssr: false });
}

/**
 * Preload a component before it's needed
 * Call this on hover or when you anticipate the component will be needed
 *
 * @param importFn - Dynamic import function to preload
 */
export function preloadComponent(importFn: () => Promise<any>) {
  // Trigger the import to preload the chunk
  importFn().catch(() => {
    // Silently ignore preload errors
    console.debug('Component preload skipped');
  });
}

/**
 * Creates an intersection observer-based lazy loader
 * Useful for lazy loading components when they come into view
 *
 * @param callback - Function to call when element is in view
 * @param options - IntersectionObserver options
 */
export function createIntersectionLoader(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  if (typeof window === 'undefined') {
    return { observe: () => {}, disconnect: () => {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      });
    },
    {
      rootMargin: '100px', // Start loading 100px before entering viewport
      threshold: 0.01,
      ...options,
    }
  );

  return observer;
}

/**
 * Defer execution until the browser is idle
 * Uses requestIdleCallback for non-critical operations
 *
 * @param callback - Function to execute when idle
 * @param options - Idle callback options
 */
export function scheduleIdleTask(
  callback: () => void,
  options: IdleRequestOptions = { timeout: 2000 }
) {
  if (typeof window === 'undefined') {
    return;
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, options);
  } else {
    // Fallback for Safari
    setTimeout(callback, 1);
  }
}

/**
 * Defer non-critical scripts until after page load
 * Improves FID by reducing JavaScript execution during initial load
 *
 * @param callback - Function to execute after page is interactive
 */
export function afterPageLoad(callback: () => void) {
  if (typeof window === 'undefined') {
    return;
  }

  if (document.readyState === 'complete') {
    scheduleIdleTask(callback);
  } else {
    window.addEventListener('load', () => {
      scheduleIdleTask(callback);
    });
  }
}

/**
 * Preload a route for faster navigation
 * Useful for prefetching likely navigation destinations
 *
 * @param href - Route to preload
 */
export function prefetchRoute(href: string) {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'document';
  document.head.appendChild(link);
}

// Type declaration for requestIdleCallback
declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: IdleDeadline) => void,
      options?: IdleRequestOptions
    ) => number;
  }

  interface IdleDeadline {
    readonly didTimeout: boolean;
    timeRemaining(): number;
  }

  interface IdleRequestOptions {
    timeout?: number;
  }
}

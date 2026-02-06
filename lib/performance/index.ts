/**
 * Performance Utilities
 *
 * Collection of utilities for optimizing Core Web Vitals:
 * - LCP (Largest Contentful Paint): Target < 2.5s
 * - FID (First Input Delay): Target < 100ms
 * - CLS (Cumulative Layout Shift): Target < 0.1
 */

// Lazy loading utilities
export {
  lazyLoadComponent,
  clientOnlyComponent,
  preloadComponent,
  createIntersectionLoader,
  scheduleIdleTask,
  afterPageLoad,
  prefetchRoute,
} from './lazy-loading';

// Web Vitals monitoring
export {
  reportWebVitals,
  checkVitalsTargets,
  type WebVitalsMetric,
} from './web-vitals';

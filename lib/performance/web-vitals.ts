'use client';

/**
 * Core Web Vitals Monitoring
 *
 * Tracks and reports key performance metrics:
 * - LCP (Largest Contentful Paint): Target < 2.5s
 * - FID (First Input Delay): Target < 100ms
 * - CLS (Cumulative Layout Shift): Target < 0.1
 * - TTFB (Time to First Byte): Target < 800ms
 * - FCP (First Contentful Paint): Target < 1.8s
 * - INP (Interaction to Next Paint): Target < 200ms
 *
 * @example
 * // In your layout or _app.tsx
 * import { reportWebVitals } from '@/lib/performance/web-vitals';
 *
 * // Automatic reporting
 * useEffect(() => {
 *   reportWebVitals(console.log);
 * }, []);
 */

export interface WebVitalsMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

// Thresholds for Core Web Vitals (in milliseconds for time-based, unitless for CLS)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
};

/**
 * Get rating for a metric value
 */
function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Generate a unique ID for the metric
 */
function generateId(): string {
  return `v3-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Observe Largest Contentful Paint (LCP)
 * Target: < 2.5s for good user experience
 */
function observeLCP(callback: (metric: WebVitalsMetric) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        startTime: number;
      };

      if (lastEntry) {
        const value = lastEntry.startTime;
        callback({
          name: 'LCP',
          value,
          rating: getRating('LCP', value),
          delta: value,
          id: generateId(),
          entries,
        });
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    return () => observer.disconnect();
  } catch (e) {
    console.debug('LCP observation not supported');
  }
}

/**
 * Observe First Input Delay (FID)
 * Target: < 100ms for good user experience
 */
function observeFID(callback: (metric: WebVitalsMetric) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as (PerformanceEntry & {
        processingStart: number;
        startTime: number;
      })[];

      entries.forEach((entry) => {
        const value = entry.processingStart - entry.startTime;
        callback({
          name: 'FID',
          value,
          rating: getRating('FID', value),
          delta: value,
          id: generateId(),
          entries: [entry],
        });
      });
    });

    observer.observe({ type: 'first-input', buffered: true });

    return () => observer.disconnect();
  } catch (e) {
    console.debug('FID observation not supported');
  }
}

/**
 * Observe Cumulative Layout Shift (CLS)
 * Target: < 0.1 for good user experience
 */
function observeCLS(callback: (metric: WebVitalsMetric) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as (PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      })[];

      entries.forEach((entry) => {
        // Only count layout shifts without user input
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0] as
            | (PerformanceEntry & { startTime: number })
            | undefined;
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1] as
            | (PerformanceEntry & { startTime: number })
            | undefined;

          // Start new session window if gap > 1s or window > 5s
          if (
            sessionValue &&
            firstSessionEntry &&
            lastSessionEntry &&
            (entry.startTime - lastSessionEntry.startTime > 1000 ||
              entry.startTime - firstSessionEntry.startTime > 5000)
          ) {
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              clsEntries = [...sessionEntries];
            }
            sessionValue = entry.value;
            sessionEntries = [entry];
          } else {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          }

          // Report the current max CLS
          const currentCLS = Math.max(clsValue, sessionValue);
          callback({
            name: 'CLS',
            value: currentCLS,
            rating: getRating('CLS', currentCLS),
            delta: entry.value,
            id: generateId(),
            entries: clsValue > sessionValue ? clsEntries : sessionEntries,
          });
        }
      });
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    return () => observer.disconnect();
  } catch (e) {
    console.debug('CLS observation not supported');
  }
}

/**
 * Observe Time to First Byte (TTFB)
 * Target: < 800ms for good user experience
 */
function observeTTFB(callback: (metric: WebVitalsMetric) => void) {
  if (typeof window === 'undefined') return;

  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (navigationEntry) {
      const value =
        navigationEntry.responseStart - navigationEntry.requestStart;
      callback({
        name: 'TTFB',
        value,
        rating: getRating('TTFB', value),
        delta: value,
        id: generateId(),
        entries: [navigationEntry],
      });
    }
  } catch (e) {
    console.debug('TTFB observation not supported');
  }
}

/**
 * Observe First Contentful Paint (FCP)
 * Target: < 1.8s for good user experience
 */
function observeFCP(callback: (metric: WebVitalsMetric) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(
        (entry) => entry.name === 'first-contentful-paint'
      ) as (PerformanceEntry & { startTime: number }) | undefined;

      if (fcpEntry) {
        const value = fcpEntry.startTime;
        callback({
          name: 'FCP',
          value,
          rating: getRating('FCP', value),
          delta: value,
          id: generateId(),
          entries: [fcpEntry],
        });
        observer.disconnect();
      }
    });

    observer.observe({ type: 'paint', buffered: true });

    return () => observer.disconnect();
  } catch (e) {
    console.debug('FCP observation not supported');
  }
}

/**
 * Report all Core Web Vitals
 *
 * @param callback - Function to call with each metric
 * @example
 * reportWebVitals((metric) => {
 *   console.log(metric.name, metric.value, metric.rating);
 *   // Send to analytics
 *   analytics.track('web-vitals', metric);
 * });
 */
export function reportWebVitals(callback: (metric: WebVitalsMetric) => void) {
  observeLCP(callback);
  observeFID(callback);
  observeCLS(callback);
  observeTTFB(callback);
  observeFCP(callback);
}

/**
 * Check if all Core Web Vitals meet the targets
 */
export function checkVitalsTargets(metrics: WebVitalsMetric[]): {
  passed: boolean;
  results: Record<string, { value: number; target: number; passed: boolean }>;
} {
  const targets = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
  };

  const results: Record<
    string,
    { value: number; target: number; passed: boolean }
  > = {};
  let allPassed = true;

  metrics.forEach((metric) => {
    const target = targets[metric.name as keyof typeof targets];
    if (target !== undefined) {
      const passed = metric.value <= target;
      results[metric.name] = { value: metric.value, target, passed };
      if (!passed) allPassed = false;
    }
  });

  return { passed: allPassed, results };
}

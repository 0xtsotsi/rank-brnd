'use client';

import { useEffect, useCallback } from 'react';
import { reportWebVitals, WebVitalsMetric } from '@/lib/performance/web-vitals';

/**
 * WebVitalsReporter Component
 *
 * Automatically reports Core Web Vitals metrics.
 * Include this component in your root layout to start monitoring.
 *
 * @example
 * // In app/layout.tsx
 * import { WebVitalsReporter } from '@/components/performance/web-vitals-reporter';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <WebVitalsReporter />
 *       </body>
 *     </html>
 *   );
 * }
 */

interface WebVitalsReporterProps {
  /** Custom handler for metrics - called for each metric */
  onReport?: (metric: WebVitalsMetric) => void;
  /** Enable console logging in development */
  debug?: boolean;
  /** Send metrics to an analytics endpoint */
  analyticsEndpoint?: string;
}

export function WebVitalsReporter({
  onReport,
  debug = process.env.NODE_ENV === 'development',
  analyticsEndpoint,
}: WebVitalsReporterProps = {}) {
  const handleMetric = useCallback(
    (metric: WebVitalsMetric) => {
      // Debug logging
      if (debug) {
        const color =
          metric.rating === 'good'
            ? 'color: green'
            : metric.rating === 'needs-improvement'
              ? 'color: orange'
              : 'color: red';

        console.log(
          `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`,
          color
        );
      }

      // Custom handler
      if (onReport) {
        onReport(metric);
      }

      // Send to analytics endpoint
      if (analyticsEndpoint) {
        // Use sendBeacon for reliability (won't block page unload)
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          page: typeof window !== 'undefined' ? window.location.pathname : '',
          timestamp: Date.now(),
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon(analyticsEndpoint, body);
        } else {
          // Fallback for older browsers
          fetch(analyticsEndpoint, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(() => {
            // Silently fail - analytics shouldn't break the app
          });
        }
      }
    },
    [onReport, debug, analyticsEndpoint]
  );

  useEffect(() => {
    reportWebVitals(handleMetric);
  }, [handleMetric]);

  // This component doesn't render anything
  return null;
}

export default WebVitalsReporter;

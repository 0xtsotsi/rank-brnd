'use client';

import { useEffect } from 'react';
import type { StructuredData } from '@/types/seo';

interface JsonLdProps {
  data: StructuredData;
  id?: string;
}

/**
 * JsonLd Component
 *
 * Renders JSON-LD structured data in a script tag.
 * This component helps search engines understand your content better.
 *
 * @param data - The structured data object conforming to Schema.org
 * @param id - Optional ID for the script tag (useful for multiple schemas)
 *
 * @example
 * ```tsx
 * <JsonLd
 *   data={{
 *     '@context': 'https://schema.org',
 *     '@type': 'Organization',
 *     name: 'Rank.brnd',
 *     url: 'https://rank.brnd'
 *   }}
 * />
 * ```
 */
export function JsonLd({ data, id }: JsonLdProps) {
  useEffect(() => {
    // Create script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id || `json-ld-${Math.random().toString(36).substr(2, 9)}`;
    script.text = JSON.stringify(data, null, 0);

    // Append to head
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      document.head.removeChild(script);
    };
  }, [data, id]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Server-side JSON-LD Component
 *
 * Use this in server components or for static JSON-LD that doesn't change.
 * This version outputs the script tag directly during server rendering.
 *
 * @example
 * ```tsx
 * <JsonLdServer
 *   data={{
 *     '@context': 'https://schema.org',
 *     '@type': 'Organization',
 *     name: 'Rank.brnd',
 *     url: 'https://rank.brnd'
 *   }}
 * />
 * ```
 */
export function JsonLdServer({ data, id }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

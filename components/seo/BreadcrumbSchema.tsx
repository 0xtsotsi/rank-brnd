import type { BreadcrumbList } from '@/types/seo';

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
  homeUrl?: string;
  homeLabel?: string;
}

/**
 * BreadcrumbSchema Component
 *
 * Generates JSON-LD structured data for breadcrumb navigation.
 * This helps search engines understand your site structure and display
 * breadcrumb trails in search results.
 *
 * @param items - Array of breadcrumb items in order from home to current page
 * @param homeUrl - Optional home URL (defaults to NEXT_PUBLIC_APP_URL or /)
 * @param homeLabel - Optional home label (defaults to "Home")
 *
 * @example
 * ```tsx
 * <BreadcrumbSchema
 *   items={[
 *     { name: "Blog", url: "https://rank.brnd/blog" },
 *     { name: "SEO Tips", url: "https://rank.brnd/blog/seo-tips" },
 *     { name: "10 SEO Tips for 2025" }
 *   ]}
 * />
 * ```
 */
export function BreadcrumbSchema({
  items,
  homeUrl = process.env.NEXT_PUBLIC_APP_URL || '/',
  homeLabel = 'Home',
}: BreadcrumbSchemaProps) {
  // Build the breadcrumb list with home as the first item
  const allItems = [
    { name: homeLabel, url: homeUrl },
    ...items.filter((item) => item.name !== homeLabel),
  ];

  const breadcrumbData: BreadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbData),
      }}
    />
  );
}

/**
 * BreadcrumbBuilder Class
 *
 * Helper class for building breadcrumb schemas programmatically.
 * Useful for dynamic breadcrumb generation based on route data.
 *
 * @example
 * ```tsx
 * const breadcrumbs = new BreadcrumbBuilder()
 *   .add('Home', 'https://rank.brnd')
 *   .add('Blog', 'https://rank.brnd/blog')
 *   .add('SEO Tips', 'https://rank.brnd/blog/seo-tips')
 *   .build();
 *
 * <BreadcrumbSchema items={breadcrumbs} />
 * ```
 */
export class BreadcrumbBuilder {
  private items: BreadcrumbItem[] = [];

  /**
   * Add a breadcrumb item
   */
  add(name: string, url?: string): this {
    this.items.push({ name, url });
    return this;
  }

  /**
   * Add multiple breadcrumb items from a path
   * Splits a URL path into breadcrumb items
   */
  fromPath(
    path: string,
    baseUrl: string,
    labels?: Record<string, string>
  ): this {
    const segments = path.split('/').filter(Boolean);

    let currentPath = baseUrl;

    segments.forEach((segment) => {
      currentPath += `/${segment}`;

      // Use custom label if provided, otherwise format the segment
      const label = labels?.[segment] || this.formatSegment(segment);

      this.items.push({ name: label, url: currentPath });
    });

    return this;
  }

  /**
   * Format a URL segment into a readable label
   */
  private formatSegment(segment: string): string {
    return segment
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Build and return the breadcrumb items array
   */
  build(): BreadcrumbItem[] {
    return this.items;
  }

  /**
   * Clear all breadcrumb items
   */
  clear(): this {
    this.items = [];
    return this;
  }
}

/**
 * useBreadcrumbs Hook
 *
 * React hook for generating breadcrumbs from the current pathname.
 * Requires next/navigation to be available.
 *
 * @example
 * ```tsx
 * 'use client';
 * import { usePathname } from 'next/navigation';
 * import { BreadcrumbSchema, useBreadcrumbs } from '@/components/seo/BreadcrumbSchema';
 *
 * export default function Page() {
 *   const pathname = usePathname();
 *   const breadcrumbs = useBreadcrumbs(pathname);
 *
 *   return (
 *     <>
 *       <BreadcrumbSchema items={breadcrumbs} />
 *       {/* Page content *\/}
 *     </>
 *   );
 * }
 * ```
 */
export function useBreadcrumbs(
  pathname: string,
  labels?: Record<string, string>
): BreadcrumbItem[] {
  const builder = new BreadcrumbBuilder();

  // Get the base URL from environment or use a default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  // Build breadcrumbs from the pathname
  builder.fromPath(pathname, baseUrl, labels);

  return builder.build();
}

export default BreadcrumbSchema;

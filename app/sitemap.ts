import { MetadataRoute } from 'next';

/**
 * Dynamic Sitemap Generation
 *
 * This file generates a sitemap.xml that lists all pages in the application.
 * Search engines use sitemaps to discover and index pages more efficiently.
 *
 * Sitemap structure:
 * - Static pages (always included)
 * - Dynamic routes (programmatically discovered)
 * - Proper change frequency and priority for SEO
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata
 */

// Base URL from environment or default
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rank.brnd';

// Define all static routes in the application
const staticRoutes: Array<{
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'always';
  priority?: number;
}> = [
  {
    url: '',
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: '/calendar-demo',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: '/dashboard',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    url: '/dashboard/keywords',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    url: '/dashboard/planner',
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    url: '/dashboard/pricing',
    changeFrequency: 'weekly',
    priority: 0.6,
  },
];

/**
 * Generate sitemap entries
 *
 * Each entry includes:
 * - url: The full URL of the page
 * - lastModified: When the page was last updated
 * - changeFrequency: How often the page changes
 * - priority: Relative importance (0.0 to 1.0)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: route.lastModified || currentDate,
    changeFrequency: route.changeFrequency || 'weekly',
    priority: route.priority || 0.5,
  }));
}

/**
 * Static Alternative (Optional)
 *
 * For applications that need truly static sitemaps (e.g., static hosting),
 * you can also create a public/sitemap.xml file directly.
 * However, this dynamic approach is preferred for Next.js as it:
 * - Automatically handles environment-specific URLs
 * - Can be extended with dynamic routes from databases
 * - Stays up-to-date with route changes
 */

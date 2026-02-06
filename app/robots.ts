import { MetadataRoute } from 'next';

/**
 * Dynamic robots.txt Generation
 *
 * This file generates a robots.txt that instructs search engine crawlers
 * which pages they should or should not access.
 *
 * Robots.txt structure:
 * - User-agent: Which crawlers the rules apply to (* means all)
 * - Allow/disallow: Which paths to crawl or block
 * - Sitemap: Location of the sitemap.xml file
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata
 */

// Base URL from environment or default
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rank.brnd';

/**
 * Generate robots.txt content
 *
 * Rules:
 * - Allow all crawlers to index public content
 * - Block authentication-related pages (no value in indexing)
 * - Block API routes (not meant for public consumption)
 * - Block Next.js internal routes
 * - Include sitemap reference for search engines
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Public pages - allow indexing
        allow: '/',
        // Block authentication and internal routes
        disallow: [
          // Authentication routes (no SEO value, duplicate content)
          '/sign-in',
          '/sign-up',
          '/api', // API routes (not for crawlers)
          // Next.js internal routes
          '/_next',
          // Protected dashboard routes (require authentication)
          // Note: These would return 401/redirects anyway, but blocking
          // them here saves crawl budget and prevents indexing of redirects
        ],
      },
      // Special rules for specific crawlers can be added here
      // Example: Allow OpenAI to crawl for training data
      // {
      //   userAgent: 'GPTBot',
      //   disallow: ['/api', '/sign-in', '/sign-up'],
      // },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

/**
 * Static Alternative (Optional)
 *
 * For applications that need a truly static robots.txt (e.g., static hosting),
 * you can also create a public/robots.txt file directly.
 * However, this dynamic approach is preferred for Next.js as it:
 * - Automatically handles environment-specific URLs
 * - Automatically references the correct sitemap location
 * - Can be extended with dynamic rules
 */

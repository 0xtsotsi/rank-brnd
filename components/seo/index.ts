/**
 * SEO Components - Structured Data for Schema.org
 *
 * This module exports all JSON-LD structured data components.
 * These components help search engines understand your content better.
 *
 * @example
 * ```tsx
 * import { ArticleSchema, FAQSchema, BreadcrumbSchema, OrganizationSchema } from '@/components/seo';
 *
 * export default function BlogPost({ post }) {
 *   return (
 *     <>
 *       <ArticleSchema
 *         headline={post.title}
 *         description={post.excerpt}
 *         image={post.coverImage}
 *         authorName={post.author.name}
 *         publishedDate={post.publishedAt}
 *         publisherName="My Company"
 *         publisherUrl="https://example.com"
 *         url={`https://example.com/blog/${post.slug}`}
 *       />
 *       <BreadcrumbSchema items={post.breadcrumbs} />
 *       {/* Render your content *\/}
 *     </>
 *   );
 * }
 * ```
 */

// Base JSON-LD component
export { JsonLd, JsonLdServer } from './JsonLd';

// Article/Blog schema
export { ArticleSchema, BlogPostingSchema } from './ArticleSchema';

// FAQ schema
export { FAQSchema, FAQSection } from './FAQSchema';

// Breadcrumb schema
export {
  BreadcrumbSchema,
  BreadcrumbBuilder,
  useBreadcrumbs,
} from './BreadcrumbSchema';

// Organization schema
export {
  OrganizationSchema,
  SoftwareOrganizationSchema,
  WebSiteSchema,
} from './OrganizationSchema';

// Types
export type {
  StructuredData,
  JsonLdProps,
  Article,
  Person,
  Organization,
  BreadcrumbList,
  BreadcrumbItem as BreadcrumbItemType,
  FAQPage,
  Question,
  Answer,
  WebSite,
  WebPage,
  ContactPoint,
  PostalAddress,
} from '@/types/seo';

// FAQItem is defined locally in FAQSchema.tsx
export type { FAQItem } from './FAQSchema';

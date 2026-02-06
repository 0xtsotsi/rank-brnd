// @ts-nocheck - Database types need to be regenerated with Supabase CLI

import type { Article, Person, Organization } from '@/types/seo';

interface ArticleSchemaProps {
  headline: string;
  description?: string;
  image: string | string[];
  authorName: string;
  authorUrl?: string;
  publishedDate: string;
  modifiedDate?: string;
  publisherName: string;
  publisherUrl: string;
  publisherLogo?: string;
  url: string;
  keywords?: string | string[];
  articleSection?: string;
  wordCount?: number;
  articleBody?: string;
  thumbnailUrl?: string;
  inLanguage?: string;
}

/**
 * ArticleSchema Component
 *
 * Generates JSON-LD structured data for articles, blog posts, and news articles.
 * This helps search engines understand your content and can lead to rich snippets.
 *
 * @example
 * ```tsx
 * <ArticleSchema
 *   headline="10 SEO Tips for 2025"
 *   description="Learn the latest SEO strategies..."
 *   image="https://example.com/article-image.jpg"
 *   authorName="John Doe"
 *   authorUrl="https://example.com/authors/john-doe"
 *   publishedDate="2025-01-15T10:00:00Z"
 *   publisherName="Rank.brnd"
 *   publisherUrl="https://rank.brnd"
 *   url="https://rank.brnd/blog/10-seo-tips"
 * />
 * ```
 */
export function ArticleSchema({
  headline,
  description,
  image,
  authorName,
  authorUrl,
  publishedDate,
  modifiedDate,
  publisherName,
  publisherUrl,
  publisherLogo,
  url,
  keywords,
  articleSection,
  wordCount,
  articleBody,
  thumbnailUrl,
  inLanguage = 'en',
}: ArticleSchemaProps) {
  const articleData: Article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl,
    } as Person,
    datePublished: publishedDate,
    dateModified: modifiedDate,
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      url: publisherUrl,
      logo: publisherLogo,
    } as Organization,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords,
    articleSection,
    wordCount,
    articleBody,
    thumbnailUrl,
    inLanguage,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleData),
      }}
    />
  );
}

interface BlogPostingSchemaProps extends ArticleSchemaProps {
  articleType?: 'BlogPosting' | 'NewsArticle' | 'TechArticle' | 'Article';
}

/**
 * BlogPostingSchema Component
 *
 * Extended article schema specifically for blog posts.
 * Can also be used for news articles and technical articles.
 *
 * @example
 * ```tsx
 * <BlogPostingSchema
 *   articleType="BlogPosting"
 *   headline="How AI is Transforming SEO"
 *   image="https://example.com/ai-seo.jpg"
 *   authorName="Jane Smith"
 *   publishedDate="2025-01-15T10:00:00Z"
 *   publisherName="Rank.brnd"
 *   publisherUrl="https://rank.brnd"
 *   url="https://rank.brnd/blog/ai-transforming-seo"
 * />
 * ```
 */
export function BlogPostingSchema({
  articleType = 'BlogPosting',
  ...props
}: BlogPostingSchemaProps) {
  const data: Article = {
    '@context': 'https://schema.org',
    '@type': articleType,
    headline: props.headline,
    description: props.description,
    image: props.image,
    author: {
      '@type': 'Person',
      name: props.authorName,
      url: props.authorUrl,
    } as Person,
    datePublished: props.publishedDate,
    dateModified: props.modifiedDate,
    publisher: {
      '@type': 'Organization',
      name: props.publisherName,
      url: props.publisherUrl,
      logo: props.publisherLogo,
    } as Organization,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': props.url,
    },
    keywords: props.keywords,
    articleSection: props.articleSection,
    wordCount: props.wordCount,
    articleBody: props.articleBody,
    thumbnailUrl: props.thumbnailUrl,
    inLanguage: props.inLanguage || 'en',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

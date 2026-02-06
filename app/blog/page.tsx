import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo';
import type { Metadata } from 'next';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog - Rank.brnd',
  description:
    'SEO tips, strategies, and best practices from the Rank.brnd team.',
  openGraph: {
    title: 'Blog - Rank.brnd',
    description:
      'SEO tips, strategies, and best practices from the Rank.brnd team.',
    type: 'website',
  },
};

const blogPosts = [
  {
    slug: 'seo-tips-for-2025',
    title: '10 Essential SEO Tips for 2025',
    excerpt:
      'Discover the top SEO strategies for 2025, including AI-powered optimization and technical SEO best practices.',
    date: '2025-01-15',
    author: 'Sarah Johnson',
    readTime: '8 min',
  },
  {
    slug: 'ai-content-optimization',
    title: 'How AI is Transforming Content Optimization',
    excerpt:
      'Learn how artificial intelligence is revolutionizing the way we create and optimize content for search engines.',
    date: '2025-01-10',
    author: 'Michael Chen',
    readTime: '6 min',
  },
  {
    slug: 'technical-seo-audit',
    title: 'Complete Technical SEO Audit Checklist',
    excerpt:
      'A comprehensive guide to conducting technical SEO audits that improve your site&apos;s performance and rankings.',
    date: '2025-01-05',
    author: 'Sarah Johnson',
    readTime: '12 min',
  },
];

const breadcrumbs = [{ name: 'Blog', url: '' }];

export default function BlogPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rank.brnd';

  return (
    <>
      {/* JSON-LD Structured Data */}
      <BreadcrumbSchema items={breadcrumbs} homeUrl={appUrl} />

      {/* Page Content */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="flex mb-8 text-sm text-gray-600 dark:text-gray-400">
            <Link
              href="/"
              className="hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 dark:text-white font-medium">
              Blog
            </span>
          </nav>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Rank.brnd Blog
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              SEO tips, strategies, and best practices to help you rank higher.
            </p>
          </div>

          {/* Blog Posts Grid */}
          <div className="grid gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.slug}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                <Link href={`/blog/${post.slug}`} className="block p-6">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <time>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span>•</span>
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{post.readTime} read</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

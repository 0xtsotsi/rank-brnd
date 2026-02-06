'use client';

/**
 * Article Preview Modal Component
 *
 * Enhanced preview modal with multiple views:
 * - Published: Shows how the article will appear when published
 * - SERP: Shows Google search result preview
 * - Social: Shows social media card preview
 */

import { useState } from 'react';
import {
  X,
  Eye,
  Search,
  Share2,
  Calendar,
  User,
  Clock,
  Globe,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArticlePreviewData {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  metaTitle: string;
  metaDescription: string;
  author?: string;
  publishedAt?: string | null;
  tags: string[];
  category: string | null;
  readingTime: number;
}

interface ArticlePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ArticlePreviewData;
  siteUrl?: string;
  siteName?: string;
}

type PreviewTab = 'published' | 'serp' | 'social';

export function ArticlePreviewModal({
  isOpen,
  onClose,
  article,
  siteUrl = 'https://example.com',
  siteName = 'My Blog',
}: ArticlePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('published');

  if (!isOpen) return null;

  const articleUrl = `${siteUrl}/articles/${article.slug}`;
  const displayTitle = article.metaTitle || article.title;
  const displayDescription = article.metaDescription || article.excerpt || '';

  const tabs: Array<{
    key: PreviewTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'published', label: 'Published View', icon: Eye },
    { key: 'serp', label: 'Google Search', icon: Search },
    { key: 'social', label: 'Social Card', icon: Share2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Article Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                  isActive
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-t border-x border-gray-200 dark:border-gray-700 -mb-px'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'published' && (
            <PublishedView article={article} siteName={siteName} />
          )}
          {activeTab === 'serp' && (
            <SERPView
              article={article}
              articleUrl={articleUrl}
              siteName={siteName}
            />
          )}
          {activeTab === 'social' && (
            <SocialView
              article={article}
              articleUrl={articleUrl}
              siteName={siteName}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Published View - Shows how the article will appear on the site
 */
function PublishedView({
  article,
  siteName,
}: {
  article: ArticlePreviewData;
  siteName: string;
}) {
  const publishDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Hero Image */}
        {article.featuredImageUrl && (
          <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.featuredImageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Article Content */}
        <div className="p-8">
          {/* Category */}
          {article.category && (
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                {article.category}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            {article.title || 'Untitled Article'}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            {article.author && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span>{article.author}</span>
              </div>
            )}
            {publishDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{publishDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{article.readingTime} min read</span>
            </div>
          </div>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {article.excerpt}
            </p>
          )}

          {/* Content */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html:
                article.content ||
                '<p class="text-gray-500">No content yet...</p>',
            }}
          />

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SERP View - Shows Google search result preview
 */
function SERPView({
  article,
  articleUrl,
  siteName,
}: {
  article: ArticlePreviewData;
  articleUrl: string;
  siteName: string;
}) {
  const displayTitle = article.metaTitle || article.title;
  const displayDescription =
    article.metaDescription || article.excerpt || 'No description available...';

  // Truncate functions
  const truncateTitle = (title: string) => {
    if (title.length <= 60) return title;
    return title.substring(0, 57) + '...';
  };

  const truncateDescription = (desc: string) => {
    if (desc.length <= 160) return desc;
    return desc.substring(0, 157) + '...';
  };

  const truncatedTitle = truncateTitle(displayTitle);
  const truncatedDescription = truncateDescription(displayDescription);

  // Validation checks
  const titleLength = displayTitle.length;
  const descriptionLength = displayDescription.length;
  const titleValid = titleLength >= 30 && titleLength <= 60;
  const descriptionValid = descriptionLength >= 120 && descriptionLength <= 160;

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Google Result Preview */}
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            {/* Fake browser/search bar */}
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-600 rounded-full text-xs text-gray-500 dark:text-gray-400">
                <Globe className="w-3 h-3" />
                Google
              </div>
            </div>

            {/* Search Result */}
            <div className="space-y-1">
              {/* Site info */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-500 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300">
                  {siteName.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {siteName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {articleUrl}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl text-blue-800 dark:text-blue-400 font-normal hover:underline cursor-pointer">
                {truncatedTitle}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {truncatedDescription}
              </p>

              {/* Rich result indicators */}
              {article.featuredImageUrl && (
                <div className="mt-3 flex gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.featuredImageUrl}
                    alt=""
                    className="w-24 h-24 object-cover rounded"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEO Analysis Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4" />
            SEO Analysis
          </h4>
          <div className="space-y-3">
            {/* Title check */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {titleValid ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Title Length
                </span>
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  titleValid
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                )}
              >
                {titleLength}/60
              </span>
            </div>
            {!titleValid && (
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                {titleLength < 30
                  ? 'Title is too short. Aim for 30-60 characters.'
                  : 'Title is too long. Try to keep it under 60 characters.'}
              </p>
            )}

            {/* Description check */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {descriptionValid ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Description Length
                </span>
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  descriptionValid
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                )}
              >
                {descriptionLength}/160
              </span>
            </div>
            {!descriptionValid && (
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                {descriptionLength < 120
                  ? 'Description is too short. Aim for 120-160 characters.'
                  : 'Description is too long. Try to keep it under 160 characters.'}
              </p>
            )}

            {/* URL check */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  URL Structure
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                /articles/{article.slug}
              </span>
            </div>

            {/* Featured image check */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {article.featuredImageUrl ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Featured Image
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {article.featuredImageUrl ? 'Set' : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Social View - Shows social media card previews
 */
function SocialView({
  article,
  articleUrl,
  siteName,
}: {
  article: ArticlePreviewData;
  articleUrl: string;
  siteName: string;
}) {
  const displayTitle = article.metaTitle || article.title;
  const displayDescription = article.metaDescription || article.excerpt || '';

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Twitter/X Card Preview */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Twitter/X Card Preview
          </h4>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-700 max-w-lg">
            {/* Twitter header */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    Your Site
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {articleUrl}
                  </div>
                </div>
              </div>
            </div>
            {/* Twitter content */}
            <div className="p-3">
              {article.featuredImageUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.featuredImageUrl}
                    alt=""
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                </>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                {displayTitle}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {displayDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Facebook/LinkedIn Card Preview */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Open Graph (Facebook/LinkedIn) Preview
          </h4>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-700 max-w-lg">
            <div className="p-2 bg-gray-100 dark:bg-gray-600">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {articleUrl}
              </div>
            </div>
            {article.featuredImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.featuredImageUrl}
                  alt=""
                  className="w-full h-52 object-cover"
                />
              </>
            ) : (
              <div className="w-full h-52 bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
            )}
            <div className="p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                {siteName.toUpperCase()}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                {displayTitle}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {displayDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Social SEO Tips */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Social Card Tips
          </h4>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">•</span>
              <span>
                Use a featured image that&apos;s at least 1200x630px for best
                results
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">•</span>
              <span>
                Keep your title under 60 characters for optimal display
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">•</span>
              <span>Write a compelling description that encourages clicks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">•</span>
              <span>
                Your meta title and description are used for social cards
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

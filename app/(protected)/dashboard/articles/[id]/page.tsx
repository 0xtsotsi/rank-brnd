'use client';

/**
 * Article Edit Page
 *
 * Client-side page for editing an existing article.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArticleEditor } from '@/components/articles/article-editor';
import type { Article } from '@/components/articles/article-editor';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/articles?id=${articleId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }

      const data = await response.json();

      if (!data || (!data.id && !response.ok)) {
        throw new Error('Article not found');
      }

      setArticle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    // Get organization ID from user session
    // TODO: Fetch actual user data
    setOrganizationId('default-org-id');

    // Fetch article
    if (articleId) {
      fetchArticle();
    }
  }, [articleId, fetchArticle]);

  const handleSave = async (articleData: Partial<Article>) => {
    const response = await fetch('/api/articles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: articleId,
        ...articleData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save article');
    }

    const savedArticle = await response.json();
    setArticle(savedArticle);
    return savedArticle;
  };

  const handlePublish = async () => {
    const response = await fetch('/api/articles/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: articleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to publish article');
    }

    const publishedArticle = await response.json();
    setArticle(publishedArticle);
    return publishedArticle;
  };

  const handleUnpublish = async () => {
    const response = await fetch('/api/articles/unpublish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: articleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to unpublish article');
    }

    const unpublishedArticle = await response.json();
    setArticle(unpublishedArticle);
    return unpublishedArticle;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading article...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard/articles')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </button>
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-900 dark:text-red-400">
              Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-600 dark:text-gray-400">Article not found</p>
        <button
          onClick={() => router.push('/dashboard/articles')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Articles
        </button>
      </div>
    );
  }

  return (
    <ArticleEditor
      article={article}
      organizationId={organizationId}
      onSave={handleSave}
      onPublish={handlePublish}
      onUnpublish={handleUnpublish}
    />
  );
}

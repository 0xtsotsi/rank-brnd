'use client';

/**
 * New Article Page
 *
 * Client-side page for creating a new article.
 * Supports pre-populating with AI-generated content.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ArticleEditor } from '@/components/articles/article-editor';
import type { Article } from '@/components/articles/article-editor';

interface GeneratedArticle {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

export default function NewArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGenerated = searchParams.get('generated') === 'true';

  const [organizationId, setOrganizationId] = useState<string>('');
  const [createdArticleId, setCreatedArticleId] = useState<string | null>(null);
  const [generatedArticle, setGeneratedArticle] =
    useState<GeneratedArticle | null>(null);

  useEffect(() => {
    // Get organization ID from user session
    // TODO: Fetch actual user data
    setOrganizationId('default-org-id');

    // Check for generated article in sessionStorage
    if (isGenerated) {
      const stored = sessionStorage.getItem('generatedArticle');
      if (stored) {
        try {
          setGeneratedArticle(JSON.parse(stored));
          // Clear after loading to prevent reuse
          sessionStorage.removeItem('generatedArticle');
        } catch (error) {
          console.error('Failed to parse generated article:', error);
        }
      }
    }
  }, [isGenerated]);

  const handleSave = async (articleData: Partial<Article>) => {
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulk: false,
        organization_id: organizationId,
        ...articleData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save article');
    }

    const savedArticle = await response.json();

    // If this was the initial save, redirect to the edit page
    if (!createdArticleId && savedArticle.id) {
      setCreatedArticleId(savedArticle.id);
      router.replace(`/dashboard/articles/${savedArticle.id}`);
    }

    return savedArticle;
  };

  const handlePublish = async (articleId: string) => {
    const response = await fetch('/api/articles/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: articleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to publish article');
    }

    return await response.json();
  };

  const handleUnpublish = async (articleId: string) => {
    const response = await fetch('/api/articles/unpublish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: articleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to unpublish article');
    }

    return await response.json();
  };

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <ArticleEditor
      organizationId={organizationId}
      onSave={handleSave}
      onPublish={handlePublish}
      onUnpublish={handleUnpublish}
      isNew
      generatedArticle={generatedArticle}
    />
  );
}

'use client';

/**
 * Article Editor Component
 *
 * Full-featured article editor with:
 * - Tiptap rich text editor
 * - Auto-save functionality
 * - Word count and readability metrics
 * - SEO metadata editing
 * - Status management
 * - Version history
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Save,
  Eye,
  Globe,
  FileText,
  Calendar,
  Tag,
  Image as ImageIcon,
  Settings,
  Clock,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  X,
  History,
  Copy,
  ExternalLink,
  Wand2,
  Search,
} from 'lucide-react';
import { TiptapEditor, calculateReadabilityScore } from './tiptap-editor';
import { ImageGenerationDialog } from './image-generation-dialog';
import { SEOSidebar } from './seo-sidebar';
import { ArticlePreviewModal } from './article-preview-modal';
import { VersionHistoryModal } from './version-history-modal';
import { cn } from '@/lib/utils';
import type { ImageGenerationResponse } from '@/types/image-generation';

export interface Article {
  id: string;
  organization_id: string;
  product_id: string | null;
  keyword_id: string | null;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  seo_score: number | null;
  word_count: number;
  reading_time_minutes: number;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  canonical_url: string | null;
  schema_type: string | null;
  schema_data: Record<string, unknown> | null;
  published_at: string | null;
  scheduled_at: string | null;
  author_id: string | null;
  tags: string[];
  category: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface GeneratedArticleData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

interface ArticleEditorProps {
  article?: Article;
  organizationId: string;
  userId?: string;
  brandSettings?: import('@/types/brand-settings').BrandSettings | null;
  siteUrl?: string;
  siteName?: string;
  onSave?: (article: Partial<Article>) => Promise<void>;
  onPublish?: (articleId: string) => Promise<void>;
  onUnpublish?: (articleId: string) => Promise<void>;
  isNew?: boolean;
  generatedArticle?: GeneratedArticleData | null;
}

export function ArticleEditor({
  article,
  organizationId,
  userId,
  brandSettings,
  siteUrl = 'https://example.com',
  siteName = 'My Blog',
  onSave,
  onPublish,
  onUnpublish,
  isNew = false,
  generatedArticle,
}: ArticleEditorProps) {
  const router = useRouter();
  const params = useParams();
  const articleId = params?.id as string | undefined;

  // Form state - prioritize generated article, then existing article, then empty
  const [title, setTitle] = useState(
    generatedArticle?.title || article?.title || ''
  );
  const [slug, setSlug] = useState(
    generatedArticle?.slug || article?.slug || ''
  );
  const [content, setContent] = useState(
    generatedArticle?.content || article?.content || ''
  );
  const [excerpt, setExcerpt] = useState(
    generatedArticle?.excerpt || article?.excerpt || ''
  );
  const [featuredImageUrl, setFeaturedImageUrl] = useState(
    article?.featured_image_url || ''
  );
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    article?.status || 'draft'
  );
  const [category, setCategory] = useState(article?.category || '');
  const [tags, setTags] = useState<string[]>(article?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [metaTitle, setMetaTitle] = useState(
    generatedArticle?.metaTitle || article?.meta_title || ''
  );
  const [metaDescription, setMetaDescription] = useState(
    generatedArticle?.metaDescription || article?.meta_description || ''
  );
  const [metaKeywords, setMetaKeywords] = useState(
    generatedArticle?.metaKeywords?.join(', ') ||
      article?.meta_keywords?.join(', ') ||
      ''
  );
  const [canonicalUrl, setCanonicalUrl] = useState(
    article?.canonical_url || ''
  );

  // UI state
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [wordCount, setWordCount] = useState(article?.word_count || 0);
  const [characterCount, setCharacterCount] = useState(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSEOSidebar, setShowSEOSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showImageGeneration, setShowImageGeneration] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Refs for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef(false);

  // Calculate readability metrics
  const readabilityScore = content
    ? calculateReadabilityScore(content)
    : { score: 0, level: 'N/A', description: 'No content' };
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Auto-save with debouncing
  const debouncedSave = useCallback(async () => {
    if (!autoSaveEnabled || !hasUnsavedChangesRef.current) return;

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const updatedArticle = {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        featured_image_url: featuredImageUrl || null,
        status,
        category: category || null,
        tags,
        word_count: wordCount,
        reading_time_minutes: readingTime,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        meta_keywords: metaKeywords
          ? metaKeywords
              .split(',')
              .map((k) => k.trim())
              .filter((k) => k)
          : [],
        canonical_url: canonicalUrl || null,
      };

      if (onSave) {
        await onSave(updatedArticle);
      }

      setSaveStatus('saved');
      hasUnsavedChangesRef.current = false;

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save'
      );
    }
  }, [
    title,
    slug,
    content,
    excerpt,
    featuredImageUrl,
    status,
    category,
    tags,
    wordCount,
    readingTime,
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    autoSaveEnabled,
    onSave,
  ]);

  // Handle content changes from Tiptap editor
  const handleContentChange = useCallback(
    (newContent: string, words: number, chars: number) => {
      setContent(newContent);
      setWordCount(words);
      setCharacterCount(chars);
      hasUnsavedChangesRef.current = true;

      // Clear existing timeout and set new one
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Auto-save after 30 seconds of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave();
      }, 30000);
    },
    [debouncedSave]
  );

  // Manual save
  const handleSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await debouncedSave();
  }, [debouncedSave]);

  // Generate slug from title
  const generateSlug = useCallback((titleValue: string) => {
    return titleValue
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 500);
  }, []);

  // Handle title change with slug generation
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      hasUnsavedChangesRef.current = true;

      // Auto-generate slug if it hasn't been manually edited
      if (!slug || slug === generateSlug(article?.title || '')) {
        setSlug(generateSlug(newTitle));
      }

      // Update meta title if not set
      if (!metaTitle) {
        setMetaTitle(newTitle);
      }
    },
    [slug, article?.title, metaTitle, generateSlug]
  );

  // Add tag
  const addTag = useCallback(() => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      hasUnsavedChangesRef.current = true;
    }
    setTagInput('');
  }, [tagInput, tags]);

  // Remove tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter((t) => t !== tagToRemove));
      hasUnsavedChangesRef.current = true;
    },
    [tags]
  );

  // Handle publish/unpublish
  const handlePublish = useCallback(async () => {
    if (!article?.id && onPublish) {
      // Save first, then publish
      await handleSave();
      // TODO: Need to get the new article ID
      return;
    }

    if (article?.id && onPublish) {
      setSaveStatus('saving');
      try {
        await onPublish(article.id);
        setStatus('published');
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to publish'
        );
      }
    }
  }, [article?.id, onPublish, handleSave]);

  const handleUnpublish = useCallback(async () => {
    if (article?.id && onUnpublish) {
      setSaveStatus('saving');
      try {
        await onUnpublish(article.id);
        setStatus('draft');
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to unpublish'
        );
      }
    }
  }, [article?.id, onUnpublish]);

  // Handle image selection from AI generation dialog
  const handleSelectImage = useCallback(
    (imageUrl: string, imageData?: ImageGenerationResponse) => {
      setFeaturedImageUrl(imageUrl);
      hasUnsavedChangesRef.current = true;
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isNew ? 'New Article' : 'Edit Article'}
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-full',
                status === 'published' &&
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                status === 'draft' &&
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                status === 'archived' &&
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errorMessage || 'Error'}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>

          {status === 'draft' ? (
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Publish
            </button>
          ) : (
            <button
              onClick={handleUnpublish}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Unpublish
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          <button
            onClick={() => setShowVersionHistory(true)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            title="Version History"
          >
            <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              showSettings && 'bg-gray-100 dark:bg-gray-700'
            )}
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={() => setShowSEOSidebar(!showSEOSidebar)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              showSEOSidebar &&
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
            )}
          >
            <Search className="w-4 h-4" />
            SEO
          </button>
        </div>
      </div>

      {/* Auto-save indicator */}
      {autoSaveEnabled && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
            <Clock className="w-4 h-4" />
            <span>
              Auto-save is enabled. Changes are saved automatically after 30
              seconds.
            </span>
          </div>
          <button
            onClick={() => setAutoSaveEnabled(false)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Disable
          </button>
        </div>
      )}

      <div
        className={cn(
          'grid gap-6',
          showSEOSidebar ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        )}
      >
        {/* Main Editor */}
        <div
          className={cn(
            'space-y-4',
            showSEOSidebar ? 'lg:col-span-2' : 'lg:col-span-1'
          )}
        >
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Article title..."
            className="w-full px-4 py-3 text-2xl font-bold bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400"
          />

          {/* Slug Input */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/articles/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                hasUnsavedChangesRef.current = true;
              }}
              placeholder="article-slug"
              className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Tiptap Editor */}
          <TiptapEditor
            initialContent={content}
            placeholder="Start writing your article content here..."
            onUpdate={handleContentChange}
            height="400px"
          />

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Excerpt (Optional)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                hasUnsavedChangesRef.current = true;
              }}
              placeholder="Brief summary of the article..."
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metrics Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Content Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Words
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {wordCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Characters
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {characterCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Reading time
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {readingTime} min
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Readability
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {readabilityScore.level}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Flesch Score</span>
                    <span>{Math.round(readabilityScore.score)}/100</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${readabilityScore.score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Featured Image
              </h3>
              {userId && (
                <button
                  onClick={() => setShowImageGeneration(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Generate with AI
                </button>
              )}
            </div>
            <input
              type="url"
              value={featuredImageUrl}
              onChange={(e) => {
                setFeaturedImageUrl(e.target.value);
                hasUnsavedChangesRef.current = true;
              }}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
            />
            {featuredImageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredImageUrl}
                  alt="Featured"
                  className="w-full h-32 object-cover"
                  onError={() => setFeaturedImageUrl('')}
                />
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                hasUnsavedChangesRef.current = true;
              }}
              placeholder="e.g., Technology, Marketing..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* SEO Sidebar - Real-time scoring */}
        {showSEOSidebar && (
          <div className="space-y-4">
            <SEOSidebar
              title={title}
              content={content}
              excerpt={excerpt}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              metaKeywords={metaKeywords}
              slug={slug}
              featuredImageUrl={featuredImageUrl}
              wordCount={wordCount}
            />
          </div>
        )}
      </div>

      {/* SEO Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            SEO Settings
          </h3>

          <div className="space-y-4">
            {/* Meta Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  setMetaTitle(e.target.value);
                  hasUnsavedChangesRef.current = true;
                }}
                placeholder="SEO-optimized title (50-60 characters)"
                maxLength={200}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                {metaTitle.length}/200 characters
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meta Description
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => {
                  setMetaDescription(e.target.value);
                  hasUnsavedChangesRef.current = true;
                }}
                placeholder="Brief description for search results (150-160 characters)"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                {metaDescription.length}/500 characters
              </p>
            </div>

            {/* Meta Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meta Keywords
              </label>
              <input
                type="text"
                value={metaKeywords}
                onChange={(e) => {
                  setMetaKeywords(e.target.value);
                  hasUnsavedChangesRef.current = true;
                }}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Comma-separated keywords
              </p>
            </div>

            {/* Canonical URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Canonical URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => {
                    setCanonicalUrl(e.target.value);
                    hasUnsavedChangesRef.current = true;
                  }}
                  placeholder="https://example.com/original-article"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
                />
                {canonicalUrl && (
                  <a
                    href={canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <ArticlePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        article={{
          title,
          slug,
          content,
          excerpt,
          featuredImageUrl: featuredImageUrl || null,
          metaTitle,
          metaDescription,
          author: userId ? undefined : article?.author_id || undefined,
          publishedAt: article?.published_at,
          tags,
          category,
          readingTime,
        }}
        siteUrl={siteUrl}
        siteName={siteName}
      />

      {/* Image Generation Dialog */}
      {userId && (
        <ImageGenerationDialog
          isOpen={showImageGeneration}
          onClose={() => setShowImageGeneration(false)}
          onSelectImage={handleSelectImage}
          organizationId={organizationId}
          userId={userId}
          brandSettings={brandSettings}
        />
      )}

      {/* Version History Modal */}
      {article && (
        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          articleId={article.id}
          userId={userId}
          userRole={userId ? 'owner' : undefined}
          onReverted={async () => {
            // Refresh the article data after revert
            if (onSave) {
              // Trigger a refresh by calling save which will update the article
              await handleSave();
            }
          }}
        />
      )}
    </div>
  );
}

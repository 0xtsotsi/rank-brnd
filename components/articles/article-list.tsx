'use client';

/**
 * Article List Component
 *
 * Displays a list of articles with filtering, search, and actions.
 */

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BulkPublishButton } from '@/components/articles/bulk-publish-modal';
import type { BulkPublishResult } from '@/components/articles/bulk-publish-modal';
import {
  useArticles,
  useDeleteArticle,
  type Article,
} from '@/lib/hooks/use-articles';

interface CMSIntegration {
  id: string;
  platform: string;
  name: string;
  status: string;
}

interface ArticleListProps {
  organizationId: string;
  status?: string;
  search?: string;
  category?: string;
  integrations?: CMSIntegration[];
}

export function ArticleList({
  organizationId,
  status: initialStatus,
  search: initialSearch,
  category: initialCategory,
  integrations = [],
}: ArticleListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || 'all');
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory || 'all'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
    new Set()
  );
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch articles with React Query
  const { data, isLoading, error, refetch } = useArticles({
    organization_id: organizationId,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    search: searchTerm || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
  });

  const articles = data?.articles || [];
  const categories = data?.categories || [];

  // Delete article mutation
  const deleteArticle = useDeleteArticle();

  // Handle select all toggle
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(articles.map((a) => a.id)));
    }
    setSelectAll(!selectAll);
  }, [selectAll, articles]);

  // Handle bulk publish completion
  const handlePublishComplete = useCallback(
    (result: BulkPublishResult) => {
      // Clear selection after successful publish
      if (result.successful > 0) {
        setSelectedArticles(new Set());
        setSelectAll(false);
        // Refresh articles to show updated status
        refetch();
      }
    },
    [refetch]
  );

  async function handleDelete(articleId: string) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      await deleteArticle.mutateAsync(articleId);
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  }

  const statusCounts = {
    all: articles.length,
    draft: articles.filter((a) => a.status === 'draft').length,
    published: articles.filter((a) => a.status === 'published').length,
    archived: articles.filter((a) => a.status === 'archived').length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search articles..."
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-4 py-2 rounded-lg border transition-colors flex items-center gap-2',
              showFilters
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                showFilters && 'rotate-180'
              )}
            />
          </button>

          {/* New Article Button */}
          <button
            onClick={() => router.push('/dashboard/articles/new')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Article
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedArticles.size > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedArticles.size} article
                {selectedArticles.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <BulkPublishButton
              selectedArticles={selectedArticles}
              articles={articles}
              integrations={integrations}
              organizationId={organizationId}
              onPublishComplete={handlePublishComplete}
            />
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'draft', 'published', 'archived'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg capitalize transition-colors',
                    selectedStatus === s
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {s} ({statusCounts[s]})
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Articles List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No articles found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm ||
            selectedStatus !== 'all' ||
            selectedCategory !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Get started by creating your first article'}
          </p>
          <button
            onClick={() => router.push('/dashboard/articles/new')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Article
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            <div className="col-span-5 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectAll && selectedArticles.size === articles.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                ref={(el) => {
                  if (el && selectedArticles.size > 0 && !selectAll) {
                    el.indeterminate = true;
                  } else if (el) {
                    el.indeterminate = false;
                  }
                }}
              />
              Article
            </div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1"></div>
          </div>

          {/* Article Items */}
          {articles.map((article) => (
            <div
              key={article.id}
              className="group relative p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Article Info */}
                <div className="col-span-1 sm:col-span-5">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedArticles.has(article.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedArticles);
                        if (e.target.checked) {
                          newSelected.add(article.id);
                        } else {
                          newSelected.delete(article.id);
                        }
                        setSelectedArticles(newSelected);
                      }}
                      className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{article.word_count} words</span>
                        <span>•</span>
                        <span>{article.reading_time_minutes} min read</span>
                        {article.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{article.tags.slice(0, 2).join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1 sm:col-span-2">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full capitalize',
                      article.status === 'published' &&
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                      article.status === 'draft' &&
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                      article.status === 'archived' &&
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    )}
                  >
                    {article.status}
                  </span>
                </div>

                {/* Category */}
                <div className="col-span-1 sm:col-span-2">
                  {article.category ? (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {article.category}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>

                {/* Updated Date */}
                <div className="col-span-1 sm:col-span-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(article.updated_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button
                    onClick={() =>
                      router.push(`/dashboard/articles/${article.id}`)
                    }
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuOpen(
                          actionMenuOpen === article.id ? null : article.id
                        )
                      }
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Action Menu */}
                    {actionMenuOpen === article.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActionMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                          <button
                            onClick={() => {
                              router.push(`/dashboard/articles/${article.id}`);
                              setActionMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => {
                              router.push(`/dashboard/articles/${article.id}`);
                              setActionMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(article.id);
                              setActionMenuOpen(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * Article Version History Modal Component
 *
 * Shows version history for an article with:
 * - List of all versions with metadata
 * - Version comparison view
 * - Revert to previous version functionality
 */

import { useState, useEffect } from 'react';
import {
  X,
  History,
  ArrowLeft,
  ArrowRight,
  GitCompare,
  GitCompareArrows,
  RotateCcw,
  Eye,
  Trash2,
  User,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
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
  tags: string[];
  category: string | null;
  metadata: Record<string, unknown> | null;
  changed_at: string;
  changed_by: string | null;
  change_notes: string | null;
  is_auto_save: boolean;
}

export interface VersionComparison {
  version1: {
    version_number: number;
    title: string;
    changed_at: string;
    changed_by: string | null;
  };
  version2: {
    version_number: number;
    title: string;
    changed_at: string;
    changed_by: string | null;
  };
  differences: Array<{
    field: string;
    label: string;
    value1: string | null;
    value2: string | null;
    is_different: boolean;
  }>;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  userId?: string;
  userRole?: 'owner' | 'admin' | 'member';
  onReverted?: () => void;
}

type ViewMode = 'list' | 'compare' | 'preview';

export function VersionHistoryModal({
  isOpen,
  onClose,
  articleId,
  userId,
  userRole = 'member',
  onReverted,
}: VersionHistoryModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [previewVersion, setPreviewVersion] = useState<ArticleVersion | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Can only revert if owner or admin
  const canRevert = userRole === 'owner' || userRole === 'admin';

  // Fetch versions when modal opens
  useEffect(() => {
    if (isOpen && articleId) {
      fetchVersions();
    }
  }, [isOpen, articleId]);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/articles/${articleId}/versions?limit=50&include_auto_saves=true`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  };

  const selectVersion = (versionNumber: number) => {
    if (selectedVersions.includes(versionNumber)) {
      setSelectedVersions(selectedVersions.filter((v) => v !== versionNumber));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionNumber]);
    }
  };

  const compareVersions = async (v1: number, v2: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/articles/${articleId}/versions/compare?version1=${v1}&version2=${v2}`
      );
      if (!response.ok) {
        throw new Error('Failed to compare versions');
      }
      const data = await response.json();
      setComparison(data);
      setViewMode('compare');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to compare versions'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      compareVersions(selectedVersions[0], selectedVersions[1]);
    }
  };

  const previewVersionData = (version: ArticleVersion) => {
    setPreviewVersion(version);
    setViewMode('preview');
  };

  const handleRevert = async (versionNumber: number) => {
    if (!canRevert) return;
    if (
      !confirm(
        `Are you sure you want to revert to version ${versionNumber}? This will create a new version with the reverted content.`
      )
    ) {
      return;
    }

    setReverting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(
        `/api/articles/${articleId}/versions/revert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version_number: versionNumber }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revert');
      }
      setSuccessMessage(`Successfully reverted to version ${versionNumber}`);
      await fetchVersions(); // Refresh the list
      if (onReverted) {
        onReverted();
      }
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert');
    } finally {
      setReverting(false);
    }
  };

  const handleCleanup = async () => {
    if (!canRevert) return;
    if (
      !confirm(
        'This will delete old auto-save versions, keeping only the 5 most recent. Continue?'
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/articles/${articleId}/versions/cleanup`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keep_auto_saves: 5 }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cleanup');
      }
      const data = await response.json();
      setSuccessMessage(data.message);
      await fetchVersions();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Version History
            </h2>
            {versions.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({versions.length} versions)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-300">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading && !comparison ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedVersions.length === 2 && (
                    <button
                      onClick={handleCompare}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <GitCompare className="w-4 h-4" />
                      Compare Selected
                    </button>
                  )}
                </div>
                {canRevert && versions.some((v) => v.is_auto_save) && (
                  <button
                    onClick={handleCleanup}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cleanup Auto-saves
                  </button>
                )}
              </div>

              {/* Version List */}
              {versions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No versions yet. Versions are created automatically when you
                    save.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={cn(
                        'p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors',
                        selectedVersions.includes(version.version_number) &&
                          'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700',
                        version.is_auto_save && 'opacity-75'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Checkbox for comparison */}
                          <input
                            type="checkbox"
                            checked={selectedVersions.includes(
                              version.version_number
                            )}
                            onChange={() =>
                              selectVersion(version.version_number)
                            }
                            disabled={
                              selectedVersions.length >= 2 &&
                              !selectedVersions.includes(version.version_number)
                            }
                            className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />

                          {/* Version Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">
                                v{version.version_number}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 text-xs font-medium rounded-full',
                                  version.status === 'published' &&
                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                                  version.status === 'draft' &&
                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                                  version.status === 'archived' &&
                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                )}
                              >
                                {version.status}
                              </span>
                              {version.is_auto_save && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  Auto-save
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {version.title}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(
                                  new Date(version.changed_at),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {version.word_count} words
                              </span>
                              {version.changed_by && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {version.changed_by}
                                </span>
                              )}
                            </div>
                            {version.change_notes && (
                              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                                "{version.change_notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => previewVersionData(version)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Preview version"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canRevert && (
                            <button
                              onClick={() =>
                                handleRevert(version.version_number)
                              }
                              disabled={reverting}
                              className="p-2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-50"
                              title="Revert to this version"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : viewMode === 'compare' && comparison ? (
            <div className="space-y-4">
              {/* Header with back button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setComparison(null);
                    setSelectedVersions([]);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to list
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg font-medium">
                    v{comparison.version1.version_number}
                  </span>
                  <GitCompareArrows className="w-4 h-4 text-gray-400" />
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg font-medium">
                    v{comparison.version2.version_number}
                  </span>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Field
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        v{comparison.version1.version_number}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        v{comparison.version2.version_number}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {comparison.differences.map((diff) => (
                      <tr
                        key={diff.field}
                        className={cn(
                          diff.is_different &&
                            'bg-yellow-50 dark:bg-yellow-900/10'
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {diff.label}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          <div
                            className="truncate"
                            title={diff.value1 || undefined}
                          >
                            {diff.value1 || (
                              <span className="italic text-gray-400">
                                empty
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          <div
                            className="truncate"
                            title={diff.value2 || undefined}
                          >
                            {diff.value2 || (
                              <span className="italic text-gray-400">
                                empty
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded" />
                  <span>Indicates changed field</span>
                </div>
              </div>
            </div>
          ) : viewMode === 'preview' && previewVersion ? (
            <div className="space-y-4">
              {/* Header with back button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setPreviewVersion(null);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to list
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-lg font-medium">
                    Version {previewVersion.version_number}
                  </span>
                  {previewVersion.is_auto_save && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      Auto-save
                    </span>
                  )}
                </div>
              </div>

              {/* Version Preview */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {previewVersion.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    /articles/{previewVersion.slug}
                  </p>
                </div>

                {previewVersion.excerpt && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {previewVersion.excerpt}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Preview
                  </h4>
                  <div
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-64 overflow-auto prose dark:prose-invert prose-sm"
                    dangerouslySetInnerHTML={{
                      __html:
                        previewVersion.content.substring(0, 1000) +
                        (previewVersion.content.length > 1000 ? '...' : ''),
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Word Count:
                    </span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {previewVersion.word_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Reading Time:
                    </span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {previewVersion.reading_time_minutes} min
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      SEO Score:
                    </span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {previewVersion.seo_score || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Status:
                    </span>{' '}
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {previewVersion.status}
                    </span>
                  </div>
                </div>

                {previewVersion.tags && previewVersion.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {previewVersion.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {canRevert && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() =>
                        handleRevert(previewVersion.version_number)
                      }
                      disabled={reverting}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {reverting ? 'Reverting...' : 'Revert to This Version'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

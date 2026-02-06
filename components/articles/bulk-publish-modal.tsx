'use client';

/**
 * Bulk Publish Modal Component
 *
 * Modal for selecting multiple articles and publishing them to CMS platforms
 * with progress tracking.
 */

import { useState, useCallback } from 'react';
import {
  Send,
  Calendar,
  Settings,
  Check,
  Loader2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { PublishingPlatform } from '@/types/publishing-queue';
import {
  PUBLISHING_PLATFORM_LABELS,
  PUBLISHING_PLATFORM_COLORS,
} from '@/types/publishing-queue';

export interface Article {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
}

export interface CMSIntegration {
  id: string;
  platform: PublishingPlatform | string;
  name: string;
  status: 'active' | 'inactive' | string;
}

interface BulkPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  integrations: CMSIntegration[];
  organizationId: string;
  onSuccess?: (results: BulkPublishResult) => void;
}

export interface BulkPublishResult {
  successful: number;
  failed: number;
  total: number;
  queueItemIds: string[];
  message: string;
}

type PublishStep = 'select' | 'schedule' | 'publishing' | 'complete';

export function BulkPublishModal({
  isOpen,
  onClose,
  articles,
  integrations,
  organizationId,
  onSuccess,
}: BulkPublishModalProps) {
  const [step, setStep] = useState<PublishStep>('select');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    integrations.find((i) => i.status === 'active')?.id || null
  );
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const [priority, setPriority] = useState<number>(5);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState({
    current: 0,
    total: articles.length,
  });
  const [publishResult, setPublishResult] = useState<BulkPublishResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Filter active integrations
  const activeIntegrations = integrations.filter((i) => i.status === 'active');

  // Reset state when modal opens
  const resetState = useCallback(() => {
    setStep('select');
    setSelectedIntegration(activeIntegrations[0]?.id || null);
    setScheduledFor('');
    setPriority(5);
    setIsPublishing(false);
    setPublishProgress({ current: 0, total: articles.length });
    setPublishResult(null);
    setError(null);
  }, [articles.length, activeIntegrations]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (!isPublishing) {
      resetState();
      onClose();
    }
  }, [isPublishing, resetState, onClose]);

  // Handle publish action
  const handlePublish = useCallback(async () => {
    if (articles.length === 0) {
      setError('No articles selected for publishing');
      return;
    }

    setIsPublishing(true);
    setStep('publishing');
    setError(null);

    try {
      const requestBody: {
        article_ids: string[];
        integration_id?: string;
        platform?: PublishingPlatform;
        scheduled_for?: string;
        priority: number;
      } = {
        article_ids: articles.map((a) => a.id),
        priority,
      };

      if (selectedIntegration) {
        requestBody.integration_id = selectedIntegration;
      }

      if (scheduledFor) {
        requestBody.scheduled_for = new Date(scheduledFor).toISOString();
      }

      // Simulate progress for better UX (in real scenario, use SSE or polling)
      const progressInterval = setInterval(() => {
        setPublishProgress((prev) => {
          if (prev.current >= prev.total - 1) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, current: prev.current + 1 };
        });
      }, 300);

      const response = await fetch('/api/articles/publish/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      clearInterval(progressInterval);
      setPublishProgress({ current: articles.length, total: articles.length });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to publish articles');
      }

      const result: BulkPublishResult = await response.json();
      setPublishResult(result);
      setStep('complete');
      onSuccess?.(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to publish articles'
      );
      setStep('select');
    } finally {
      setIsPublishing(false);
    }
  }, [articles, selectedIntegration, scheduledFor, priority, onSuccess]);

  // Get min date for scheduling (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  };

  const renderContent = () => {
    switch (step) {
      case 'select':
      case 'schedule':
        return (
          <div className="space-y-6">
            {/* Articles Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Articles to Publish ({articles.length})
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="truncate">{article.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform/Integration Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  CMS Platform
                </div>
              </label>
              {activeIntegrations.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {activeIntegrations.map((integration) => {
                    const platformInfo = PUBLISHING_PLATFORM_COLORS[
                      integration.platform as PublishingPlatform
                    ] || {
                      bg: 'bg-gray-100 dark:bg-gray-700',
                      text: 'text-gray-700 dark:text-gray-300',
                      icon: integration.platform
                        .toString()
                        .charAt(0)
                        .toUpperCase(),
                    };
                    const isSelected = selectedIntegration === integration.id;
                    return (
                      <button
                        key={integration.id}
                        type="button"
                        onClick={() => setSelectedIntegration(integration.id)}
                        className={cn(
                          'p-3 rounded-lg border-2 text-left transition-all',
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center text-xs font-medium',
                              platformInfo.bg,
                              platformInfo.text
                            )}
                          >
                            {platformInfo.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {integration.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {PUBLISHING_PLATFORM_LABELS[
                                integration.platform as PublishingPlatform
                              ] || integration.platform}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                        No active integrations
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        Please connect a CMS platform integration first to
                        publish articles.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scheduling */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule (Optional)
                </div>
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!scheduledFor}
                    onChange={() => setScheduledFor('')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Publish now
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!!scheduledFor}
                    onChange={() => setScheduledFor(getMinDate())}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Schedule for later
                  </span>
                </label>
              </div>
              {scheduledFor && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={getMinDate()}
                  className="mt-3 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Priority
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    value: 0,
                    label: 'Low',
                    color:
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                  },
                  {
                    value: 5,
                    label: 'Normal',
                    color:
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                  },
                  {
                    value: 10,
                    label: 'High',
                    color:
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                  },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      priority === p.value
                        ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800 ' +
                            p.color
                        : p.color
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'publishing':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Publishing Articles...
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {scheduledFor
                ? 'Scheduling articles for publishing'
                : 'Publishing articles to CMS'}
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>
                  {publishProgress.current} / {publishProgress.total}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{
                    width: `${(publishProgress.current / publishProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {scheduledFor
                ? 'Articles Scheduled!'
                : 'Articles Queued for Publishing!'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {publishResult?.message ||
                `${articles.length} articles have been added to the publishing queue.`}
            </p>
            {publishResult && (
              <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
                    {publishResult.successful}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Successful
                  </p>
                </div>
                {publishResult.failed > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
                      {publishResult.failed}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-500">
                      Failed
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'publishing'
          ? ''
          : step === 'complete'
            ? ''
            : 'Bulk Publish Articles'
      }
      size="lg"
      showCloseButton={!isPublishing && step !== 'complete'}
      footer={
        step === 'select' || step === 'schedule' ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPublishing}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <Button
              onClick={handlePublish}
              disabled={
                !selectedIntegration || articles.length === 0 || isPublishing
              }
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {scheduledFor ? 'Schedule Publish' : 'Publish Now'}
            </Button>
          </div>
        ) : step === 'complete' ? (
          <div className="flex justify-end w-full">
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </Modal>
  );
}

/**
 * Bulk Publish Button for triggering the modal
 */
interface BulkPublishButtonProps {
  selectedArticles: Set<string>;
  articles: Article[];
  integrations: CMSIntegration[];
  organizationId: string;
  onPublishComplete?: (results: BulkPublishResult) => void;
}

export function BulkPublishButton({
  selectedArticles,
  articles,
  integrations,
  organizationId,
  onPublishComplete,
}: BulkPublishButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedArticlesList = articles.filter((a) =>
    selectedArticles.has(a.id)
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={selectedArticles.size === 0}
        className={cn(
          'px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2',
          selectedArticles.size > 0
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
        )}
      >
        <Send className="w-4 h-4" />
        Publish {selectedArticles.size > 0 && `(${selectedArticles.size})`}
      </button>

      <BulkPublishModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        articles={selectedArticlesList}
        integrations={integrations}
        organizationId={organizationId}
        onSuccess={onPublishComplete}
      />
    </>
  );
}

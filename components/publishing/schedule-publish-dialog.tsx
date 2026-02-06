'use client';

/**
 * Schedule Publish Dialog Component
 *
 * Dialog for scheduling articles to be published to CMS platforms
 */

import { useState, useEffect } from 'react';
import type { PublishingPlatform } from '@/types/publishing-queue';
import { PUBLISHING_PLATFORM_LABELS } from '@/types/publishing-queue';
import { cn } from '@/lib/utils';
import { X, Calendar, Clock, Send } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface Integration {
  id: string;
  name: string;
  platform: PublishingPlatform;
  status: string;
}

interface SchedulePublishDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SchedulePublishDialog({
  open,
  onClose,
  onSuccess,
}: SchedulePublishDialogProps) {
  const [step, setStep] = useState<
    'article' | 'platform' | 'schedule' | 'confirm'
  >('article');
  const [articles, setArticles] = useState<Article[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch articles and integrations when dialog opens
  useEffect(() => {
    if (open) {
      fetchData();
      // Reset state
      setStep('article');
      setSelectedArticle(null);
      setSelectedPlatform(null);
      setScheduledFor('');
      setScheduledTime('');
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch articles
      const articlesResponse = await fetch(
        '/api/articles?limit=50&status=draft'
      );
      if (articlesResponse.ok) {
        const data = await articlesResponse.json();
        setArticles(data.articles || []);
      }

      // Fetch integrations (CMS platforms)
      const integrationsResponse = await fetch(
        '/api/integrations?status=active'
      );
      if (integrationsResponse.ok) {
        const data = await integrationsResponse.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedArticle || !selectedPlatform) return;

    setSubmitting(true);
    try {
      const scheduledDateTime = scheduledFor
        ? new Date(`${scheduledFor}T${scheduledTime || '12:00'}`)
        : new Date();

      const response = await fetch('/api/publishing-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: selectedArticle,
          integration_id: selectedPlatform,
          scheduled_for: scheduledDateTime.toISOString(),
          status: 'pending',
          priority: 5,
        }),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error scheduling publish:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      data-testid="schedule-publish-dialog"
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl',
          'animate-in fade-in-0 zoom-in-95'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Schedule Article Publish
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {['article', 'platform', 'schedule', 'confirm'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                  step === s
                    ? 'bg-indigo-600 text-white'
                    : index <
                        ['article', 'platform', 'schedule', 'confirm'].indexOf(
                          step
                        )
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}
              >
                {index <
                ['article', 'platform', 'schedule', 'confirm'].indexOf(step) ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    index <
                      ['article', 'platform', 'schedule', 'confirm'].indexOf(
                        step
                      )
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Step 1: Select Article */}
              {step === 'article' && (
                <div className="space-y-4" data-testid="step-article">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Select an article to publish
                  </h3>
                  {articles.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        No draft articles found. Create an article first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {articles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article.id)}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-colors',
                            selectedArticle === article.id
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                          data-testid={`article-${article.id}`}
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {article.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            /{article.slug}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Platform */}
              {step === 'platform' && (
                <div className="space-y-4" data-testid="step-platform">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Select a CMS platform
                  </h3>
                  {integrations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        No active CMS integrations found.
                      </p>
                      <button
                        onClick={() =>
                          (window.location.href = '/dashboard/integrations')
                        }
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Add an integration
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {integrations.map((integration) => (
                        <button
                          key={integration.id}
                          onClick={() => setSelectedPlatform(integration.id)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                            selectedPlatform === integration.id
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                          data-testid={`platform-${integration.id}`}
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-10 h-10 rounded-lg',
                              'bg-gray-100 dark:bg-gray-700',
                              'text-gray-700 dark:text-gray-300 font-semibold'
                            )}
                          >
                            {PUBLISHING_PLATFORM_LABELS[
                              integration.platform as PublishingPlatform
                            ].substring(0, 2)}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {integration.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {
                                PUBLISHING_PLATFORM_LABELS[
                                  integration.platform as PublishingPlatform
                                ]
                              }
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Schedule */}
              {step === 'schedule' && (
                <div className="space-y-4" data-testid="step-schedule">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    When should this be published?
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="schedule"
                          checked={!scheduledFor}
                          onChange={() => {
                            setScheduledFor('');
                            setScheduledTime('');
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Publish immediately
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name="schedule"
                          checked={!!scheduledFor}
                          onChange={() => {
                            if (!scheduledFor) {
                              setScheduledFor(today);
                              setScheduledTime('12:00');
                            }
                          }}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Schedule for later
                        </span>
                      </label>

                      {scheduledFor && (
                        <div className="ml-6 space-y-3 mt-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={scheduledFor}
                              onChange={(e) => setScheduledFor(e.target.value)}
                              min={today}
                              className={cn(
                                'w-full px-3 py-2 rounded-lg border',
                                'bg-white dark:bg-gray-700',
                                'text-gray-900 dark:text-white',
                                'border-gray-300 dark:border-gray-600',
                                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Time
                            </label>
                            <input
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className={cn(
                                'w-full px-3 py-2 rounded-lg border',
                                'bg-white dark:bg-gray-700',
                                'text-gray-900 dark:text-white',
                                'border-gray-300 dark:border-gray-600',
                                'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Confirm */}
              {step === 'confirm' && (
                <div className="space-y-4" data-testid="step-confirm">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Confirm publishing details
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">
                        Article
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {articles.find((a) => a.id === selectedArticle)?.title}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">
                        Platform
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {
                          integrations.find((i) => i.id === selectedPlatform)
                            ?.name
                        }
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">
                        Schedule
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {!scheduledFor
                          ? 'Immediately'
                          : `${new Date(scheduledFor).toLocaleDateString()} at ${scheduledTime}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={submitting}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'disabled:opacity-50'
            )}
          >
            Cancel
          </button>

          {step !== 'article' && (
            <button
              onClick={() => {
                const steps = ['article', 'platform', 'schedule', 'confirm'];
                const currentIndex = steps.indexOf(step);
                setStep(steps[currentIndex - 1] as any);
              }}
              disabled={submitting}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'disabled:opacity-50'
              )}
            >
              Back
            </button>
          )}

          <button
            onClick={() => {
              const steps = ['article', 'platform', 'schedule', 'confirm'];
              const currentIndex = steps.indexOf(step);

              if (step === 'confirm') {
                handleSubmit();
              } else if (currentIndex < steps.length - 1) {
                // Validate before moving forward
                if (step === 'article' && !selectedArticle) return;
                if (step === 'platform' && !selectedPlatform) return;

                setStep(steps[currentIndex + 1] as any);
              }
            }}
            disabled={
              submitting ||
              (step === 'article' && !selectedArticle) ||
              (step === 'platform' && !selectedPlatform)
            }
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              'bg-indigo-600 text-white',
              'hover:bg-indigo-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            )}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Scheduling...
              </>
            ) : step === 'confirm' ? (
              <>
                <Send className="h-4 w-4" />
                Schedule Publish
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

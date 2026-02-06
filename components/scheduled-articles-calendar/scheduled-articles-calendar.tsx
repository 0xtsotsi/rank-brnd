/**
 * Scheduled Articles Calendar Component
 *
 * Integrates the CalendarView with article scheduling API.
 * Displays scheduled articles and handles drag-drop rescheduling.
 *
 * @example
 * ```tsx
 * <ScheduledArticlesCalendar
 *   organizationId="org-123"
 *   productId="prod-456" // optional
 *   onArticleClick={(article) => console.log(article)}
 * />
 * ```
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { CalendarView } from '@/components/calendar/calendar-view';
import type { CalendarEvent } from '@/types/calendar';
import { scheduledArticlesToCalendarEvents } from '@/lib/calendar-utils';
import { useCalendarDragDrop } from '@/lib/hooks/use-calendar-drag-drop';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface ScheduledArticle {
  id: string;
  article_id: string;
  organization_id: string;
  product_id: string | null;
  title: string;
  slug: string;
  scheduled_at: string;
  published_at: string | null;
  status: 'draft' | 'published' | 'archived';
  schedule_status?:
    | 'pending'
    | 'scheduled'
    | 'publishing'
    | 'published'
    | 'failed'
    | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface ScheduledArticlesCalendarProps {
  organizationId: string;
  productId?: string;
  numberOfDays?: number;
  initialDate?: Date;
  onArticleClick?: (article: ScheduledArticle) => void;
  onDateChange?: (date: Date) => void;
  className?: string;
}

interface ScheduledArticlesResponse {
  schedules: ScheduledArticle[];
  total: number;
}

type LoadingState = 'idle' | 'loading' | 'refreshing' | 'error';

export function ScheduledArticlesCalendar({
  organizationId,
  productId,
  numberOfDays = 30,
  initialDate,
  onArticleClick,
  onDateChange,
  className,
}: ScheduledArticlesCalendarProps) {
  const [articles, setArticles] = useState<ScheduledArticle[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(
    initialDate || new Date()
  );

  // Calculate date range for fetching articles
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - 7); // Start a week before for context

    const end = new Date(currentDate);
    end.setDate(end.getDate() + numberOfDays + 30); // Get 30 extra days for future scheduling

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [currentDate, numberOfDays]);

  // Fetch scheduled articles
  const fetchArticles = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setLoadingState('refreshing');
      } else {
        setLoadingState('loading');
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          organization_id: organizationId,
          date_from: dateRange.start,
          date_to: dateRange.end,
          limit: '100',
        });

        if (productId) {
          params.append('product_id', productId);
        }

        const response = await fetch(`/api/schedule?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch scheduled articles');
        }

        const data = (await response.json()) as ScheduledArticlesResponse;
        setArticles(data.schedules || []);
        setLoadingState('idle');
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        setLoadingState('error');
      }
    },
    [organizationId, productId, dateRange]
  );

  // Initial fetch
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Convert articles to calendar events
  const calendarEvents = useMemo(() => {
    return scheduledArticlesToCalendarEvents(articles);
  }, [articles]);

  // Drag-drop hook for rescheduling
  const { rescheduleArticle, isRescheduling } = useCalendarDragDrop({
    organizationId,
    onSuccess: () => {
      // Refresh articles after successful reschedule
      fetchArticles(true);
    },
  });

  // Handle event drop (drag-drop rescheduling)
  const handleEventDrop = useCallback(
    async (eventId: string, newDate: Date) => {
      // Find the article to get its current scheduled date
      const article = articles.find(
        (a) => a.article_id === eventId || a.id === eventId
      );

      if (!article) {
        console.error('Article not found:', eventId);
        return;
      }

      const sourceDate = article.scheduled_at
        ? new Date(article.scheduled_at)
        : undefined;

      // Call the API to reschedule
      const result = await rescheduleArticle(eventId, newDate, sourceDate);

      if (!result.success) {
        // Error is handled by the hook with toast
        console.error('Failed to reschedule:', result.error);
      }
    },
    [articles, rescheduleArticle]
  );

  // Handle event click
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      const article = articles.find(
        (a) => a.article_id === event.id || a.id === event.id
      );
      if (article && onArticleClick) {
        onArticleClick(article);
      }
    },
    [articles, onArticleClick]
  );

  // Handle date change from calendar navigation
  const handleDateChange = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onDateChange?.(date);
    },
    [onDateChange]
  );

  // isLoading includes initial load or refresh, but not drag-drop operations
  const isLoading = loadingState === 'loading' || loadingState === 'refreshing';
  const showOverlay = loadingState === 'loading' || loadingState === 'error';

  return (
    <div className={cn('relative', className)}>
      {/* Loading Overlay for initial load */}
      {showOverlay && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          {loadingState === 'loading' ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading scheduled articles...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div className="text-center">
                <p className="font-medium text-gray-900 dark:text-white">
                  Failed to load articles
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {error}
                </p>
              </div>
              <button
                onClick={() => fetchArticles()}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={() => fetchArticles(true)}
          disabled={isLoading}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-50 dark:hover:bg-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Refresh articles"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          <span className="sr-only">Refresh</span>
        </button>
      </div>

      {/* Calendar View */}
      <div
        className={cn(
          isLoading && loadingState === 'refreshing' && 'opacity-50'
        )}
      >
        <CalendarView
          events={calendarEvents}
          initialDate={currentDate}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onDateChange={handleDateChange}
          numberOfDays={numberOfDays}
        />

        {/* Drag operation indicator */}
        {isRescheduling && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            Rescheduling...
          </div>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && articles.length === 0 && loadingState !== 'error' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              No scheduled articles
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Drag articles here or create a new schedule to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

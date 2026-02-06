/**
 * useCalendarDragDrop Hook
 *
 * Hook for handling drag-drop scheduling of articles in the calendar component.
 * Handles API calls, loading states, and error handling for drag-drop operations.
 */

'use client';

import { useCallback, useState } from 'react';

interface DragDropResult {
  success: boolean;
  data?: {
    id: string;
    article_id: string;
    scheduled_at: string;
    title: string;
  };
  message?: string;
  error?: string;
}

interface DragDropOptions {
  organizationId: string;
  onSuccess?: (data: DragDropResult['data']) => void;
  onError?: (error: string) => void;
}

interface UseCalendarDragDropReturn {
  rescheduleArticle: (
    articleId: string,
    newDate: Date,
    sourceDate?: Date
  ) => Promise<DragDropResult>;
  validateConflicts: (
    articleId: string,
    scheduledAt: string
  ) => Promise<{
    valid: boolean;
    hasConflicts: boolean;
    conflicts: Array<{
      type: string;
      message: string;
      article_id?: string;
      article_title?: string;
    }>;
  }>;
  isRescheduling: boolean;
  isValidating: boolean;
  error: string | null;
}

/**
 * Hook for drag-drop article scheduling
 */
export function useCalendarDragDrop(
  options: DragDropOptions
): UseCalendarDragDropReturn {
  const { organizationId, onSuccess, onError } = options;
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reschedule an article to a new date via drag-drop
   */
  const rescheduleArticle = useCallback(
    async (
      articleId: string,
      newDate: Date,
      sourceDate?: Date
    ): Promise<DragDropResult> => {
      setIsRescheduling(true);
      setError(null);

      try {
        // Validate date is in the future
        const now = new Date();
        if (newDate <= now) {
          const errorMsg = 'Scheduled date must be in the future';
          setError(errorMsg);
          onError?.(errorMsg);
          return { success: false, error: errorMsg };
        }

        // Format date to ISO string (set to noon local time to avoid timezone issues)
        const scheduledAt = new Date(newDate);
        scheduledAt.setHours(12, 0, 0, 0);

        const response = await fetch('/api/schedule/drag-drop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            article_id: articleId,
            scheduled_at: scheduledAt.toISOString(),
            organization_id: organizationId,
            source_date: sourceDate?.toISOString(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.error || 'Failed to reschedule article';
          setError(errorMsg);
          onError?.(errorMsg);
          return { success: false, error: errorMsg };
        }

        const result = (await response.json()) as DragDropResult;

        if (result.success) {
          onSuccess?.(result.data);
        }

        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMsg);
        onError?.(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsRescheduling(false);
      }
    },
    [organizationId, onSuccess, onError]
  );

  /**
   * Validate if scheduling an article would cause conflicts
   */
  const validateConflicts = useCallback(
    async (
      articleId: string,
      scheduledAt: string
    ): Promise<{
      valid: boolean;
      hasConflicts: boolean;
      conflicts: Array<{
        type: string;
        message: string;
        article_id?: string;
        article_title?: string;
      }>;
    }> => {
      setIsValidating(true);
      setError(null);

      try {
        const response = await fetch('/api/schedule/validate-conflicts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            article_id: articleId,
            scheduled_at: scheduledAt,
            organization_id: organizationId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to validate conflicts');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to validate conflicts';
        setError(errorMsg);
        return {
          valid: false,
          hasConflicts: true,
          conflicts: [{ type: 'validation_error', message: errorMsg }],
        };
      } finally {
        setIsValidating(false);
      }
    },
    [organizationId]
  );

  return {
    rescheduleArticle,
    validateConflicts,
    isRescheduling,
    isValidating,
    error,
  };
}

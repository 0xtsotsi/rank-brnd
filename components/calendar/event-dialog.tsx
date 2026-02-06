'use client';

/**
 * Event Dialog Component
 * Modal dialog for viewing and editing calendar events
 */

import { useState } from 'react';
import type { CalendarEvent, EventStatus } from '@/types/calendar';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/calendar';
import { formatDate } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';
import { X, Calendar, Clock, Edit, Trash2 } from 'lucide-react';

interface EventDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

export function EventDialog({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: EventDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !event) return null;

  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.pending;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      setIsDeleting(true);
      onDelete?.(event.id);
      setIsDeleting(false);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-dialog-title"
      data-testid="event-dialog"
    >
      <div
        className={cn(
          'w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl transition-all',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between rounded-t-2xl px-6 py-4',
            colors.bg
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className={cn('h-5 w-5', colors.text)} />
            <h3
              id="event-dialog-title"
              className={cn('text-lg font-semibold', colors.text)}
            >
              Event Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'rounded-full p-1 transition-colors hover:bg-black/10',
              colors.text
            )}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
              {event.title}
            </h4>
            {event.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {event.description}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium colors">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                event.status === 'pending' && 'bg-yellow-400',
                event.status === 'in-progress' && 'bg-blue-400',
                event.status === 'completed' && 'bg-green-400',
                event.status === 'cancelled' && 'bg-gray-400',
                event.status === 'overdue' && 'bg-red-400'
              )}
            />
            <span
              className={cn(
                'border rounded-full px-2 py-0.5 text-sm',
                colors.bg,
                colors.text,
                colors.border
              )}
            >
              {STATUS_LABELS[event.status]}
            </span>
          </div>

          {/* Date Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(event.date, 'long')}</span>
          </div>

          {/* Duration */}
          {event.duration && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{event.duration} minutes</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
              'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(event)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                  'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                )}
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

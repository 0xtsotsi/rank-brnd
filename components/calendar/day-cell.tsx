'use client';

/**
 * Day Cell Component
 * Individual day cell in the calendar with drag-drop support
 */

import { useState } from 'react';
import type {
  DayCell as DayCellType,
  CalendarEvent,
  DragData,
} from '@/types/calendar';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/calendar';
import {
  formatDate,
  getDayOfWeek,
  sortEventsByPriority,
} from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';
import { GripVertical, Calendar, Clock } from 'lucide-react';

interface DayCellProps {
  cell: DayCellType;
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
  onEventDrop?: (eventId: string, newDate: Date) => void;
  onEventDragStart?: (event: CalendarEvent) => void;
  onEventDragEnd?: (event: CalendarEvent) => void;
  isDragOver?: boolean;
  maxDisplayEvents?: number; // Maximum events to show before showing "+X more"
}

export function DayCell({
  cell,
  onEventClick,
  onDayClick,
  onEventDrop,
  onEventDragStart,
  onEventDragEnd,
  isDragOver = false,
  maxDisplayEvents = 3,
}: DayCellProps) {
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const sortedEvents = sortEventsByPriority(cell.events);
  const displayEvents = sortedEvents.slice(0, maxDisplayEvents);
  const remainingEventsCount = Math.max(
    0,
    sortedEvents.length - maxDisplayEvents
  );

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEventId(event.id);
    onEventDragStart?.(event);

    const dragData: DragData = {
      eventId: event.id,
      sourceDate: cell.date,
      eventTitle: event.title,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (event: CalendarEvent) => {
    setDraggedEventId(null);
    onEventDragEnd?.(event);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      try {
        const dragData: DragData = JSON.parse(data);
        if (dragData.eventId && onEventDrop) {
          onEventDrop(dragData.eventId, cell.date);
        }
      } catch (error) {
        console.error('Failed to parse drag data:', error);
      }
    }
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation(); // Prevent triggering day click
    onEventClick?.(event);
  };

  const statusColors =
    STATUS_COLORS[cell.events[0]?.status] || STATUS_COLORS.pending;

  return (
    <div
      className={cn(
        'calendar-day-cell group relative min-h-[100px] rounded-lg border-2 p-2 transition-all duration-200',
        'bg-white dark:bg-gray-800',
        'hover:shadow-md',
        // Status-based border tint for today
        cell.isToday && 'border-indigo-300 dark:border-indigo-700 shadow-sm',
        !cell.isToday && 'border-gray-200 dark:border-gray-700',
        // Drag over state
        isDragOver &&
          'scale-[1.02] shadow-lg ring-2 ring-indigo-400 dark:ring-indigo-600',
        // Past days styling
        cell.isPast && 'bg-gray-50/50 dark:bg-gray-900/30',
        // Future days styling
        cell.isFuture && 'bg-white dark:bg-gray-800'
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => onDayClick?.(cell.date)}
      data-date={cell.date.toISOString()}
      data-testid="calendar-day-cell"
    >
      {/* Day Header */}
      <div className="mb-2 flex items-center justify-between">
        <div
          className={cn(
            'flex flex-col',
            cell.isToday
              ? 'text-indigo-600 dark:text-indigo-400'
              : cell.isPast
                ? 'text-gray-400 dark:text-gray-600'
                : 'text-gray-900 dark:text-gray-100'
          )}
        >
          <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            {getDayOfWeek(cell.date, true)}
          </span>
          <span
            className={cn(
              'text-lg font-bold',
              cell.isToday &&
                'flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white'
            )}
          >
            {cell.dayOfMonth}
          </span>
        </div>
        {cell.isToday && (
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Today
          </span>
        )}
      </div>

      {/* Events List */}
      <div className="space-y-1">
        {displayEvents.map((event) => {
          const colors = STATUS_COLORS[event.status] || STATUS_COLORS.pending;
          const isDragging = draggedEventId === event.id;

          return (
            <div
              key={event.id}
              draggable
              onDragStart={(e) => handleDragStart(e, event)}
              onDragEnd={() => handleDragEnd(event)}
              onClick={(e) => handleEventClick(e, event)}
              className={cn(
                'calendar-event group/event relative cursor-pointer rounded-md border px-2 py-1.5 text-xs transition-all duration-150',
                'hover:shadow-sm hover:scale-[1.02]',
                colors.bg,
                colors.border,
                colors.text,
                isDragging && 'opacity-50 scale-95',
                'tap-highlight-none'
              )}
              data-event-id={event.id}
              data-event-status={event.status}
              data-testid="calendar-event"
            >
              <div className="flex items-start gap-1.5">
                <GripVertical className="h-3 w-3 shrink-0 opacity-40 group-hover/event:opacity-100 transition-opacity" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title}</p>
                  {event.duration && (
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{event.duration}m</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status indicator dot */}
              <div
                className={cn(
                  'absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full',
                  event.status === 'pending' && 'bg-yellow-400',
                  event.status === 'in-progress' && 'bg-blue-400',
                  event.status === 'completed' && 'bg-green-400',
                  event.status === 'cancelled' && 'bg-gray-400',
                  event.status === 'overdue' && 'bg-red-400'
                )}
              />
            </div>
          );
        })}

        {/* More Events Indicator */}
        {remainingEventsCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDayClick?.(cell.date);
            }}
            className={cn(
              'w-full rounded-md px-2 py-1 text-xs font-medium text-center transition-colors',
              'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
              'tap-highlight-none'
            )}
          >
            +{remainingEventsCount} more
          </button>
        )}

        {/* Empty State / Drop Hint */}
        {cell.events.length === 0 && isDragOver && (
          <div className="flex h-16 items-center justify-center rounded-md border-2 border-dashed border-indigo-300 bg-indigo-50/50 text-xs text-indigo-600 dark:border-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
            Drop to schedule
          </div>
        )}
      </div>
    </div>
  );
}

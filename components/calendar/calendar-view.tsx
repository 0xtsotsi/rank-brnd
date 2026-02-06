'use client';

/**
 * Calendar View Component
 * Main 30-day calendar view with drag-drop scheduling capability
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  CalendarEvent,
  CalendarConfig,
  CalendarEventHandlers,
  EventStatus,
} from '@/types/calendar';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/calendar';
import {
  generateDayCells,
  getDefaultStartDate,
  formatDate,
} from '@/lib/calendar-utils';
import { DayCell } from './day-cell';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
} from 'lucide-react';

interface CalendarViewProps
  extends Partial<CalendarConfig>, CalendarEventHandlers {
  events?: CalendarEvent[];
  initialDate?: Date;
  className?: string;
  onDateChange?: (date: Date) => void;
  numberOfDays?: number;
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  showWeekends?: boolean;
}

const DEFAULT_CONFIG: Required<Omit<CalendarConfig, 'minDate' | 'maxDate'>> = {
  numberOfDays: 30,
  firstDayOfWeek: 0,
  showWeekends: true,
};

export function CalendarView({
  events = [],
  initialDate,
  onEventClick,
  onDayClick,
  onEventDrop,
  onEventDragStart,
  onEventDragEnd,
  onDateChange,
  numberOfDays = 30,
  firstDayOfWeek = 0,
  showWeekends = true,
  minDate,
  maxDate,
  className,
}: CalendarViewProps) {
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    numberOfDays,
    firstDayOfWeek,
    showWeekends,
  };
  const daysCount = mergedConfig.numberOfDays;

  // State management
  const [currentDate, setCurrentDate] = useState<Date>(
    initialDate || getDefaultStartDate()
  );
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  // Generate day cells for the calendar
  const dayCells = useMemo(() => {
    return generateDayCells(currentDate, daysCount, events);
  }, [currentDate, daysCount, events]);

  // Handle date navigation
  const navigateDate = useCallback(
    (direction: 'prev' | 'next') => {
      const daysToMove = direction === 'next' ? daysCount : -daysCount;
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + daysToMove);
      setCurrentDate(newDate);
      onDateChange?.(newDate);
    },
    [currentDate, daysCount, onDateChange]
  );

  // Handle today button
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);
  }, [onDateChange]);

  // Handle event drop
  const handleEventDrop = useCallback(
    (eventId: string, newDate: Date) => {
      onEventDrop?.(eventId, newDate);
      setDragOverDate(null);
    },
    [onEventDrop]
  );

  // Handle drag over state
  const handleDragEnter = useCallback((date: Date) => {
    setDragOverDate(date);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  // Filter events by status
  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  // Recalculate day cells with filtered events
  const filteredDayCells = useMemo(() => {
    return generateDayCells(currentDate, daysCount, filteredEvents);
  }, [currentDate, daysCount, filteredEvents]);

  // Calculate date range display
  const endDate = new Date(currentDate);
  endDate.setDate(endDate.getDate() + daysCount - 1);

  const dateRangeText = `${formatDate(currentDate, 'short')} - ${formatDate(endDate, 'short')}`;
  const yearText = currentDate.getFullYear();

  return (
    <div
      className={cn('calendar-view w-full space-y-4', className)}
      data-testid="calendar-view"
    >
      {/* Calendar Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Date Range Display */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {yearText}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dateRangeText}
            </p>
          </div>
        </div>

        {/* Navigation and Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as EventStatus | 'all')
              }
              className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none"
              data-testid="status-filter"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={() => navigateDate('prev')}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateDate('next')}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div
        className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400"
        role="list"
        aria-label="Event status legend"
      >
        {Object.entries(STATUS_LABELS).map(([status, label]) => {
          const colors = STATUS_COLORS[status as EventStatus];
          return (
            <div
              key={status}
              className="flex items-center gap-1.5"
              role="listitem"
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  status === 'pending' && 'bg-yellow-400',
                  status === 'in-progress' && 'bg-blue-400',
                  status === 'completed' && 'bg-green-400',
                  status === 'cancelled' && 'bg-gray-400',
                  status === 'overdue' && 'bg-red-400'
                )}
              />
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div
        className={cn(
          'calendar-grid gap-2',
          // Responsive grid: 7 cols on desktop, 1 col on mobile
          'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'
        )}
        role="grid"
        aria-label="Calendar days"
      >
        {filteredDayCells.map((cell) => (
          <DayCell
            key={cell.date.getTime()}
            cell={cell}
            onEventClick={onEventClick}
            onDayClick={onDayClick}
            onEventDrop={handleEventDrop}
            onEventDragStart={onEventDragStart}
            onEventDragEnd={onEventDragEnd}
            isDragOver={
              dragOverDate ? isSameDay(dragOverDate, cell.date) : false
            }
          />
        ))}
      </div>

      {/* Drag Hint */}
      <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          <span className="font-medium">Tip:</span> Drag events between days to
          reschedule
        </p>
      </div>
    </div>
  );
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

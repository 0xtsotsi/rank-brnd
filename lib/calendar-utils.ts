/**
 * Calendar Utility Functions
 * Helper functions for date manipulation and calendar generation
 */

import type { DayCell, CalendarEvent, CalendarConfig } from '@/types/calendar';

/**
 * Get the start of a day (midnight) for date comparison
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return startOfDay(date1).getTime() === startOfDay(date2).getTime();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return startOfDay(date).getTime() > startOfDay(new Date()).getTime();
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date,
  format: 'short' | 'long' | 'time' = 'short'
): string {
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric' } as const,
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    } as const,
    time: { hour: 'numeric', minute: '2-digit' } as const,
  };

  return date.toLocaleDateString('en-US', optionsMap[format]);
}

/**
 * Get the day of week name
 */
export function getDayOfWeek(date: Date, short: boolean = false): string {
  const options: Intl.DateTimeFormatOptions = short
    ? { weekday: 'short' }
    : { weekday: 'long' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Generate an array of day cells for the calendar view
 */
export function generateDayCells(
  startDate: Date,
  numberOfDays: number,
  events: CalendarEvent[]
): DayCell[] {
  const cells: DayCell[] = [];
  const today = new Date();
  const startOfStart = startOfDay(startDate);

  // Create a map of events by date for efficient lookup
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const eventDateKey = startOfDay(event.date).getTime().toString();
    if (!eventsByDate.has(eventDateKey)) {
      eventsByDate.set(eventDateKey, []);
    }
    eventsByDate.get(eventDateKey)!.push(event);
  }

  for (let i = 0; i < numberOfDays; i++) {
    const currentDate = addDays(startOfStart, i);
    const dateKey = currentDate.getTime().toString();

    cells.push({
      date: currentDate,
      dayOfMonth: currentDate.getDate(),
      isToday: isSameDay(currentDate, today),
      isPast: isPast(currentDate),
      isFuture: isFuture(currentDate),
      events: eventsByDate.get(dateKey) || [],
    });
  }

  return cells;
}

/**
 * Get the default start date for a 30-day calendar (today or first of month)
 */
export function getDefaultStartDate(): Date {
  const today = new Date();
  // Start from the first day of the current month
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

/**
 * Get week day headers based on firstDayOfWeek config
 */
export function getWeekDayHeaders(firstDayOfWeek: number = 0): string[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: string[] = [];

  for (let i = 0; i < 7; i++) {
    result.push(days[(firstDayOfWeek + i) % 7]);
  }

  return result;
}

/**
 * Filter events for a specific date range
 */
export function filterEventsByDateRange(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  return events.filter((event) => {
    const eventDate = startOfDay(event.date);
    return eventDate >= start && eventDate <= end;
  });
}

/**
 * Sort events by status priority (overdue > in-progress > pending > completed > cancelled)
 */
export function sortEventsByPriority(events: CalendarEvent[]): CalendarEvent[] {
  const statusPriority: Record<string, number> = {
    overdue: 0,
    'in-progress': 1,
    pending: 2,
    completed: 3,
    cancelled: 4,
  };

  return [...events].sort((a, b) => {
    const priorityA = statusPriority[a.status] ?? 999;
    const priorityB = statusPriority[b.status] ?? 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // If same priority, sort by title
    return a.title.localeCompare(b.title);
  });
}

/**
 * Convert scheduled articles to calendar events
 * Maps scheduled article data from the API to CalendarEvent format
 */
export interface ScheduledArticle {
  id: string;
  article_id: string;
  title: string;
  scheduled_at: string;
  schedule_status?:
    | 'pending'
    | 'scheduled'
    | 'publishing'
    | 'published'
    | 'failed'
    | 'cancelled';
  published_at?: string | null;
  status?: 'draft' | 'published' | 'archived';
}

export function scheduledArticlesToCalendarEvents(
  articles: ScheduledArticle[]
): CalendarEvent[] {
  const now = new Date();

  return articles
    .filter((article) => article.scheduled_at != null)
    .map((article) => {
      const scheduledDate = new Date(article.scheduled_at);
      const isPast = scheduledDate < now;
      const isPublished =
        article.published_at != null && new Date(article.published_at) <= now;

      // Determine the event status based on schedule state
      let eventStatus: CalendarEvent['status'] = 'pending';
      if (isPublished) {
        eventStatus = 'completed';
      } else if (isPast) {
        eventStatus = 'overdue';
      } else if (article.schedule_status === 'scheduled') {
        eventStatus = 'in-progress';
      }

      return {
        id: article.article_id || article.id,
        title: article.title,
        date: scheduledDate,
        status: eventStatus,
        description: `Scheduled for ${formatDate(scheduledDate, 'long')}`,
      };
    });
}

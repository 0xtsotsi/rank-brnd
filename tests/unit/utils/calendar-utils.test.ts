/**
 * Calendar Utilities Unit Tests
 *
 * Tests for:
 * - startOfDay: Set time to midnight
 * - isSameDay: Compare two dates
 * - isToday: Check if date is today
 * - isPast: Check if date is in the past
 * - isFuture: Check if date is in the future
 * - addDays: Add days to a date
 * - formatDate: Format dates for display
 * - getDayOfWeek: Get day name
 * - generateDayCells: Generate calendar day cells
 * - getDefaultStartDate: Get default calendar start date
 * - getWeekDayHeaders: Get weekday headers
 * - filterEventsByDateRange: Filter events by date range
 * - sortEventsByPriority: Sort events by status priority
 * - scheduledArticlesToCalendarEvents: Convert articles to events
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CalendarEvent } from '@/types/calendar';
import {
  startOfDay,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  addDays,
  formatDate,
  getDayOfWeek,
  generateDayCells,
  getDefaultStartDate,
  getWeekDayHeaders,
  filterEventsByDateRange,
  sortEventsByPriority,
  scheduledArticlesToCalendarEvents,
  type ScheduledArticle,
} from '@/lib/calendar-utils';

describe('Calendar Utilities', () => {
  describe('startOfDay', () => {
    it('should set time to midnight', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = startOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should not modify original date', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const originalHours = date.getHours();
      startOfDay(date);
      expect(date.getHours()).toBe(originalHours);
    });

    it('should handle dates near midnight', () => {
      // startOfDay sets hours to 0 in LOCAL timezone
      // For a date already at midnight locally, it should be unchanged
      const date = new Date('2024-01-15T00:00:00'); // Local time
      const result = startOfDay(date);
      expect(result.getTime()).toBe(date.getTime());
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day, different times', () => {
      const date1 = new Date('2024-01-15T09:00:00Z');
      const date2 = new Date('2024-01-15T18:30:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-15T00:00:00Z');
      const date2 = new Date('2024-01-16T00:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different months', () => {
      const date1 = new Date('2024-01-15T00:00:00Z');
      const date2 = new Date('2024-02-15T00:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different years', () => {
      const date1 = new Date('2024-01-15T00:00:00Z');
      const date2 = new Date('2025-01-15T00:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      expect(isPast(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      expect(isPast(futureDate)).toBe(false);
    });

    it('should return false for today', () => {
      const today = new Date();
      expect(isPast(today)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      expect(isFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      expect(isFuture(pastDate)).toBe(false);
    });

    it('should return false for today', () => {
      const today = new Date();
      expect(isFuture(today)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('should add negative days (subtract)', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });

    it('should handle zero days', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = addDays(date, 0);
      expect(result.getDate()).toBe(15);
    });

    it('should handle month boundaries', () => {
      const date = new Date('2024-01-30T00:00:00Z');
      const result = addDays(date, 5);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });

    it('should handle year boundaries', () => {
      const date = new Date('2024-12-30T00:00:00Z');
      const result = addDays(date, 5);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(4);
    });

    it('should not modify original date', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const originalDay = date.getDate();
      addDays(date, 5);
      expect(date.getDate()).toBe(originalDay);
    });
  });

  describe('formatDate', () => {
    it('should format dates in short format', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = formatDate(date, 'short');
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
    });

    it('should format dates in long format', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = formatDate(date, 'long');
      expect(result).toMatch(/January/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should format dates in time format', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDate(date, 'time');
      expect(result).toMatch(/\d/);
      expect(result).toMatch(/:/);
    });

    it('should default to short format', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/Jan/);
    });
  });

  describe('getDayOfWeek', () => {
    it('should return long day name', () => {
      const monday = new Date('2024-01-15T00:00:00Z'); // Monday
      expect(getDayOfWeek(monday, false)).toBe('Monday');
    });

    it('should return short day name', () => {
      const monday = new Date('2024-01-15T00:00:00Z'); // Monday
      expect(getDayOfWeek(monday, true)).toBe('Mon');
    });

    it('should default to long format', () => {
      const monday = new Date('2024-01-15T00:00:00Z');
      expect(getDayOfWeek(monday)).toBe('Monday');
    });

    it('should handle all days of the week', () => {
      const days = [
        '2024-01-14', // Sunday
        '2024-01-15', // Monday
        '2024-01-16', // Tuesday
        '2024-01-17', // Wednesday
        '2024-01-18', // Thursday
        '2024-01-19', // Friday
        '2024-01-20', // Saturday
      ];
      const expected = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];

      days.forEach((dateStr, i) => {
        expect(getDayOfWeek(new Date(dateStr))).toBe(expected[i]);
      });
    });
  });

  describe('generateDayCells', () => {
    it('should generate correct number of day cells', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const cells = generateDayCells(startDate, 7, []);
      expect(cells).toHaveLength(7);
    });

    it('should include day of month in cells', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const cells = generateDayCells(startDate, 5, []);
      expect(cells[0].dayOfMonth).toBe(1);
      expect(cells[4].dayOfMonth).toBe(5);
    });

    it('should mark today correctly', () => {
      const today = new Date();
      const cells = generateDayCells(today, 1, []);
      expect(cells[0].isToday).toBe(true);
    });

    it('should mark past dates correctly', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const cells = generateDayCells(pastDate, 1, []);
      expect(cells[0].isPast).toBe(true);
      expect(cells[0].isFuture).toBe(false);
    });

    it('should mark future dates correctly', () => {
      const futureDate = new Date('2030-01-01T00:00:00Z');
      const cells = generateDayCells(futureDate, 1, []);
      expect(cells[0].isFuture).toBe(true);
      expect(cells[0].isPast).toBe(false);
    });

    it('should associate events with correct dates', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const events: CalendarEvent[] = [
        {
          id: '1',
          title: 'Event 1',
          date: new Date('2024-01-01T00:00:00Z'),
          status: 'pending',
        },
        {
          id: '2',
          title: 'Event 2',
          date: new Date('2024-01-03T00:00:00Z'),
          status: 'completed',
        },
      ];
      const cells = generateDayCells(startDate, 5, events);

      expect(cells[0].events).toHaveLength(1);
      expect(cells[0].events[0].title).toBe('Event 1');
      expect(cells[2].events).toHaveLength(1);
      expect(cells[2].events[0].title).toBe('Event 2');
      expect(cells[1].events).toHaveLength(0);
    });
  });

  describe('getDefaultStartDate', () => {
    it('should return first day of current month', () => {
      const result = getDefaultStartDate();
      const now = new Date();
      expect(result.getMonth()).toBe(now.getMonth());
      expect(result.getFullYear()).toBe(now.getFullYear());
      expect(result.getDate()).toBe(1);
    });
  });

  describe('getWeekDayHeaders', () => {
    it('should return 7 day headers', () => {
      const headers = getWeekDayHeaders();
      expect(headers).toHaveLength(7);
    });

    it('should start with Sunday by default', () => {
      const headers = getWeekDayHeaders(0);
      expect(headers[0]).toBe('Sun');
      expect(headers).toEqual([
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
      ]);
    });

    it('should start with Monday when firstDayOfWeek is 1', () => {
      const headers = getWeekDayHeaders(1);
      expect(headers[0]).toBe('Mon');
      expect(headers).toEqual([
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
      ]);
    });

    it('should start with Wednesday when firstDayOfWeek is 3', () => {
      const headers = getWeekDayHeaders(3);
      expect(headers[0]).toBe('Wed');
      expect(headers).toEqual([
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
        'Mon',
        'Tue',
      ]);
    });
  });

  describe('filterEventsByDateRange', () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        title: 'Before',
        date: new Date('2024-01-05T00:00:00Z'),
        status: 'pending',
      },
      {
        id: '2',
        title: 'Start',
        date: new Date('2024-01-10T00:00:00Z'),
        status: 'pending',
      },
      {
        id: '3',
        title: 'Middle',
        date: new Date('2024-01-15T00:00:00Z'),
        status: 'pending',
      },
      {
        id: '4',
        title: 'End',
        date: new Date('2024-01-20T00:00:00Z'),
        status: 'pending',
      },
      {
        id: '5',
        title: 'After',
        date: new Date('2024-01-25T00:00:00Z'),
        status: 'pending',
      },
    ];

    it('should filter events within date range', () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-20T00:00:00Z');
      const result = filterEventsByDateRange(events, startDate, endDate);
      expect(result).toHaveLength(3);
      expect(result.map((e) => e.id)).toEqual(['2', '3', '4']);
    });

    it('should include events on start date', () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-15T00:00:00Z');
      const result = filterEventsByDateRange(events, startDate, endDate);
      expect(result.some((e) => e.id === '2')).toBe(true);
    });

    it('should include events on end date', () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-20T00:00:00Z');
      const result = filterEventsByDateRange(events, startDate, endDate);
      expect(result.some((e) => e.id === '4')).toBe(true);
    });

    it('should exclude events before range', () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-20T00:00:00Z');
      const result = filterEventsByDateRange(events, startDate, endDate);
      expect(result.some((e) => e.id === '1')).toBe(false);
    });

    it('should exclude events after range', () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-20T00:00:00Z');
      const result = filterEventsByDateRange(events, startDate, endDate);
      expect(result.some((e) => e.id === '5')).toBe(false);
    });
  });

  describe('sortEventsByPriority', () => {
    it('should sort by status priority', () => {
      const events: CalendarEvent[] = [
        { id: '1', title: 'Pending', date: new Date(), status: 'pending' },
        { id: '2', title: 'Overdue', date: new Date(), status: 'overdue' },
        { id: '3', title: 'Completed', date: new Date(), status: 'completed' },
        {
          id: '4',
          title: 'In Progress',
          date: new Date(),
          status: 'in-progress',
        },
        { id: '5', title: 'Cancelled', date: new Date(), status: 'cancelled' },
      ];
      const result = sortEventsByPriority(events);
      expect(result[0].status).toBe('overdue');
      expect(result[1].status).toBe('in-progress');
      expect(result[2].status).toBe('pending');
      expect(result[3].status).toBe('completed');
      expect(result[4].status).toBe('cancelled');
    });

    it('should sort by title when status is same', () => {
      const events: CalendarEvent[] = [
        { id: '1', title: 'Zebra', date: new Date(), status: 'pending' },
        { id: '2', title: 'Apple', date: new Date(), status: 'pending' },
        { id: '3', title: 'Monkey', date: new Date(), status: 'pending' },
      ];
      const result = sortEventsByPriority(events);
      expect(result[0].title).toBe('Apple');
      expect(result[1].title).toBe('Monkey');
      expect(result[2].title).toBe('Zebra');
    });

    it('should not modify original array', () => {
      const events: CalendarEvent[] = [
        { id: '1', title: 'Pending', date: new Date(), status: 'pending' },
        { id: '2', title: 'Overdue', date: new Date(), status: 'overdue' },
      ];
      const originalOrder = events.map((e) => e.id);
      sortEventsByPriority(events);
      expect(events.map((e) => e.id)).toEqual(originalOrder);
    });

    it('should handle unknown statuses', () => {
      const events: CalendarEvent[] = [
        {
          id: '1',
          title: 'Unknown',
          date: new Date(),
          status: 'unknown' as any,
        },
        { id: '2', title: 'Pending', date: new Date(), status: 'pending' },
      ];
      const result = sortEventsByPriority(events);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('unknown');
    });
  });

  describe('scheduledArticlesToCalendarEvents', () => {
    it('should convert articles to calendar events', () => {
      const articles: ScheduledArticle[] = [
        {
          id: '1',
          article_id: 'article-1',
          title: 'Test Article',
          scheduled_at: '2024-01-15T10:00:00Z',
          schedule_status: 'scheduled',
        },
      ];
      const result = scheduledArticlesToCalendarEvents(articles);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('article-1');
      expect(result[0].title).toBe('Test Article');
      expect(result[0].date).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should mark published articles as completed', () => {
      const now = new Date('2024-01-20T00:00:00Z');
      const articles: ScheduledArticle[] = [
        {
          id: '1',
          article_id: 'article-1',
          title: 'Published Article',
          scheduled_at: '2024-01-15T10:00:00Z',
          schedule_status: 'scheduled',
          published_at: '2024-01-15T10:00:00Z',
        },
      ];
      const result = scheduledArticlesToCalendarEvents(articles);
      expect(result[0].status).toBe('completed');
    });

    it('should mark past unpublished articles as overdue', () => {
      const articles: ScheduledArticle[] = [
        {
          id: '1',
          article_id: 'article-1',
          title: 'Past Article',
          scheduled_at: '2020-01-15T10:00:00Z',
          schedule_status: 'scheduled',
        },
      ];
      const result = scheduledArticlesToCalendarEvents(articles);
      expect(result[0].status).toBe('overdue');
    });

    it('should mark scheduled articles as in-progress', () => {
      const articles: ScheduledArticle[] = [
        {
          id: '1',
          article_id: 'article-1',
          title: 'Future Article',
          scheduled_at: '2030-01-15T10:00:00Z',
          schedule_status: 'scheduled',
        },
      ];
      const result = scheduledArticlesToCalendarEvents(articles);
      expect(result[0].status).toBe('in-progress');
    });

    it('should filter articles without scheduled_at', () => {
      const articles: ScheduledArticle[] = [
        {
          id: '1',
          article_id: 'article-1',
          title: 'No Date Article',
          scheduled_at: null as any,
        },
      ];
      const result = scheduledArticlesToCalendarEvents(articles);
      expect(result).toHaveLength(0);
    });

    it('should use article_id if id is not available', () => {
      const articles: ScheduledArticle[] = [
        {
          id: '1',
          article_id: '',
          title: 'Test Article',
          scheduled_at: '2024-01-15T10:00:00Z',
          schedule_status: 'scheduled',
        },
      ];
      const result = scheduledArticlesToCalendarEvents(articles);
      expect(result[0].id).toBe('1');
    });
  });
});

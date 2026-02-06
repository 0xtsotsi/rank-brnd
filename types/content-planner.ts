/**
 * Content Planner Types
 * Types for the content planner with calendar and list views
 */

import type { CalendarEvent, EventStatus } from './calendar';

// Re-export EventStatus for convenience
export type { EventStatus };

/**
 * Content types that can be planned in the calendar
 */
export type ContentType =
  | 'article'
  | 'blog-post'
  | 'social-media'
  | 'email'
  | 'video'
  | 'other';

/**
 * Extended calendar event for content items
 * Adds content-specific fields to the base CalendarEvent
 */
export interface ContentItem extends Omit<CalendarEvent, 'date'> {
  id: string;
  title: string;
  description?: string;
  scheduledDate: Date; // Renamed from date for clarity
  status: EventStatus;
  color?: string;
  duration?: number;

  // Content-specific fields
  contentType: ContentType;
  keywords: string[]; // Associated keywords for tracking
  targetUrl?: string; // URL where content will be published
  estimatedReadTime?: number; // Minutes
  wordCount?: number;
  notes?: string;
  linkedKeywordId?: string; // ID of the keyword this content targets
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filter options for the content planner
 */
export interface ContentFilters {
  status: EventStatus | 'all';
  contentType: ContentType | 'all';
  keyword?: string; // Filter by specific keyword
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * View mode for the planner
 */
export type ViewMode = 'calendar' | 'list';

/**
 * Keyword linking data for calendar integration
 */
export interface KeywordLink {
  id: string;
  term: string;
  contentItems: ContentItem[];
  targetDate?: Date;
  status: 'active' | 'paused' | 'completed';
}

/**
 * Status update request from calendar interaction
 */
export interface StatusUpdateRequest {
  contentId: string;
  newStatus: EventStatus;
  publishedAt?: Date;
}

/**
 * Reschedule request from drag-drop
 */
export interface RescheduleRequest {
  contentId: string;
  newDate: Date;
}

/**
 * Content label mapping for display
 */
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: 'Article',
  'blog-post': 'Blog Post',
  'social-media': 'Social Media',
  email: 'Email',
  video: 'Video',
  other: 'Other',
} as const;

/**
 * Content type icon mapping (lucide-react icon names)
 */
export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  article: 'FileText',
  'blog-post': 'PenTool',
  'social-media': 'Share2',
  email: 'Mail',
  video: 'Video',
  other: 'MoreHorizontal',
} as const;

/**
 * Content type color mapping for visual distinction
 */
export const CONTENT_TYPE_COLORS: Record<
  ContentType,
  { bg: string; text: string; border: string }
> = {
  article: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  'blog-post': {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  'social-media': {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
  },
  email: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  video: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
  other: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
} as const;

/**
 * Convert ContentItem to CalendarEvent for use with existing calendar components
 */
export function contentItemToCalendarEvent(item: ContentItem): CalendarEvent {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    date: item.scheduledDate,
    status: item.status,
    color: item.color,
    duration: item.duration,
  };
}

/**
 * Convert CalendarEvent back to ContentItem (with defaults for new fields)
 */
export function calendarEventToContentItem(
  event: CalendarEvent,
  defaults: Partial<ContentItem> = {}
): ContentItem {
  const now = new Date();
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    scheduledDate: event.date,
    status: event.status,
    color: event.color,
    duration: event.duration,

    // Default content fields
    contentType: defaults.contentType || 'article',
    keywords: defaults.keywords || [],
    linkedKeywordId: defaults.linkedKeywordId,
    createdAt: defaults.createdAt || now,
    updatedAt: defaults.updatedAt || now,
  };
}

'use client';

/**
 * Content Planner Page
 * Main content planner with calendar and list views
 * Includes status filtering, keyword linking, and drag-drop rescheduling
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ContentItem,
  ContentFilters,
  ViewMode,
  ContentType,
  EventStatus,
} from '@/types/content-planner';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/calendar';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  contentItemToCalendarEvent,
} from '@/types/content-planner';
import { CalendarView } from '@/components/calendar/calendar-view';
import {
  ContentListView,
  ContentEditDialog,
} from '@/components/content-planner';
import { cn } from '@/lib/utils';
import { Calendar, List, Filter, Plus, Download, Upload } from 'lucide-react';

// Mock data - in production, this would come from an API
const mockContentItems: ContentItem[] = [
  {
    id: '1',
    title: 'SEO Best Practices for 2024',
    description: 'Comprehensive guide to modern SEO strategies',
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: 'pending',
    contentType: 'article',
    keywords: ['SEO', 'marketing', 'digital'],
    estimatedReadTime: 8,
    wordCount: 2000,
    notes: 'Focus on voice search optimization',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Product Launch Announcement',
    description: 'Social media campaign for new feature release',
    scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: 'in-progress',
    contentType: 'social-media',
    keywords: ['product launch', 'announcement'],
    estimatedReadTime: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Monthly Newsletter',
    description: 'March edition of our monthly newsletter',
    scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'overdue',
    contentType: 'email',
    keywords: ['newsletter', 'monthly'],
    estimatedReadTime: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    title: 'Video Tutorial: Getting Started',
    description: 'Quick start guide for new users',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'pending',
    contentType: 'video',
    keywords: ['tutorial', 'onboarding'],
    estimatedReadTime: 15,
    wordCount: 800,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    title: 'Blog Post: Industry Trends',
    description: 'Analysis of current industry trends',
    scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    status: 'completed',
    contentType: 'blog-post',
    keywords: ['trends', 'analysis', 'industry'],
    linkedKeywordId: 'kw-1',
    estimatedReadTime: 6,
    wordCount: 1500,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock available keywords for linking
const mockKeywords = [
  { id: 'kw-1', term: 'SEO optimization' },
  { id: 'kw-2', term: 'content marketing' },
  { id: 'kw-3', term: 'social media strategy' },
  { id: 'kw-4', term: 'email campaigns' },
];

export default function ContentPlannerPage() {
  // State management
  const [contentItems, setContentItems] =
    useState<ContentItem[]>(mockContentItems);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<ContentFilters>({
    status: 'all',
    contentType: 'all',
    keyword: undefined,
  });

  // Convert content items to calendar events for the CalendarView component
  const calendarEvents = useMemo(() => {
    return contentItems.map(contentItemToCalendarEvent);
  }, [contentItems]);

  // Filter content items based on current filters
  const filteredContentItems = useMemo(() => {
    let result = [...contentItems];

    if (filters.status !== 'all') {
      result = result.filter((item) => item.status === filters.status);
    }

    if (filters.contentType !== 'all') {
      result = result.filter(
        (item) => item.contentType === filters.contentType
      );
    }

    if (filters.keyword) {
      result = result.filter((item) =>
        item.keywords.some((k) =>
          k.toLowerCase().includes(filters.keyword!.toLowerCase())
        )
      );
    }

    return result;
  }, [contentItems, filters]);

  // Handle event click from calendar
  const handleEventClick = useCallback(
    (eventId: string) => {
      const item = contentItems.find((i) => i.id === eventId);
      if (item) {
        setSelectedItem(item);
        setIsDialogOpen(true);
      }
    },
    [contentItems]
  );

  // Handle day click to create new content
  const handleDayClick = useCallback((date: Date) => {
    const newItem: ContentItem = {
      id: `new-${Date.now()}`,
      title: 'New Content',
      scheduledDate: date,
      status: 'pending',
      contentType: 'article',
      keywords: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSelectedItem(newItem);
    setIsDialogOpen(true);
  }, []);

  // Handle event drop (reschedule)
  const handleEventDrop = useCallback((eventId: string, newDate: Date) => {
    setContentItems((prev) =>
      prev.map((item) =>
        item.id === eventId
          ? { ...item, scheduledDate: newDate, updatedAt: new Date() }
          : item
      )
    );
  }, []);

  // Handle status update
  const handleStatusUpdate = useCallback(
    (itemId: string, newStatus: EventStatus) => {
      setContentItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: newStatus,
                ...(newStatus === 'completed' && { publishedAt: new Date() }),
                updatedAt: new Date(),
              }
            : item
        )
      );
    },
    []
  );

  // Handle save (create/update)
  const handleSave = useCallback((item: ContentItem) => {
    setContentItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...item, updatedAt: new Date() };
        return updated;
      }
      return [...prev, item];
    });
    setIsDialogOpen(false);
  }, []);

  // Handle delete
  const handleDelete = useCallback((itemId: string) => {
    setContentItems((prev) => prev.filter((item) => item.id !== itemId));
    setIsDialogOpen(false);
  }, []);

  // Handle keyword linking
  const handleKeywordLink = useCallback((itemId: string, keywordId: string) => {
    setContentItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, linkedKeywordId: keywordId, updatedAt: new Date() }
          : item
      )
    );
  }, []);

  // Get status counts for the filter display
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contentItems.length };
    contentItems.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [contentItems]);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Content Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Plan and organize your content calendar
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newItem: ContentItem = {
                id: `new-${Date.now()}`,
                title: 'New Content',
                scheduledDate: new Date(),
                status: 'pending',
                contentType: 'article',
                keywords: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              setSelectedItem(newItem);
              setIsDialogOpen(true);
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
              'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors',
              'dark:bg-indigo-500 dark:hover:bg-indigo-600'
            )}
          >
            <Plus className="h-4 w-4" />
            New Content
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3'
        )}
      >
        {/* View Toggle */}
        <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              viewMode === 'calendar'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value as ContentFilters['status'],
              }))
            }
            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">
              Pending ({statusCounts.pending || 0})
            </option>
            <option value="in-progress">
              In Progress ({statusCounts['in-progress'] || 0})
            </option>
            <option value="completed">
              Completed ({statusCounts.completed || 0})
            </option>
            <option value="cancelled">
              Cancelled ({statusCounts.cancelled || 0})
            </option>
            <option value="overdue">
              Overdue ({statusCounts.overdue || 0})
            </option>
          </select>
        </div>

        {/* Content Type Filter */}
        <select
          value={filters.contentType}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              contentType: e.target.value as ContentFilters['contentType'],
            }))
          }
          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="article">Articles</option>
          <option value="blog-post">Blog Posts</option>
          <option value="social-media">Social Media</option>
          <option value="email">Emails</option>
          <option value="video">Videos</option>
          <option value="other">Other</option>
        </select>

        {/* Keyword Filter */}
        <input
          type="text"
          placeholder="Filter by keyword..."
          value={filters.keyword || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              keyword: e.target.value || undefined,
            }))
          }
          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(STATUS_LABELS).map(([status, label]) => {
          const count = statusCounts[status] || 0;
          const colors = STATUS_COLORS[status as EventStatus];
          return (
            <div
              key={status}
              className={cn(
                'rounded-lg border px-4 py-3',
                colors.bg,
                colors.border,
                'border'
              )}
            >
              <p className={cn('text-sm font-medium', colors.text)}>{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content - Calendar or List View */}
      {viewMode === 'calendar' ? (
        <CalendarView
          events={calendarEvents}
          onEventClick={(event) => handleEventClick(event.id)}
          onDayClick={handleDayClick}
          onEventDrop={handleEventDrop}
          numberOfDays={30}
        />
      ) : (
        <ContentListView
          items={filteredContentItems}
          filters={filters}
          onItemClick={(item) => {
            setSelectedItem(item);
            setIsDialogOpen(true);
          }}
          onStatusChange={handleStatusUpdate}
        />
      )}

      {/* Edit Dialog */}
      <ContentEditDialog
        item={selectedItem}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        onStatusUpdate={handleStatusUpdate}
        onKeywordLink={handleKeywordLink}
        availableKeywords={mockKeywords}
      />
    </div>
  );
}

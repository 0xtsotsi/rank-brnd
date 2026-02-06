/**
 * Calendar Component Types
 * Types for the 30-day calendar view component with drag-drop scheduling
 */

/**
 * Status types for calendar events with associated colors
 */
export type EventStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

/**
 * Calendar event representing a scheduled item
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date; // The day this event is scheduled for
  status: EventStatus;
  color?: string; // Optional custom color override
  duration?: number; // Duration in minutes (for display)
}

/**
 * Day cell data structure
 */
export interface DayCell {
  date: Date;
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  events: CalendarEvent[];
}

/**
 * Drag and drop data transfer structure
 */
export interface DragData {
  eventId: string;
  sourceDate: Date;
  eventTitle: string;
}

/**
 * Calendar view configuration
 */
export interface CalendarConfig {
  numberOfDays?: number; // Default: 30
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  showWeekends?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * Event handler types for calendar interactions
 */
export interface CalendarEventHandlers {
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
  onEventDrop?: (eventId: string, newDate: Date) => void;
  onEventDragStart?: (event: CalendarEvent) => void;
  onEventDragEnd?: (event: CalendarEvent) => void;
}

/**
 * Status color mapping for display
 */
export const STATUS_COLORS: Record<
  EventStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  'in-progress': {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  completed: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  cancelled: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  overdue: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
} as const;

/**
 * Status label mapping
 */
export const STATUS_LABELS: Record<EventStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
} as const;

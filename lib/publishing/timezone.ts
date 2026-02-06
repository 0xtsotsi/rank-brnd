/**
 * Timezone Utilities for Scheduled Publishing
 *
 * Handles timezone conversion and management for scheduled publishing.
 * All dates are stored in UTC in the database, and converted to/from
 * the user's timezone for display and input.
 */

/**
 * Default timezone to use when none is specified
 */
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Get the user's timezone from the request headers
 * Falls back to UTC if not available
 */
export function getTimezoneFromRequest(request: Request): string {
  // Try to get timezone from headers (some clients send this)
  const tzHeader =
    request.headers.get('x-timezone') ||
    request.headers.get('x-client-timezone');
  if (tzHeader && isValidTimezone(tzHeader)) {
    return tzHeader;
  }

  // Try to get from accept-language header (infer from locale)
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const locale = acceptLanguage.split(',')[0].trim();
    const timezone = localeToTimezone(locale);
    if (timezone && isValidTimezone(timezone)) {
      return timezone;
    }
  }

  return DEFAULT_TIMEZONE;
}

/**
 * Convert a date string from user's timezone to UTC
 * @param dateString - The date string in user's timezone or ISO format
 * @param userTimezone - The user's timezone (IANA format)
 * @returns UTC ISO string
 */
export function toUTC(dateString: string, userTimezone: string): string {
  // If already ISO format with Z, return as is
  if (dateString.endsWith('Z')) {
    return dateString;
  }

  // If has timezone offset, parse and convert to UTC
  if (dateString.includes('+') || dateString.match(/-[0-9]{2}:[0-9]{2}$/)) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Otherwise, treat as local time in the specified timezone and convert to UTC
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    // Create a date in the user's timezone by using the Intl API
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    // Parse the date parts from the user's timezone
    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    // Create a new date object using the parsed parts
    const utcDate = new Date(
      Date.UTC(
        parseInt(partMap.year, 10),
        parseInt(partMap.month, 10) - 1,
        parseInt(partMap.day, 10),
        parseInt(partMap.hour, 10),
        parseInt(partMap.minute, 10),
        parseInt(partMap.second, 10)
      )
    );

    // Now convert back to get the correct UTC representation
    const userFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const userParts = userFormatter.formatToParts(date);
    const userPartMap = Object.fromEntries(
      userParts.map((p) => [p.type, p.value])
    );

    const adjustedDate = new Date(
      Date.UTC(
        parseInt(userPartMap.year, 10),
        parseInt(userPartMap.month, 10) - 1,
        parseInt(userPartMap.day, 10),
        parseInt(userPartMap.hour, 10),
        parseInt(userPartMap.minute, 10),
        parseInt(userPartMap.second, 10)
      )
    );

    // Get the timezone offset
    const offsetMs = adjustedDate.getTime() - date.getTime();
    const utcDateFinal = new Date(adjustedDate.getTime() - offsetMs);

    return utcDateFinal.toISOString();
  } catch {
    // If conversion fails, assume the input is already a date that needs ISO conversion
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return dateString;
  }
}

/**
 * Convert a UTC date string to user's timezone
 * @param utcDateString - UTC date string
 * @param userTimezone - User's timezone
 * @returns Date object representing the time in user's timezone
 */
export function fromUTC(utcDateString: string, userTimezone: string): Date {
  const utcDate = new Date(utcDateString);

  // Use Intl to format the date in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return new Date(
    parseInt(partMap.year, 10),
    parseInt(partMap.month, 10) - 1,
    parseInt(partMap.day, 10),
    parseInt(partMap.hour, 10),
    parseInt(partMap.minute, 10),
    parseInt(partMap.second, 10)
  );
}

/**
 * Format a UTC date for display in user's timezone
 * @param utcDateString - UTC date string
 * @param userTimezone - User's timezone
 * @param formatStr - Format string (supports: YYYY-MM-DD, HH:mm:ss, etc.)
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  utcDateString: string,
  userTimezone: string,
  formatStr: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  const dateInTz = fromUTC(utcDateString, userTimezone);

  const year = dateInTz.getFullYear();
  const month = String(dateInTz.getMonth() + 1).padStart(2, '0');
  const day = String(dateInTz.getDate()).padStart(2, '0');
  const hours = String(dateInTz.getHours()).padStart(2, '0');
  const minutes = String(dateInTz.getMinutes()).padStart(2, '0');
  const seconds = String(dateInTz.getSeconds()).padStart(2, '0');

  return formatStr
    .replace(/YYYY/g, String(year))
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
}

/**
 * Get a list of common timezones for UI selection
 */
export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  group: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // Americas
  {
    value: 'America/New_York',
    label: 'New York',
    offset: 'UTC-5/-4',
    group: 'Americas',
  },
  {
    value: 'America/Chicago',
    label: 'Chicago',
    offset: 'UTC-6/-5',
    group: 'Americas',
  },
  {
    value: 'America/Denver',
    label: 'Denver',
    offset: 'UTC-7/-6',
    group: 'Americas',
  },
  {
    value: 'America/Los_Angeles',
    label: 'Los Angeles',
    offset: 'UTC-8/-7',
    group: 'Americas',
  },
  {
    value: 'America/Toronto',
    label: 'Toronto',
    offset: 'UTC-5/-4',
    group: 'Americas',
  },
  {
    value: 'America/Vancouver',
    label: 'Vancouver',
    offset: 'UTC-8/-7',
    group: 'Americas',
  },
  {
    value: 'America/Sao_Paulo',
    label: 'São Paulo',
    offset: 'UTC-3/-2',
    group: 'Americas',
  },
  {
    value: 'America/Mexico_City',
    label: 'Mexico City',
    offset: 'UTC-6/-5',
    group: 'Americas',
  },
  {
    value: 'America/Argentina/Buenos_Aires',
    label: 'Buenos Aires',
    offset: 'UTC-3',
    group: 'Americas',
  },

  // Europe
  {
    value: 'Europe/London',
    label: 'London',
    offset: 'UTC+0/+1',
    group: 'Europe',
  },
  {
    value: 'Europe/Paris',
    label: 'Paris',
    offset: 'UTC+1/+2',
    group: 'Europe',
  },
  {
    value: 'Europe/Berlin',
    label: 'Berlin',
    offset: 'UTC+1/+2',
    group: 'Europe',
  },
  {
    value: 'Europe/Madrid',
    label: 'Madrid',
    offset: 'UTC+1/+2',
    group: 'Europe',
  },
  { value: 'Europe/Rome', label: 'Rome', offset: 'UTC+1/+2', group: 'Europe' },
  {
    value: 'Europe/Amsterdam',
    label: 'Amsterdam',
    offset: 'UTC+1/+2',
    group: 'Europe',
  },
  {
    value: 'Europe/Zurich',
    label: 'Zurich',
    offset: 'UTC+1/+2',
    group: 'Europe',
  },
  { value: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3', group: 'Europe' },
  {
    value: 'Europe/Istanbul',
    label: 'Istanbul',
    offset: 'UTC+3',
    group: 'Europe',
  },
  {
    value: 'Europe/Athens',
    label: 'Athens',
    offset: 'UTC+2/+3',
    group: 'Europe',
  },

  // Asia
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4', group: 'Asia' },
  { value: 'Asia/Mumbai', label: 'Mumbai', offset: 'UTC+5:30', group: 'Asia' },
  {
    value: 'Asia/Kolkata',
    label: 'Kolkata',
    offset: 'UTC+5:30',
    group: 'Asia',
  },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: 'UTC+7', group: 'Asia' },
  {
    value: 'Asia/Singapore',
    label: 'Singapore',
    offset: 'UTC+8',
    group: 'Asia',
  },
  {
    value: 'Asia/Hong_Kong',
    label: 'Hong Kong',
    offset: 'UTC+8',
    group: 'Asia',
  },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: 'UTC+8', group: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'UTC+9', group: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+9', group: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta', offset: 'UTC+7', group: 'Asia' },
  { value: 'Asia/Manila', label: 'Manila', offset: 'UTC+8', group: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipei', offset: 'UTC+8', group: 'Asia' },

  // Oceania
  {
    value: 'Australia/Sydney',
    label: 'Sydney',
    offset: 'UTC+10/+11',
    group: 'Oceania',
  },
  {
    value: 'Australia/Melbourne',
    label: 'Melbourne',
    offset: 'UTC+10/+11',
    group: 'Oceania',
  },
  {
    value: 'Australia/Brisbane',
    label: 'Brisbane',
    offset: 'UTC+10',
    group: 'Oceania',
  },
  {
    value: 'Australia/Perth',
    label: 'Perth',
    offset: 'UTC+8',
    group: 'Oceania',
  },
  {
    value: 'Pacific/Auckland',
    label: 'Auckland',
    offset: 'UTC+12/+13',
    group: 'Oceania',
  },

  // Africa
  {
    value: 'Africa/Johannesburg',
    label: 'Johannesburg',
    offset: 'UTC+2',
    group: 'Africa',
  },
  { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+2', group: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: 'UTC+1', group: 'Africa' },
  {
    value: 'Africa/Nairobi',
    label: 'Nairobi',
    offset: 'UTC+3',
    group: 'Africa',
  },

  // Universal
  { value: 'UTC', label: 'UTC', offset: 'UTC+0', group: 'Universal' },
];

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert locale to timezone approximation
 */
function localeToTimezone(locale: string): string | null {
  const localeMap: Record<string, string> = {
    'en-US': 'America/New_York',
    'en-CA': 'America/Toronto',
    'en-GB': 'Europe/London',
    'en-AU': 'Australia/Sydney',
    'en-NZ': 'Pacific/Auckland',
    'fr-FR': 'Europe/Paris',
    'de-DE': 'Europe/Berlin',
    'es-ES': 'Europe/Madrid',
    'it-IT': 'Europe/Rome',
    'pt-BR': 'America/Sao_Paulo',
    'ja-JP': 'Asia/Tokyo',
    'ko-KR': 'Asia/Seoul',
    'zh-CN': 'Asia/Shanghai',
    'zh-TW': 'Asia/Taipei',
    'ar-AE': 'Asia/Dubai',
    'ru-RU': 'Europe/Moscow',
    'tr-TR': 'Europe/Istanbul',
    'pl-PL': 'Europe/Warsaw',
    'nl-NL': 'Europe/Amsterdam',
    'sv-SE': 'Europe/Stockholm',
    'da-DK': 'Europe/Copenhagen',
    'no-NO': 'Europe/Oslo',
    'fi-FI': 'Europe/Helsinki',
    'el-GR': 'Europe/Athens',
    'cs-CZ': 'Europe/Prague',
    'ro-RO': 'Europe/Bucharest',
    'hu-HU': 'Europe/Budapest',
    'uk-UA': 'Europe/Kiev',
    'th-TH': 'Asia/Bangkok',
    'vi-VN': 'Asia/Ho_Chi_Minh',
    'id-ID': 'Asia/Jakarta',
    'ms-MY': 'Asia/Kuala_Lumpur',
    'fil-PH': 'Asia/Manila',
    'hi-IN': 'Asia/Kolkata',
    'en-IN': 'Asia/Kolkata',
    'ur-PK': 'Asia/Karachi',
    'en-ZA': 'Africa/Johannesburg',
    'en-NG': 'Africa/Lagos',
    'ar-EG': 'Africa/Cairo',
    'en-KE': 'Africa/Nairobi',
  };

  return localeMap[locale] || null;
}

/**
 * Get the current time in a specific timezone as ISO string
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const localDate = new Date(
    parseInt(partMap.year, 10),
    parseInt(partMap.month, 10) - 1,
    parseInt(partMap.day, 10),
    parseInt(partMap.hour, 10),
    parseInt(partMap.minute, 10),
    parseInt(partMap.second, 10)
  );

  // Convert to UTC
  return localDate.toISOString();
}

/**
 * Parse a scheduled date with timezone and return UTC
 * @param dateString - Date string (can be ISO or local format)
 * @param timezone - User's timezone
 * @returns UTC ISO string
 */
export function parseScheduledDate(
  dateString: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  // If already ISO format with Z or timezone offset, parse and return
  if (
    dateString.endsWith('Z') ||
    dateString.includes('+') ||
    dateString.includes('T')
  ) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Otherwise, treat as local time in the specified timezone
  return toUTC(dateString, timezone);
}

/**
 * Check if a scheduled date is in the past
 */
export function isScheduledDateInPast(
  scheduledDate: string,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const utcDate = new Date(scheduledDate);
  const now = new Date();
  return utcDate < now;
}

/**
 * Get the next occurrence of a recurring schedule
 */
export function getNextOccurrence(
  baseDate: string,
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
  timezone: string = DEFAULT_TIMEZONE
): Date | null {
  if (recurrence === 'none') return null;

  const date = fromUTC(baseDate, timezone);
  const nextDate = new Date(date);

  switch (recurrence) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
}

/**
 * Format a relative time string (e.g., "in 2 hours", "3 days ago")
 */
export function formatRelativeTime(
  date: Date,
  baseDate: Date = new Date()
): string {
  const diffMs = date.getTime() - baseDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const isFuture = diffMs >= 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';

  if (Math.abs(diffSecs) < 60) {
    return diffSecs === 0
      ? 'just now'
      : `${prefix}${Math.abs(diffSecs)}s${suffix}`;
  } else if (Math.abs(diffMins) < 60) {
    return `${prefix}${Math.abs(diffMins)}m${suffix}`;
  } else if (Math.abs(diffHours) < 24) {
    return `${prefix}${Math.abs(diffHours)}h${suffix}`;
  } else if (Math.abs(diffDays) < 30) {
    return `${prefix}${Math.abs(diffDays)}d${suffix}`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    return `${prefix}${Math.abs(diffMonths)}mo${suffix}`;
  }
}

/**
 * Get the current timezone offset for a given timezone
 * @param timezone - IANA timezone string
 * @returns Offset in minutes
 */
export function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });

  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName');

  if (!offsetPart) return 0;

  // Parse offset like "GMT-05:00"
  const match = offsetPart.value.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;

  const [, sign, hours, minutes] = match;
  const offsetMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  return sign === '-' ? -offsetMinutes : offsetMinutes;
}

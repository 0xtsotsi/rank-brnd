/**
 * Rank Tracking Types
 * Types for the rank tracking feature with historical position data
 */

/**
 * Device type for rank tracking
 */
export type RankDevice = 'desktop' | 'mobile' | 'tablet';

/**
 * Rank tracking record with historical position data
 */
export interface RankTracking {
  id: string;
  organization_id: string;
  product_id?: string;
  keyword_id: string;
  position: number;
  device: RankDevice;
  location: string;
  url?: string;
  date: Date;
  search_volume?: number;
  ctr?: number;
  impressions?: number;
  clicks?: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

/**
 * Create rank tracking input
 */
export interface RankTrackingCreateInput {
  organization_id: string;
  product_id?: string;
  keyword_id: string;
  position: number;
  device?: RankDevice;
  location?: string;
  url?: string;
  date?: Date;
  search_volume?: number;
  ctr?: number;
  impressions?: number;
  clicks?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update rank tracking input
 */
export interface RankTrackingUpdateInput {
  position?: number;
  url?: string;
  search_volume?: number;
  ctr?: number;
  impressions?: number;
  clicks?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Rank history record (simplified for display)
 */
export interface RankHistoryEntry {
  date: Date;
  position: number;
  url?: string;
  search_volume?: number;
  ctr?: number;
  impressions?: number;
  clicks?: number;
}

/**
 * Rank statistics for a keyword
 */
export interface RankStatistics {
  avg_position: number;
  min_position: number;
  max_position: number;
  current_position: number | null;
  position_change: number | null;
  total_records: number;
  first_tracked: Date | null;
  last_tracked: Date | null;
}

/**
 * Filter options for rank tracking
 */
export interface RankTrackingFilters {
  organization_id?: string;
  product_id?: string;
  keyword_id?: string;
  device?: RankDevice;
  location?: string;
  date_from?: Date;
  date_to?: Date;
  min_position?: number;
  max_position?: number;
}

/**
 * Sort options for rank tracking
 */
export type RankTrackingSortField =
  | 'date'
  | 'position'
  | 'device'
  | 'location'
  | 'created_at';

export type RankTrackingSortDirection = 'asc' | 'desc';

export interface RankTrackingSort {
  field: RankTrackingSortField;
  direction: RankTrackingSortDirection;
}

/**
 * Device label mapping
 */
export const DEVICE_LABELS: Record<RankDevice, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
} as const;

/**
 * Device color mapping (for Tailwind CSS)
 */
export const DEVICE_COLORS: Record<
  RankDevice,
  { bg: string; text: string; border: string; icon: string }
> = {
  desktop: {
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
    icon: 'Monitor',
  },
  mobile: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'Smartphone',
  },
  tablet: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'Tablet',
  },
} as const;

/**
 * Common location codes with labels
 */
export const LOCATION_LABELS: Record<string, string> = {
  us: 'United States',
  uk: 'United Kingdom',
  ca: 'Canada',
  au: 'Australia',
  de: 'Germany',
  fr: 'France',
  es: 'Spain',
  it: 'Italy',
  jp: 'Japan',
  in: 'India',
  br: 'Brazil',
  mx: 'Mexico',
  nl: 'Netherlands',
  se: 'Sweden',
  no: 'Norway',
  dk: 'Denmark',
  fi: 'Finland',
  pl: 'Poland',
  ch: 'Switzerland',
  at: 'Austria',
  be: 'Belgium',
  global: 'Global',
} as const;

/**
 * Position change indicator
 */
export interface PositionChange {
  change: number | null;
  direction: 'up' | 'down' | 'same' | 'unknown';
  magnitude: number;
}

/**
 * Get position change indicator from two positions
 */
export function getPositionChange(
  currentPosition: number | null | undefined,
  previousPosition: number | null | undefined
): PositionChange {
  if (currentPosition == null || previousPosition == null) {
    return { change: null, direction: 'unknown', magnitude: 0 };
  }

  const change = currentPosition - previousPosition;
  const magnitude = Math.abs(change);

  if (change > 0) {
    return { change, direction: 'down', magnitude }; // Position increased = rank dropped
  } else if (change < 0) {
    return { change, direction: 'up', magnitude }; // Position decreased = rank improved
  } else {
    return { change: 0, direction: 'same', magnitude: 0 };
  }
}

/**
 * Get rank color based on position (1-100)
 */
export function getRankColor(position: number): string {
  if (position <= 3) return 'text-green-600 dark:text-green-400';
  if (position <= 10) return 'text-emerald-600 dark:text-emerald-400';
  if (position <= 20) return 'text-yellow-600 dark:text-yellow-400';
  if (position <= 50) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get rank badge color based on position
 */
export function getRankBadgeColor(position: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (position <= 3) {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    };
  }
  if (position <= 10) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    };
  }
  if (position <= 20) {
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
  }
  if (position <= 50) {
    return {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
    };
  }
  return {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  };
}

/**
 * Format position change for display
 */
export function formatPositionChange(change: number | null): string {
  if (change === null) return 'N/A';
  if (change === 0) return 'No change';
  const sign = change > 0 ? '↓' : '↑'; // Note: higher position number = lower rank
  return `${sign} ${Math.abs(change)}`;
}

/**
 * Get position change color
 */
export function getPositionChangeColor(change: number | null): string {
  if (change === null) return 'text-gray-400';
  if (change === 0) return 'text-gray-500';
  if (change > 0) return 'text-red-600 dark:text-red-400'; // Position dropped (bad)
  return 'text-green-600 dark:text-green-400'; // Position improved (good)
}

/**
 * Format CTR for display
 */
export function formatCTR(ctr?: number | null): string {
  if (ctr === null || ctr === undefined) return 'N/A';
  return `${(ctr * 100).toFixed(2)}%`;
}

/**
 * Format large numbers (impressions, clicks)
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Validate rank tracking data
 */
export function validateRankTracking(data: {
  position?: number;
  device?: string;
  location?: string;
  date?: Date;
  ctr?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.position !== undefined) {
    if (typeof data.position !== 'number') {
      errors.push('Position must be a number');
    } else if (data.position < 1) {
      errors.push('Position must be at least 1');
    }
  }

  if (data.device !== undefined) {
    const validDevices = ['desktop', 'mobile', 'tablet'];
    if (!validDevices.includes(data.device)) {
      errors.push(`Device must be one of: ${validDevices.join(', ')}`);
    }
  }

  if (data.location !== undefined && data.location.length > 10) {
    errors.push('Location code must be 10 characters or less');
  }

  if (data.ctr !== undefined) {
    if (typeof data.ctr !== 'number') {
      errors.push('CTR must be a number');
    } else if (data.ctr < 0 || data.ctr > 1) {
      errors.push('CTR must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default location based on organization settings
 */
export function getDefaultLocation(userLocation?: string): string {
  // Default to US if no location provided
  return userLocation?.toLowerCase() || 'us';
}

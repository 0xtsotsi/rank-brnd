/**
 * Keyword Research Types
 * Types for the keyword research feature with search, filtering, and bulk import
 */

/**
 * Search intent classification for keywords
 */
export type SearchIntent =
  | 'informational'
  | 'navigational'
  | 'transactional'
  | 'commercial';

/**
 * Difficulty level for ranking a keyword
 */
export type DifficultyLevel =
  | 'very-easy'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'very-hard';

/**
 * Status of a keyword in tracking
 */
export type KeywordStatus = 'tracking' | 'paused' | 'opportunity' | 'ignored';

/**
 * Keyword research data with SEO metrics
 */
export interface Keyword {
  id: string;
  keyword: string;
  searchVolume?: number;
  cpc?: number; // Cost per click in USD
  competition?: number; // 0-1 scale
  difficulty: DifficultyLevel;
  intent: SearchIntent;
  status: KeywordStatus;
  currentRank?: number; // Current ranking position
  targetUrl?: string; // URL being optimized for this keyword
  lastChecked?: Date;
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filter options for keyword research
 */
export interface KeywordFilters {
  search: string; // Text search in keyword
  intent: SearchIntent | 'all';
  difficulty: DifficultyLevel | 'all';
  status: KeywordStatus | 'all';
  tags: string[]; // Filter by tags
  minSearchVolume?: number;
  maxSearchVolume?: number;
}

/**
 * Sort options for keyword results
 */
export type KeywordSortField =
  | 'keyword'
  | 'searchVolume'
  | 'difficulty'
  | 'intent'
  | 'status'
  | 'currentRank'
  | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export interface KeywordSort {
  field: KeywordSortField;
  direction: SortDirection;
}

/**
 * Bulk import data structure
 */
export interface KeywordImportRow {
  keyword: string;
  searchVolume?: string; // String for CSV parsing
  cpc?: string;
  difficulty?: string;
  intent?: string;
  tags?: string; // Comma-separated
  targetUrl?: string;
  notes?: string;
}

/**
 * Import result summary
 */
export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; keyword: string; error: string }>;
}

/**
 * Search intent label mapping
 */
export const INTENT_LABELS: Record<SearchIntent, string> = {
  informational: 'Informational',
  navigational: 'Navigational',
  transactional: 'Transactional',
  commercial: 'Commercial',
} as const;

/**
 * Search intent color mapping
 */
export const INTENT_COLORS: Record<
  SearchIntent,
  { bg: string; text: string; border: string }
> = {
  informational: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  navigational: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  transactional: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  commercial: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
} as const;

/**
 * Difficulty level label mapping
 */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  'very-easy': 'Very Easy',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  'very-hard': 'Very Hard',
} as const;

/**
 * Difficulty level color mapping
 */
export const DIFFICULTY_COLORS: Record<
  DifficultyLevel,
  { bg: string; text: string; border: string }
> = {
  'very-easy': {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  easy: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
  },
  medium: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  hard: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  'very-hard': {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
} as const;

/**
 * Keyword status label mapping
 */
export const STATUS_LABELS: Record<KeywordStatus, string> = {
  tracking: 'Tracking',
  paused: 'Paused',
  opportunity: 'Opportunity',
  ignored: 'Ignored',
} as const;

/**
 * Keyword status color mapping
 */
export const STATUS_COLORS: Record<
  KeywordStatus,
  { bg: string; text: string; border: string }
> = {
  tracking: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  paused: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
  opportunity: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  ignored: {
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
  },
} as const;

/**
 * Difficulty score to level mapping (0-100 scale)
 */
export function difficultyScoreToLevel(score: number): DifficultyLevel {
  if (score < 20) return 'very-easy';
  if (score < 40) return 'easy';
  if (score < 60) return 'medium';
  if (score < 80) return 'hard';
  return 'very-hard';
}

/**
 * Convert CSV data to keyword import rows
 */
export function parseKeywordCSV(csvText: string): KeywordImportRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  // Assume first row is header, detect columns
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: KeywordImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: KeywordImportRow = { keyword: '' };

    header.forEach((col, idx) => {
      const value = values[idx] || '';
      switch (col) {
        case 'keyword':
        case 'keywords':
          row.keyword = value;
          break;
        case 'volume':
        case 'searchvolume':
          row.searchVolume = value;
          break;
        case 'cpc':
          row.cpc = value;
          break;
        case 'difficulty':
        case 'diff':
          row.difficulty = value;
          break;
        case 'intent':
          row.intent = value;
          break;
        case 'tags':
          row.tags = value;
          break;
        case 'url':
        case 'targeturl':
          row.targetUrl = value;
          break;
        case 'notes':
          row.notes = value;
          break;
      }
    });

    if (row.keyword) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Format search volume for display
 */
export function formatSearchVolume(volume?: number): string {
  if (volume === undefined || volume === null) return 'N/A';
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
  return volume.toString();
}

/**
 * Format CPC for display
 */
export function formatCPC(cpc?: number): string {
  if (cpc === undefined || cpc === null) return 'N/A';
  return `$${cpc.toFixed(2)}`;
}

/**
 * Get ranking indicator color based on position
 */
export function getRankColor(rank?: number): string {
  if (!rank) return 'text-gray-400';
  if (rank <= 3) return 'text-green-600 dark:text-green-400';
  if (rank <= 10) return 'text-emerald-600 dark:text-emerald-400';
  if (rank <= 20) return 'text-yellow-600 dark:text-yellow-400';
  if (rank <= 50) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Backlink Marketplace Types
 * Types for the backlink exchange marketplace feature
 */

/**
 * Available site in the marketplace
 */
export interface MarketplaceSite {
  id: string;
  domain: string;
  url: string;
  title: string;
  description: string | null;
  niche: string[];
  domain_authority: number;
  page_authority: number;
  spam_score: number;
  traffic: number | null;
  credits_required: number;
  quality_score: number;
  available: boolean;
  response_time: number | null; // in hours
  success_rate: number; // 0-100
  guidelines: string | null;
  categories: string[];
  language: string;
  region: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Status of an exchange request
 */
export type ExchangeRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/**
 * Exchange request between sites
 */
export interface ExchangeRequest {
  id: string;
  organization_id: string;
  product_id: string | null;
  article_id: string | null;
  // Source site info (user's site)
  source_url: string;
  source_domain_authority: number | null;
  // Target site info (marketplace site)
  marketplace_site_id: string;
  marketplace_site: {
    domain: string;
    title: string;
    url: string;
  };
  // Request details
  target_url: string; // URL to link to
  anchor_text: string | null;
  status: ExchangeRequestStatus;
  credits_used: number;
  // Dates
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  completed_at: string | null;
  // Notes
  notes: string | null;
  rejection_reason: string | null;
}

/**
 * Filters for marketplace sites
 */
export interface MarketplaceFilters {
  search: string;
  min_da: number | undefined;
  max_da: number | undefined;
  min_pa: number | undefined;
  max_pa: number | undefined;
  max_spam_score: number | undefined;
  min_quality_score: number | undefined;
  niches: string[];
  categories: string[];
  min_traffic: number | undefined;
  language: string;
  region: string;
  max_credits: number | undefined;
  sort: MarketplaceSort;
  order: 'asc' | 'desc';
}

/**
 * Sort options for marketplace
 */
export type MarketplaceSort =
  | 'domain_authority'
  | 'page_authority'
  | 'quality_score'
  | 'credits_required'
  | 'traffic'
  | 'success_rate'
  | 'response_time'
  | 'created_at';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Request form data
 */
export interface ExchangeRequestFormData {
  marketplace_site_id: string;
  article_id: string | null;
  target_url: string;
  anchor_text: string | null;
  notes: string | null;
}

/**
 * Approval panel item
 */
export interface ApprovalItem {
  id: string;
  request: ExchangeRequest;
  can_approve: boolean;
  can_reject: boolean;
  reason_required: boolean;
}

/**
 * Status labels and colors
 */
export const EXCHANGE_STATUS_LABELS: Record<ExchangeRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const EXCHANGE_STATUS_COLORS: Record<
  ExchangeRequestStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  approved: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  rejected: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  in_progress: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  completed: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  cancelled: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
};

/**
 * Quality score labels
 */
export const QUALITY_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

/**
 * Quality score color helpers
 */
export function getQualityScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 80) {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    };
  }
  if (score >= 60) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    };
  }
  if (score >= 40) {
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
  }
  return {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  };
}

/**
 * Domain authority score color helpers
 */
export function getDAScoreColor(da: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (da >= 60) {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    };
  }
  if (da >= 40) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
    };
  }
  if (da >= 20) {
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
  }
  return {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  };
}

/**
 * Spam score color helpers
 */
export function getSpamScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score <= 10) {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    };
  }
  if (score <= 30) {
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
  }
  return {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  };
}

/**
 * Format traffic numbers
 */
export function formatTraffic(traffic: number | null): string {
  if (traffic === null) return 'N/A';
  if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
  if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
  return traffic.toString();
}

/**
 * Common niches for filtering
 */
export const COMMON_NICHES = [
  'Technology',
  'Business',
  'Health',
  'Finance',
  'Education',
  'Lifestyle',
  'Travel',
  'Food',
  'Fashion',
  'Sports',
  'Entertainment',
  'Real Estate',
  'Marketing',
  'SEO',
  'SaaS',
  'E-commerce',
  'Crypto',
  'Gaming',
  'Home & Garden',
  'Automotive',
];

/**
 * Common languages
 */
export const COMMON_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
];

/**
 * Common regions
 */
export const COMMON_REGIONS = [
  { value: '', label: 'All Regions' },
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'eu', label: 'Europe' },
  { value: 'asia', label: 'Asia' },
  { value: 'latam', label: 'Latin America' },
];

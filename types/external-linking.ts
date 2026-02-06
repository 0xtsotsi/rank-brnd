/**
 * External Linking Types
 * Types for the external linking service
 */

/**
 * External link source from API
 */
export interface ExternalLinkSource {
  id: string;
  domain: string;
  name: string;
  url: string | null;
  description: string | null;
  category: ExternalLinkSourceCategory;
  status: ExternalLinkSourceStatus;
  domain_authority: number | null;
  page_authority: number | null;
  spam_score: number | null;
  trustworthiness_score: number | null;
  is_global: boolean;
  organization_id: string | null;
  topics: string[];
  language: string;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * External link source category
 */
export type ExternalLinkSourceCategory =
  | 'academic'
  | 'government'
  | 'industry'
  | 'news'
  | 'reference'
  | 'statistics'
  | 'health'
  | 'technology'
  | 'business'
  | 'other';

/**
 * External link source status
 */
export type ExternalLinkSourceStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'deprecated';

/**
 * External link opportunity from API
 */
export interface ExternalLinkOpportunity {
  id: string;
  organization_id: string;
  product_id: string | null;
  article_id: string | null;
  external_source_id: string | null;
  external_link_sources?: ExternalLinkSource | null;
  keyword: string | null;
  suggested_url: string | null;
  suggested_anchor_text: string | null;
  context_snippet: string | null;
  position_in_content: number | null;
  relevance_score: number | null;
  status: ExternalLinkOpportunityStatus;
  link_type: ExternalLinkType;
  notes: string | null;
  suggested_at: string;
  approved_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * External link opportunity status
 */
export type ExternalLinkOpportunityStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'applied';

/**
 * External link type
 */
export type ExternalLinkType = 'external' | 'citation' | 'reference';

/**
 * Generated opportunity with source details
 */
export interface GeneratedOpportunity {
  id: string;
  organization_id: string;
  product_id: string | null;
  article_id: string | null;
  external_source_id: string | null;
  source?: ExternalLinkSource;
  keyword: string | null;
  suggested_url: string | null;
  suggested_anchor_text: string | null;
  context_snippet: string | null;
  position_in_content: number | null;
  relevance_score: number | null;
  link_type: ExternalLinkType;
  status: ExternalLinkOpportunityStatus;
  suggested_at: string;
}

/**
 * Content analysis result
 */
export interface ContentAnalysis {
  keywords: string[];
  topics: string[];
  entities: string[];
  existingExternalLinks: Array<{
    url: string;
    anchorText: string;
    context: string;
  }>;
  suggestedLinkCount: number;
}

/**
 * Generate opportunities request
 */
export interface GenerateOpportunitiesRequest {
  organization_id: string;
  product_id?: string;
  article_id?: string;
  content: string;
  title?: string;
  keywords?: string[];
  min_relevance_score?: number;
  max_suggestions?: number;
  categories?: ExternalLinkSourceCategory[];
  link_type?: ExternalLinkType;
}

/**
 * Generate opportunities response
 */
export interface GenerateOpportunitiesResponse {
  opportunities: GeneratedOpportunity[];
  contentAnalysis: ContentAnalysis;
  savedToDatabase: boolean;
}

/**
 * Opportunities statistics
 */
export interface OpportunitiesStatistics {
  total_opportunities: number;
  pending_opportunities: number;
  approved_opportunities: number;
  applied_opportunities: number;
  rejected_opportunities: number;
  avg_relevance_score: number;
  by_link_type: Record<string, number>;
}

/**
 * Status labels and colors
 */
export const EXTERNAL_LINK_OPPORTUNITY_STATUS_LABELS: Record<
  ExternalLinkOpportunityStatus,
  string
> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  applied: 'Applied',
};

export const EXTERNAL_LINK_OPPORTUNITY_STATUS_COLORS: Record<
  ExternalLinkOpportunityStatus,
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
  applied: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
};

/**
 * Link type labels
 */
export const EXTERNAL_LINK_TYPE_LABELS: Record<ExternalLinkType, string> = {
  external: 'External Link',
  citation: 'Citation',
  reference: 'Reference',
};

/**
 * Category labels
 */
export const EXTERNAL_LINK_SOURCE_CATEGORY_LABELS: Record<
  ExternalLinkSourceCategory,
  string
> = {
  academic: 'Academic',
  government: 'Government',
  industry: 'Industry',
  news: 'News',
  reference: 'Reference',
  statistics: 'Statistics',
  health: 'Health',
  technology: 'Technology',
  business: 'Business',
  other: 'Other',
};

/**
 * Get relevance score color
 */
export function getRelevanceScoreColor(score: number): {
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

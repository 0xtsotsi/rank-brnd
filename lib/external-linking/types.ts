/**
 * External Linking Types
 *
 * Type definitions for the external linking service.
 */

/**
 * External link source from database
 */
export interface ExternalLinkSource {
  id: string;
  domain: string;
  name: string;
  url: string | null;
  description: string | null;
  category:
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
  status: 'active' | 'inactive' | 'pending' | 'deprecated';
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
 * External link opportunity from database
 */
export interface ExternalLinkOpportunity {
  id: string;
  organization_id: string;
  product_id: string | null;
  article_id: string | null;
  external_source_id: string | null;
  keyword: string | null;
  suggested_url: string | null;
  suggested_anchor_text: string | null;
  context_snippet: string | null;
  position_in_content: number | null;
  relevance_score: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  link_type: string;
  notes: string | null;
  suggested_at: string;
  approved_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Suggested external link with source details
 */
export interface SuggestedExternalLink {
  source: ExternalLinkSource;
  suggestedUrl: string;
  suggestedAnchorText: string;
  contextSnippet: string;
  positionInContent: number;
  relevanceScore: number;
  linkType: 'external' | 'citation' | 'reference';
  keywords: string[];
}

/**
 * Content analysis result for external linking
 */
export interface ContentAnalysisForExternalLinks {
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
 * External link generation options
 */
export interface ExternalLinkGenerationOptions {
  minRelevanceScore?: number;
  maxSuggestions?: number;
  categories?: Array<
    | 'academic'
    | 'government'
    | 'industry'
    | 'news'
    | 'reference'
    | 'statistics'
    | 'health'
    | 'technology'
    | 'business'
    | 'other'
  >;
  linkType?: 'external' | 'citation' | 'reference';
  excludeExistingLinks?: boolean;
  minDomainAuthority?: number;
  preferredSources?: string[]; // Source IDs to prioritize
}

/**
 * External link application result
 */
export interface ExternalLinkApplicationResult {
  success: boolean;
  updatedContent: string;
  linksApplied: number;
  opportunitiesUpdated: string[]; // IDs of opportunities marked as applied
  errors: Array<{
    opportunityId: string;
    error: string;
  }>;
}

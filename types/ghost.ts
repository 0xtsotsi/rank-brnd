/**
 * Ghost CMS Types
 *
 * Type definitions for Ghost Admin API entities and operations.
 * Based on Ghost Admin API v5.x specification.
 */

/**
 * Ghost API configuration required for authentication
 */
export interface GhostConfig {
  /** Ghost site URL (e.g., https://your-site.ghost.io) */
  url: string;
  /** Admin API key in format: {id}:{secret} */
  adminApiKey: string;
  /** API version (default: v5.0) */
  version?: string;
}

/**
 * Ghost Author entity
 */
export interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  email?: string;
  profile_image?: string | null;
  cover_image?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  accessibility?: string | null;
  status?: 'active' | 'inactive' | 'locked';
  meta_title?: string | null;
  meta_description?: string | null;
  tour?: string | null;
  last_seen?: string | null;
  created_at?: string;
  updated_at?: string;
  roles?: GhostRole[];
  url?: string;
}

/**
 * Ghost Role entity
 */
export interface GhostRole {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Ghost Tag entity
 */
export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  feature_image?: string | null;
  visibility?: 'public' | 'internal';
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  canonical_url?: string | null;
  accent_color?: string | null;
  created_at?: string;
  updated_at?: string;
  url?: string;
}

/**
 * Ghost Post status
 */
export type GhostPostStatus = 'draft' | 'published' | 'scheduled' | 'sent';

/**
 * Ghost Post visibility
 */
export type GhostPostVisibility = 'public' | 'members' | 'paid' | 'tiers';

/**
 * Ghost Post entity
 */
export interface GhostPost {
  id: string;
  uuid?: string;
  title: string;
  slug: string;
  html?: string | null;
  mobiledoc?: string | null;
  lexical?: string | null;
  comment_id?: string;
  plaintext?: string | null;
  feature_image?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
  featured?: boolean;
  status?: GhostPostStatus;
  visibility?: GhostPostVisibility;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
  custom_excerpt?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  custom_template?: string | null;
  canonical_url?: string | null;
  tags?: GhostTag[];
  authors?: GhostAuthor[];
  primary_author?: GhostAuthor;
  primary_tag?: GhostTag;
  url?: string;
  excerpt?: string;
  reading_time?: number;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  email_only?: boolean;
  email_subject?: string | null;
  frontmatter?: string | null;
}

/**
 * Input for creating/updating a post
 */
export interface GhostPostInput {
  title: string;
  slug?: string;
  /** HTML content */
  html?: string;
  /** Mobiledoc content (alternative to html) */
  mobiledoc?: string;
  /** Lexical content (alternative to html) */
  lexical?: string;
  status?: GhostPostStatus;
  visibility?: GhostPostVisibility;
  featured?: boolean;
  feature_image?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
  custom_excerpt?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  custom_template?: string | null;
  canonical_url?: string | null;
  /** Array of tag names, slugs, or objects */
  tags?: (string | { name?: string; slug?: string; id?: string })[];
  /** Array of author emails, slugs, or objects */
  authors?: (string | { email?: string; slug?: string; id?: string })[];
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  email_only?: boolean;
  email_subject?: string | null;
  /** ISO 8601 date string for scheduled publishing */
  published_at?: string | null;
}

/**
 * Input for creating/updating a tag
 */
export interface GhostTagInput {
  name: string;
  slug?: string;
  description?: string | null;
  feature_image?: string | null;
  visibility?: 'public' | 'internal';
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  canonical_url?: string | null;
  accent_color?: string | null;
}

/**
 * Ghost API pagination parameters
 */
export interface GhostPagination {
  page?: number;
  limit?: number;
  order?: string;
  filter?: string;
  fields?: string;
  include?: string;
}

/**
 * Ghost API paginated response metadata
 */
export interface GhostMeta {
  pagination: {
    page: number;
    limit: number;
    pages: number;
    total: number;
    next: number | null;
    prev: number | null;
  };
}

/**
 * Ghost API response wrapper for posts
 */
export interface GhostPostsResponse {
  posts: GhostPost[];
  meta?: GhostMeta;
}

/**
 * Ghost API response wrapper for a single post
 */
export interface GhostSinglePostResponse {
  posts: [GhostPost];
}

/**
 * Ghost API response wrapper for tags
 */
export interface GhostTagsResponse {
  tags: GhostTag[];
  meta?: GhostMeta;
}

/**
 * Ghost API response wrapper for a single tag
 */
export interface GhostSingleTagResponse {
  tags: [GhostTag];
}

/**
 * Ghost API response wrapper for authors
 */
export interface GhostAuthorsResponse {
  users: GhostAuthor[];
  meta?: GhostMeta;
}

/**
 * Ghost API response wrapper for a single author
 */
export interface GhostSingleAuthorResponse {
  users: [GhostAuthor];
}

/**
 * Ghost API error response
 */
export interface GhostErrorResponse {
  errors: Array<{
    message: string;
    context?: string | null;
    type?: string;
    details?: unknown;
    property?: string | null;
    help?: string | null;
    code?: string | null;
    id?: string;
    ghostErrorCode?: string | null;
  }>;
}

/**
 * Result type for Ghost operations
 */
export type GhostResult<T> =
  | { success: true; data: T }
  | { success: false; error: GhostError };

/**
 * Ghost error type
 */
export interface GhostError {
  message: string;
  type?: string;
  code?: string;
  context?: string;
  details?: unknown;
}

/**
 * Ghost image upload response
 */
export interface GhostImageUpload {
  images: Array<{
    url: string;
    ref: string | null;
  }>;
}
